import axios from "axios";
import twilio from "twilio";
import { getReadPool } from "../config/db.js";

const MessagingResponse = twilio.twiml.MessagingResponse;

// ─── WhatsApp-Specific Insight Prompt ─────────────────────────────────────────
// Different from the web app prompt:
// 1. Language mirrors the user's question (auto-detect, no fixed 3-language format)
// 2. Plain text output — NO Markdown headers (WhatsApp renders them as raw text)
// 3. Emoji bullets for structure instead of ** or ###
const buildWhatsAppInsightPrompt = (question, data) => `
You are an expert Business Analyst. The user asked you a question about their sales data.
A SQL query was executed and returned the data below.

Your job: Write a short, clear, conversational insight that directly answers the question.

CRITICAL RULES:
1. Detect the language of the user's question and reply ONLY in that language.
   - If the question is in English → reply only in English.
   - If the question is in Hindi (or Hinglish, e.g. "South mein kitna profit hua?") → reply only in Hindi.
   - If the question is in Kannada → reply only in Kannada.
   - Match the exact style and language of the user — do NOT switch languages.
2. Format for WhatsApp — NO Markdown headers (no ###, no **bold**). 
   Use plain text with emoji bullets (📊 🔹 ✅) for structure.
3. Keep it under 4 bullet points. Be concise — this is a chat message, not a report.
4. Do NOT mention "SQL", "JSON", or "database" in your response.
5. Do NOT hallucinate. Only use the data provided.
6. Start directly with the insight — no greeting, no "Sure! Here is your insight:".
7. If formatting currency or money, ALWAYS use the Indian Rupee symbol (₹). NEVER use the Dollar sign ($).
8. If showing a quantity, count, or total number of units, DO NOT use any currency symbol.

User's Question: "${question}"

Data from the database:
${JSON.stringify(data, null, 2)}

Write the insight now:
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Strips any residual Markdown that Mistral might sneak in,
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

// ─── Controller ───────────────────────────────────────────────────────────────

export const handleWhatsAppWebhook = async (req, res) => {
    const incomingMessage = (req.body?.Body || "").trim();
    const senderNumber = req.body?.From || "unknown";

    console.log(`[WhatsApp] Message from ${senderNumber}: "${incomingMessage}"`);

    // Build a TwiML reply helper
    const sendReply = (msg) => {
        const twiml = new MessagingResponse();
        twiml.message(msg);
        res.type("text/xml");
        res.send(twiml.toString());
    };

    if (!incomingMessage) {
        return sendReply(
            "👋 Hi! I'm DataTalk AI.\n\nAsk me anything about your sales data — in English, Hindi, or any language you prefer.\n\nExample: \"What is the total profit this month?\""
        );
    }

    try {
        // ── Step 1: Generate SQL via AI Core ────────────────────────────────────
        let sqlQuery;
        try {
            const aiResponse = await axios.post(
                "http://localhost:8000/generate-sql",
                { question: incomingMessage },
                { timeout: 15000 }
            );
            sqlQuery = aiResponse.data?.sql;
        } catch (err) {
            console.error("[WhatsApp] SQL generation failed:", err.message);
            return sendReply(
                "⚠️ Sorry, I couldn't understand your question. Could you rephrase it?\n\nExample: \"Show me top 5 products by revenue\""
            );
        }

        if (!sqlQuery) {
            return sendReply("⚠️ I wasn't able to generate a query from your question. Please try again.");
        }

        // ── Step 2: Execute SQL on the database ──────────────────────────────────
        let dataRows = [];
        try {
            const pool = getReadPool();
            const request = pool.request();
            request.timeout = 5000;
            const result = await request.query(sqlQuery);
            dataRows = result.recordset || [];
        } catch (dbErr) {
            console.error("[WhatsApp] DB query failed:", dbErr.message);
            return sendReply("⚠️ I ran into a database issue. Please try a different question.");
        }

        if (dataRows.length === 0) {
            return sendReply("📭 No data found for your query. Try asking about a different metric or time period.");
        }

        // ── Step 3: Generate WhatsApp-formatted insight via AI Core ──────────────
        let insightText = "";
        try {
            const insightPrompt = buildWhatsAppInsightPrompt(incomingMessage, dataRows.slice(0, 30));

            const insightResponse = await axios.post(
                "http://localhost:8000/generate-insight",
                {
                    question: incomingMessage,
                    data: dataRows.slice(0, 30),
                    // Pass the custom WhatsApp prompt override flag
                    customPrompt: insightPrompt
                },
                { timeout: 60000 }
            );
            insightText = insightResponse.data?.insight || "";
        } catch (aiErr) {
            console.error("[WhatsApp] Insight generation failed:", aiErr.message);
            // Fallback: send raw data summary
            insightText = `📊 Found ${dataRows.length} result(s) for your query.`;
        }

        const cleanedInsight = stripMarkdown(insightText);

        return sendReply(cleanedInsight || "📊 Query executed but no insight could be generated.");

    } catch (err) {
        console.error("[WhatsApp] Unhandled error:", err.message);
        return sendReply("❌ Something went wrong on our end. Please try again in a moment.");
    }
};
