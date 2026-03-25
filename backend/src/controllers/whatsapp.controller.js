import axios from "axios";
import twilio from "twilio";
import { getPool } from "../config/db.js";

const MessagingResponse = twilio.twiml.MessagingResponse;

// ─── WhatsApp-Specific Insight Prompt ─────────────────────────────────────────
const buildWhatsAppInsightPrompt = (question, data) => `
You are an expert Business Analyst. The user asked you a question about their sales data.
A SQL query was executed and returned the data below.

Your job: Write a short, clear, conversational insight that directly answers the question.

CRITICAL RULES:
1. Detect the language of the user's question and reply ONLY in that language.
2. Format for WhatsApp — NO Markdown headers (no ###, no **bold**). 
   Use plain text with bullet points for structure.
3. Keep it under 4 bullet points. Be concise.
4. Do NOT mention "SQL", "JSON", or "database" in your response.
5. Do NOT hallucinate. Only use the data provided.
6. Start directly with the insight — no greeting.
7. If formatting currency or money, ALWAYS use "INR". NEVER use the Dollar sign ($).
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

// ─── The Brain Router ───────────────────────────────────────────────────────────────

// ─── The Brain Router ───────────────────────────────────────────────────────────────

import { logTransaction } from "../services/sales.service.js";
import { findBestSupplier } from "../services/supplier.service.js";
import SessionService from "../services/session.service.js";
import { getStrictNormalizedName } from "../utils/normalization.js";
import https from "https";

// 🏆 PRODUCTION LEVEL UP: Azure AI Search is the powerhouse service needed for 
// enterprise-grade fuzzy/semantic search across thousands of SKUs.
// For now, we use an in-memory Levenshtein buffer for our local product list.

const getLevenshteinDistance = (a, b) => {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) matrix[i][j] = matrix[i - 1][j - 1];
            else matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
        }
    }
    return matrix[b.length][a.length];
};

const findClosestProduct = async (wrongName) => {
    try {
        const pool = getPool();
        const res = await pool.request().query("SELECT product, product_normalized FROM inventory");
        const items = res.recordset;
        let bestMatch = null;
        let minDistance = 100;
        const normIn = getStrictNormalizedName(wrongName);

        for (const item of items) {
            const dist = getLevenshteinDistance(normIn, item.product_normalized);
            if (dist < minDistance) {
                minDistance = dist;
                bestMatch = item;
            }
        }
        // If distance is reasonable (e.g. up to 60% error for short names), it's a match
        return (minDistance <= Math.ceil(normIn.length * 0.6)) ? bestMatch : null;
    } catch (e) { return null; }
};

// ─── Standardized Output Templates (No Emojis for Debug) ─────────────────
const FORMATTER = {
    SALE_SUCCESS: (qty, item, profit) => `SUCCESS: Sold ${qty} units of ${item}. Profit: INR ${profit}`,
    STOCK_REPORT: (product, stock, threshold) => `PRODUCT: ${product}. Stock: ${stock} units. Status: ${stock < threshold ? "WARNING: Low" : "Healthy"}`,
    SUPPLIER_REPORT: (supplier, product, price, credit, creditDays, delivery, link) =>
        `Suppliers for ${product}: 1. ${supplier}. Price: INR ${price}/unit. Credit: ${credit ? "Yes" : "No"} (${creditDays} days). Delivery: ${delivery} days. Link: ${link}`
};

const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

export const handleWhatsapp = async (req, res) => {
    const incomingRaw = (req.body?.Body || "").trim();
    const sender = req.body?.From || "unknown";
    const numMedia = parseInt(req.body?.NumMedia || "0", 10);

    console.log(`\n--- [VERSION] Production 2.0 (XML/SYNC) ---`);
    console.log(`--- [NEW WHATSAPP MESSAGE] ---`);
    console.log(`[DATA] From: ${sender}`);
    console.log(`[DATA] Body: "${incomingRaw}"`);

    const sendReply = async (msg) => {
        try {
            console.log(`[STEP 5/FINAL] Sending TwiML XML Reply...`);
            const twiml = new MessagingResponse();
            twiml.message(msg);

            // Log the output for the user's terminal
            console.log(`[RAW TWIML]: ${twiml.toString()}`);

            res.type("text/xml").status(200).send(twiml.toString());
            console.log(`[XML SUCCESS]: Replied synchronously to ${sender}`);
        } catch (e) {
            console.error(`[XML FAILURE]:`, e.message);
            // Emergency fallback to REST API if XML response fails (usually server issue)
            try {
                await twilioClient.messages.create({
                    from: process.env.TWILIO_WHATSAPP_NUMBER,
                    to: sender,
                    body: msg
                });
            } catch (err) {
                console.error("Emergency REST Fallback also failed.");
            }
            res.sendStatus(200);
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
                    await sendReply("⚠️ AI Ears Offline. Please send text.");
                    return;
                }
            }
        }

        if (!messageText) {
            await sendReply("👋 Hi! I'm DataTalk AI. How can I help your business today?");
            return;
        }

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
            await sendReply("⚠️ Failed to understand. Please try again.");
            return;
        }

        // 4. Intent Routing & State Machine
        let { intent, product: rawProduct, qty } = extraction;

        // Normalize Product immediately (fixes "magie" -> "maggi")
        // PHONETIC_MAP entries (conceptual, as it's in normalization.js)
        // "magi": "maggi",
        // "magie": "maggi",
        // "maggie": "maggi",
        // "mgie": "maggi",
        // "oil": "fortunesunfloweroil1l",
        let product = rawProduct ? getStrictNormalizedName(rawProduct) : null;

        if (session) {
            console.log(`[STEP 4] Overriding intent with ACTIVE session: ${session.intent}`);
            intent = session.intent;

            // 🧠 SLOT FILLER ENRICHMENT
            // If AI failed to extract (common for single-word replies like "milk" or "10")
            // we check the raw message ourselves.
            if (!product && !qty) {
                const manualNorm = getStrictNormalizedName(messageText);
                const manualMatch = await findClosestProduct(manualNorm); // This checks DB + Fuzzy
                if (manualMatch) {
                    product = manualMatch.product_normalized;
                    console.log(`[STEP 4] Manual Enrichment (Product): "${messageText}" -> "${product}"`);
                } else if (!isNaN(parseInt(messageText))) {
                    qty = parseInt(messageText);
                    console.log(`[STEP 4] Manual Enrichment (Qty): "${messageText}" -> ${qty}`);
                }
            }

            product = product || (session.product ? getStrictNormalizedName(session.product) : null);
            qty = qty || (isNaN(parseInt(messageText)) ? null : parseInt(messageText));
            console.log(`[STEP 4] New Combined State: Product=${product}, Qty=${qty}`);
        }

        console.log(`[STEP 4] Routing to handler: [${intent}]`);

        // 🧠 FUZZY CORRECTION ENGINE (Self-Healing)
        if (product && intent !== "GUIDED" && intent !== "BUSINESS_ANALYTICS") {
            const pool = getPool();
            const check = await pool.request().input("p", product).query("SELECT product FROM inventory WHERE product_normalized = @p");
            if (check.recordset.length === 0) {
                console.log(`[STEP 4.5] "${product}" NOT in DB. Attempting Fuzzy Match...`);
                const match = await findClosestProduct(product);
                if (match) {
                    console.log(`[STEP 4.5] Corrected Typos: "${product}" -> "${match.product}"`);
                    product = match.product_normalized;
                    // Optional: We can add a "Did you mean?" note here, but for Kirana stores, 
                    // auto-correction is often preferred for speed.
                } else {
                    await sendReply(`❌ Sorry, I couldn't find a product similar to "${rawProduct}".`);
                    return;
                }
            }
        }

        // Logic based on production intents
        switch (intent) {
            case "TRANSACTION": {
                if (!product) {
                    await SessionService.setSession(sender, { intent: "TRANSACTION", product: null });
                    await sendReply("📦 What product did you sell?");
                    return;
                }
                if (!qty) {
                    await SessionService.setSession(sender, { intent: "TRANSACTION", product });
                    await sendReply(`🔢 How many units of ${product} did you sell?`);
                    return;
                }

                try {
                    const result = await logTransaction(product, qty);
                    await SessionService.clearSession(sender);
                    await sendReply(FORMATTER.SALE_SUCCESS(qty, product, result.profit));
                    return;
                } catch (e) {
                    await sendReply(`❌ Transaction Failed: ${e.message}`);
                    return;
                }
            }

            case "INVENTORY_QUERY": {
                // Feature: List ALL if "all" or "list" is detected
                if (messageText.toLowerCase().match(/all|list|show/)) {
                    try {
                        const pool = getPool();
                        const result = await pool.request().query("SELECT product, current_stock FROM inventory");
                        const rows = result.recordset || [];
                        let listMsg = "📋 *Inventory Summary*:\n\n";
                        rows.forEach(r => {
                            listMsg += `🔹 ${r.product}: ${r.current_stock} units\n`;
                        });
                        await sendReply(listMsg);
                        return;
                    } catch (e) {
                        await sendReply("⚠️ Error fetching inventory list.");
                        return;
                    }
                }

                if (!product) {
                    await sendReply("🔍 Which product stock do you want to check?");
                    return;
                }
                try {
                    const pool = getPool();
                    const result = await pool.request()
                        .input("p", product)
                        .query("SELECT product, current_stock, reorder_threshold FROM inventory WHERE product_normalized = @p");

                    if (result.recordset.length === 0) {
                        await sendReply(`❌ Product "${product}" not found.`);
                        return;
                    }
                    const item = result.recordset[0];
                    await sendReply(FORMATTER.STOCK_REPORT(item.product, item.current_stock, item.reorder_threshold));
                    return;
                } catch (e) {
                    await sendReply("⚠️ Database issue. Try again.");
                    return;
                }
            }

            case "ORDER": {
                if (!product) {
                    await SessionService.setSession(sender, { intent: "ORDER", product: null });
                    await sendReply("📦 What product do you need to restock?");
                    return;
                }
                if (!qty) {
                    await SessionService.setSession(sender, { intent: "ORDER", product });
                    await sendReply(`🔢 How many units of ${product} do you need?`);
                    return;
                }

                try {
                    const result = await findBestSupplier(product, qty);
                    const s = result.primarySupplier;
                    await SessionService.clearSession(sender);
                    await sendReply(FORMATTER.SUPPLIER_REPORT(s.supplier_name, s.product, s.wholesale_price, s.credit_days > 0, s.credit_days, s.delivery_days, result.link));
                    return;
                } catch (e) {
                    await sendReply(`❌ Order Failed: ${e.message}`);
                    return;
                }
            }

            case "BUSINESS_ANALYTICS": {
                try {
                    const aiSql = await axios.post("http://localhost:8000/generate-sql", { question: messageText });
                    const sql = aiSql.data.sql;
                    const pool = getPool();
                    const result = await pool.request().query(sql);
                    const rows = result.recordset || [];

                    if (rows.length === 0) {
                        await sendReply("📭 No data found for that period.");
                        return;
                    }

                    const insight = await axios.post("http://localhost:8000/generate-insight", { question: messageText, data: rows });
                    await sendReply(stripMarkdown(insight.data.insight));
                    return;
                } catch (e) {
                    await sendReply("⚠️ Analytics engine busy. Try simpler questions.");
                    return;
                }
            }

            case "GUIDED":
            default:
                await SessionService.clearSession(sender);
                await sendReply("Hi! I am DataTalk. Log sales (Voice/Text), check stock, or ask for reports.");
                return;
        }

    } catch (err) {
        console.error("[WhatsApp] CRITICAL ERROR:", err.message);
        await sendReply("❌ Something went wrong. Please try again later.");
    }
};

