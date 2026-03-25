import axios from "axios";
import { processTransaction } from "../services/transaction.service.js";
import { getInventory } from "../services/inventory.service.js";
import { getPool } from "../config/db.js";

// Session processing guard
let processing = false;

// Helpers to invoke AI-Core exactly like nlQuery.controller
async function handleAnalyticsQuery(question) {
    try {
        const sqlRes = await axios.post("http://localhost:8000/generate-sql", { question });
        const sqlData = sqlRes.data;
        if (!sqlData.sql) return "Sorry, I couldn't generate the analytics query.";

        // Run SQL locally
        const pool = getPool();
        const dbResult = await pool.request().query(sqlData.sql);
        const rows = dbResult.recordset || [];

        // Generate Insight
        const insightRes = await axios.post("http://localhost:8000/generate-insight", {
            question,
            data: rows.slice(0, 30)
        });
        const insightData = insightRes.data;
        return insightData.insight || "Data fetched, but failed to generate insight.";
    } catch (err) {
        console.error("[VOICE-ANALYTICS] Error:", err.message);
        return "Analytics failed due to internal error.";
    }
}

export const handleVoiceCommand = async (req, res) => {
    // ── Session Guard ──
    if (processing) {
        return res.json({ status: "busy", message: "Processing previous command." });
    }

    const { transcript, image } = req.body;
    if (!transcript) return res.status(400).json({ error: "Transcript required." });

    processing = true;

    try {
        console.log(`\n[VOICE] Transcript: "${transcript}"`);

        // 1. Send to AI Core for Intent Classification
        const extractRes = await axios.post("http://localhost:8000/extract", { message: transcript });

        let parsed = extractRes.data.data;

        if (!parsed || !parsed.intent) {
            console.warn("[VOICE] AI Core returned no intent. Falling back to GUIDED.");
            parsed = { intent: "GUIDED", query: transcript };
        }

        console.log(`[AI CORE] Intent: ${parsed.intent}`);
        console.log(`[AI CORE] Extracted:`, parsed);

        const raw = transcript.toLowerCase();

        // 2. Route based on Intent
        switch (parsed.intent) {
            case "TRANSACTION":
                // ONLY trigger billing if "total" is spoken
                if (raw.includes("total") || raw.includes("bill") || raw.includes("hisab")) {
                    console.log("[ROUTER] Routed to TRANSACTION pipeline");

                    let finalImage = image || null;

                    // ── Handle IP Webcam Network Ingestion ──
                    if (req.body.ipCameraUrl) {
                        try {
                            const url = new URL('/shot.jpg', req.body.ipCameraUrl).href;
                            console.log(`[ROUTER] Fetching network frame from: ${url}`);
                            const snapshotRes = await axios.get(url, { responseType: 'arraybuffer', timeout: 5000 });
                            const b64 = Buffer.from(snapshotRes.data, 'binary').toString('base64');
                            finalImage = `data:image/jpeg;base64,${b64}`;
                            console.log(`[ROUTER] Network frame captured successfully (${(b64.length / 1024).toFixed(1)}KB)`);
                        } catch (err) {
                            console.error(`[ROUTER] Failed to capture from IP Camera:`, err.message);
                        }
                    }

                    const pipelineResult = await processTransaction(transcript, finalImage);
                    // Return the pipeline result directly so the frontend Sync Center handles it
                    return res.json(pipelineResult);
                } else {
                    console.log("[ROUTER] TRANSACTION intent detected, but 'total' keyword missing. Accumulating only.");
                    // Return tracking state for UI
                    return res.json({
                        status: "accumulating",
                        parsed: { items: parsed.product ? { [parsed.product]: parsed.qty || 1 } : {} },
                        message: "Adding item..."
                    });
                }

            case "INVENTORY_QUERY":
                console.log("[ROUTER] Routed to INVENTORY_QUERY");
                if (!parsed.product) {
                    return res.json({
                        type: "ai_response",
                        category: "inventory",
                        message: "Kiska stock check karna hai?",
                        timestamp: Date.now()
                    });
                }
                const inv = await getInventory(parsed.product);
                if (inv) {
                    return res.json({
                        type: "ai_response",
                        category: "inventory",
                        message: `${inv.product} ka ${inv.current_stock} bacha hai.`,
                        timestamp: Date.now()
                    });
                } else {
                    return res.json({
                        type: "ai_response",
                        category: "inventory",
                        message: `Ye product inventory mein nahi mila.`,
                        timestamp: Date.now()
                    });
                }

            case "BUSINESS_ANALYTICS":
                console.log("[ROUTER] Routed to BUSINESS_ANALYTICS");
                const insight = await handleAnalyticsQuery(parsed.query || transcript);
                return res.json({
                    type: "ai_response",
                    category: "analytics",
                    message: insight,
                    timestamp: Date.now()
                });

            case "ORDER":
                console.log("[ROUTER] Routed to ORDER");
                if (parsed.product) {
                    return res.json({
                        type: "ai_response",
                        category: "order",
                        message: `${parsed.product} ka order place karne ka request note kar liya gaya hai.`,
                        timestamp: Date.now()
                    });
                } else {
                    return res.json({
                        type: "ai_response",
                        category: "order",
                        message: `Order place karne ke liye product ka naam bataiye.`,
                        timestamp: Date.now()
                    });
                }

            case "GUIDED":
            default:
                console.log("[ROUTER] Routed to GUIDED/Fallback");
                return res.json({
                    type: "ai_response",
                    category: "guided",
                    message: "Boliye, mai kaise madad karu aapki?",
                    timestamp: Date.now()
                });
        }
    } catch (err) {
        console.error("[VOICE] Orchestration Error:", err.message);
        return res.json({
            type: "ai_response",
            category: "guided",
            message: "Samajh nahi aaya, dubara boliye.",
            timestamp: Date.now()
        });
    } finally {
        processing = false;
    }
};

export default { handleVoiceCommand };
