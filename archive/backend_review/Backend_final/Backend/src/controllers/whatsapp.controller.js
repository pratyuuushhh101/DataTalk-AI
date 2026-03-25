import axios from "axios";
import twilio from "twilio";
import { getPool } from "../config/db.js";
import { logTransaction } from "../services/sales.service.js";
import { findBestSupplier } from "../services/supplier.service.js";
import SessionService from "../services/session.service.js";
import https from "https";

const MessagingResponse = twilio.twiml.MessagingResponse;

// ─── WhatsApp-Specific Insight Prompt ─────────────────────────────────────────
const buildWhatsAppInsightPrompt = (question, data) => `
You are an expert Business Analyst. The user asked you a question about their sales data.
A SQL query was executed and returned the data below.

Your job: Write a short, clear, conversational insight that directly answers the question.

CRITICAL RULES:
1. Detect the language of the user's question and reply ONLY in that language.
2. Format for WhatsApp — NO Markdown headers (no ###, no **bold**). 
   Use plain text with emoji bullets (📊 🔹 ✅) for structure.
3. Keep it under 4 bullet points. Be concise — this is a chat message, not a report.
4. Do NOT mention "SQL", "JSON", or "database" in your response.
5. Do NOT hallucinate. Only use the data provided.
6. Start directly with the insight — no greeting.
7. If formatting currency or money, ALWAYS use the Indian Rupee symbol (₹). NEVER use the Dollar sign ($).
8. If showing a quantity, DO NOT use any currency symbol.

User's Question: "${question}"

Data from the database:
${JSON.stringify(data, null, 2)}

Write the insight now:
`;

/**
 * Strips any residual Markdown that the AI might sneak in,
 * keeping the reply clean for WhatsApp.
 */
function stripMarkdown(text) {
    return text
        .replace(/###?\s?/g, "")     // Remove ### headers
        .replace(/\*\*(.*?)\*\*/g, "$1") // Remove **bold**
        .replace(/\*(.*?)\*/g, "$1")     // Remove *italic*
        .replace(/`{1,3}[^`]*`{1,3}/g, "") // Remove code blocks
        .trim();
}

// ─── Standardized Output Templates ───────────────────────────────────────────
const FORMATTER = {
    SALE_SUCCESS: (qty, item, profit) => `✅ Sold ${qty} units of ${item}\n💰 Profit: ₹${profit}`,
    STOCK_REPORT: (product, stock, threshold) => `📦 ${product}\n🔹 Stock: ${stock} units\n🔹 Status: ${stock < threshold ? "⚠️ Low" : "✅ Healthy"}`,
    SUPPLIER_REPORT: (supplier, product, price, credit, creditDays, delivery, link) =>
        `📦 Suppliers for ${product}:\n\n1️⃣ ${supplier}\n💰 Price: ₹${price}/unit\n💳 Credit: ${credit ? "Yes" : "No"} (${creditDays} days)\n🚚 Delivery: ${delivery} days\n📞 Contact: ${supplier}\n👉 Order Now: ${link}`
};

export const handleWhatsapp = async (req, res) => {
    const incomingRaw = (req.body?.Body || "").trim();
    const sender = req.body?.From || "unknown";
    const numMedia = parseInt(req.body?.NumMedia || "0", 10);

    console.log(`\n--- [VERSION] Production 2.0 (Review Folder) ---`);
    console.log(`--- [NEW WHATSAPP MESSAGE] ---`);
    console.log(`[DATA] From: ${sender}`);
    console.log(`[DATA] Body: "${incomingRaw}"`);
    console.log(`[DATA] Media: ${numMedia}`);

    const sendReply = (msg) => {
        try {
            console.log(`[STEP 5/FINAL] Preparing TwiML Reply...`);
            const twiml = new MessagingResponse();
            twiml.message(msg);
            const rawTwiml = twiml.toString();
            console.log(`[RAW TWIML OUTPUT]:\n${rawTwiml}`);
            res.type("text/xml").status(200).send(rawTwiml);
        } catch (e) {
            console.error(`[FATAL REPLY ERROR]:`, e.message);
            res.status(500).send("Reply generation failed");
        }
    };

    try {
        let messageText = incomingRaw;

        // 1. Audio Pipeline
        if (numMedia > 0) {
            console.log(`[STEP 1] Audio received. Processing...`);
            const mediaUrl = req.body.MediaUrl0;
            const contentType = req.body.MediaContentType0;

            if (contentType?.startsWith('audio/')) {
                try {
                    const httpsAgent = new https.Agent({ rejectUnauthorized: false });
                    const audioResponse = await axios.get(mediaUrl, {
                        responseType: 'arraybuffer',
                        httpsAgent,
                        auth: {
                            username: process.env.TWILIO_ACCOUNT_SID,
                            password: process.env.TWILIO_AUTH_TOKEN
                        }
                    });
                    const audioBuffer = Buffer.from(audioResponse.data, 'binary');
                    const transcribeRes = await axios.post("http://localhost:8000/transcribe", {
                        audioBase64: audioBuffer.toString('base64')
                    }, { timeout: 30000 });
                    messageText = transcribeRes.data.transcript || "";
                    console.log(`[STEP 1] Transcribed: "${messageText}"`);
                } catch (e) {
                    console.error("[WhatsApp] Voice failed:", e.message);
                    return sendReply("⚠️ AI Ears Offline. Please send text.");
                }
            }
        }

        if (!messageText) return sendReply("👋 Hi! I'm DataTalk AI. How can I help your business today?");

        // 2. Session Context (Slot Filling)
        console.log(`[STEP 2] Checking session state for ${sender}...`);
        let session = await SessionService.getSession(sender);
        if (session) console.log(`[STEP 2] Active Session: [${session.intent}] Product=[${session.product}]`);

        // 3. AI Intent Extraction
        console.log(`[STEP 3] Calling AI Extractor for: "${messageText}"`);
        let extraction;
        try {
            const extractRes = await axios.post("http://localhost:8000/extract", { message: messageText }, { timeout: 15000 });
            extraction = extractRes.data.data;
            console.log(`[STEP 3] AI Result: Intent=[${extraction.intent}] Product=[${extraction.product}] Qty=[${extraction.qty}]`);
        } catch (e) {
            console.error("[WhatsApp] Extraction error:", e.message);
            return sendReply("⚠️ Failed to understand. Please try again.");
        }

        // 4. Intent Routing & State Machine
        let { intent, product, qty } = extraction;

        if (session) {
            console.log(`[STEP 4] Overriding intent with ACTIVE session: ${session.intent}`);
            intent = session.intent;
            product = product || session.product;
            qty = qty || (isNaN(parseInt(messageText)) ? null : parseInt(messageText));
            console.log(`[STEP 4] New Combined State: Product=${product}, Qty=${qty}`);
        }

        console.log(`[STEP 4] Routing to handler: [${intent}]`);

        // Logic based on production intents
        switch (intent) {
            case "TRANSACTION": {
                if (!product) {
                    await SessionService.setSession(sender, { intent: "TRANSACTION", product: null });
                    return sendReply("📦 What product did you sell?");
                }
                if (!qty) {
                    await SessionService.setSession(sender, { intent: "TRANSACTION", product });
                    return sendReply(`🔢 How many units of ${product} did you sell?`);
                }

                try {
                    const result = await logTransaction(product, qty);
                    await SessionService.clearSession(sender);
                    return sendReply(FORMATTER.SALE_SUCCESS(qty, product, result.profit));
                } catch (e) {
                    return sendReply(`❌ Transaction Failed: ${e.message}`);
                }
            }

            case "INVENTORY_QUERY": {
                if (!product) return sendReply("🔍 Which product stock do you want to check?");
                try {
                    const pool = getPool();
                    const result = await pool.request()
                        .input("p", product)
                        .query("SELECT product, current_stock, reorder_threshold FROM inventory WHERE product_normalized = @p");

                    if (result.recordset.length === 0) return sendReply(`❌ Product "${product}" not found.`);
                    const item = result.recordset[0];
                    return sendReply(FORMATTER.STOCK_REPORT(item.product, item.current_stock, item.reorder_threshold));
                } catch (e) {
                    return sendReply("⚠️ Database issue. Try again.");
                }
            }

            case "ORDER": {
                if (!product) {
                    await SessionService.setSession(sender, { intent: "ORDER", product: null });
                    return sendReply("📦 What product do you need to restock?");
                }
                if (!qty) {
                    await SessionService.setSession(sender, { intent: "ORDER", product });
                    return sendReply(`🔢 How many units of ${product} do you need?`);
                }

                try {
                    const result = await findBestSupplier(product, qty);
                    const s = result.primarySupplier;
                    await SessionService.clearSession(sender);
                    return sendReply(FORMATTER.SUPPLIER_REPORT(s.supplier_name, s.product, s.wholesale_price, s.credit_days > 0, s.credit_days, s.delivery_days, result.link));
                } catch (e) {
                    return sendReply(`❌ Order Failed: ${e.message}`);
                }
            }

            case "BUSINESS_ANALYTICS": {
                try {
                    const aiSql = await axios.post("http://localhost:8000/generate-sql", { question: messageText });
                    const sql = aiSql.data.sql;
                    const pool = getPool();
                    const result = await pool.request().query(sql);
                    const rows = result.recordset || [];

                    if (rows.length === 0) return sendReply("📭 No data found for that period.");

                    const insight = await axios.post("http://localhost:8000/generate-insight", { question: messageText, data: rows });
                    return sendReply(stripMarkdown(insight.data.insight));
                } catch (e) {
                    return sendReply("⚠️ Analytics engine busy. Try simpler questions.");
                }
            }

            case "GUIDED":
            default:
                await SessionService.clearSession(sender);
                return sendReply("👋 Hi! I am DataTalk. Log sales (Voice/Text), check stock, or ask for reports like 'Profit last week'.");
        }

    } catch (err) {
        console.error("[CRITICAL WHATSAPP ERROR]:", err.message);
        return sendReply("❌ Internal Error. Please try again.");
    }
};
