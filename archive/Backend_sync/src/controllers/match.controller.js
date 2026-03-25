import { getPool } from "../config/db.js";
import redis from "../config/redis.js";
import { parseTranscript } from "../services/voice.service.js";
import {
    resetSession,
    updateCVItems,
    incrementCVItem,
    updateAudioItems,
    getSession,
    setExpectedTotal,
    setAudioTotal,
    setFounderMode,
    setLastProduct,
    addAlert,
    clearAlerts
} from "../services/match.service.js";
import { sendWhatsApp } from "../services/notification.service.js";
import { incrementMissedDemand } from "../services/redis.service.js";
import { getProductDetails, deductStock } from "../services/inventory.service.js";
import { runCVSnapshot } from "../services/cv.service.js";

// ──────────────────────────────────────────────────────────────────────────────
// Match Controller — Vision vs Voice Synchronization
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Health check for DB + Redis.
 */
const verifyConnections = async () => {
    const pool = getPool();
    if (!pool) throw new Error("Database pool not initialized");

    const sqlOk = await pool.request().query("SELECT 1 as connection_test");

    // Only ping if truly enabled, otherwise return status string
    let redisStatus = "Disabled (Fallback Mode)";
    if (redis) {
        try {
            const pong = await redis.ping();
            redisStatus = pong === "PONG" ? "Healthy (Azure Cloud)" : "Degraded";
        } catch (e) {
            redisStatus = `Unreachable (${e.message})`;
        }
    }

    return { sql: !!sqlOk, redis: redisStatus };
};

/**
 * Handles incoming Audio data (Voice Transcript).
 */
export const handleAudio = async (req, res) => {
    try {
        const { transcript } = req.body;
        if (!transcript) return res.status(400).json({ error: "Transcript required" });

        const raw = transcript.toLowerCase();
        const session = getSession();
        console.log(`[Audio] Heard: "${raw}" | FounderMode: ${session.founder_mode}`);

        // SCENE: RESET / "NEXT" CUSTOMER
        if (raw.includes("next") || raw.includes("agla")) {
            resetSession();
            return res.json({ status: "reset done", message: "Transaction cleared for next customer" });
        }

        // SCENE: FOUNDER KIT TRIGGER (HINDI)
        if (raw.includes("duk") || raw.includes("khol") || raw.includes("naya")) {
            console.log(`[Audio] 🎯 Founder flow triggered! (Keywords: ${raw})`);
            setFounderMode(true);
            console.log(`[Audio] -> Mode: Planning Active`);
            return res.json({ status: "founder_mode_active", message: "Budget?" });
        }

        // SCENE: BUDGET RESPONSE -> WHATSAPP LIST (Wait for digits or amount)
        if (getSession().founder_mode && (raw.match(/\d+/) || raw.includes("hazar") || raw.includes("thousand"))) {
            const budget = raw.match(/\d+/) ? raw.match(/\d+/)[0] : "50,000";
            console.log(`[Audio] 💰 Budget detected: ${budget}. Generating Founder Kit Suggestion...`);

            // Build suggestion list (Validated String Template)
            const list = `🚀 FOUNDER KIT: SUGGESTED INVENTORY
---------------------------------
Budget: ₹${budget}
Market Target: South Region

Essential Setup:
- Maggi Masala Pack x 50
- Parle-G Biscuit x 100
- Lays Classic (Blue) x 20
- Pepsi 500ml x 10
- Fortune Sunflower Oil x 5

All items above have high market volume in your area. Good luck!`;

            console.log(`[Audio] 📤 Calling Twilio for founder kit...`);
            await sendWhatsApp(list);

            setFounderMode(false); // Mode exit
            return res.json({ status: "inventory_sent", message: "Check WhatsApp for Setup List" });
        }

        // SCENE: MISSED DEMAND ("Nahi hai")
        if (raw.includes("nahi") || raw.includes("nahin")) {
            if (session.last_product) {
                await incrementMissedDemand(session.last_product);
                return res.json({ status: "missed_log", item: session.last_product, message: "Unmet demand logged" });
            }
        }

        // NORMAL BILLING FLOW
        const parsed = parseTranscript(transcript);
        updateAudioItems(parsed.items);
        if (parsed.total) setAudioTotal(parsed.total);
        if (parsed.items.length > 0) setLastProduct(parsed.items[parsed.items.length - 1].product);

        // SCENE: PROACTIVE BUCKET ANALYSIS (Cross-sell)
        // Check if CV items already have Lays + Maggi
        const cvProducts = Object.keys(session.cv_items);
        if (cvProducts.includes("lays") && cvProducts.includes("maggi")) {
            const proactiveMsg = "Suggestion: Buy Pepsi as well (Basket Analysis Result)";
            addAlert({ type: "proactive", message: proactiveMsg });
            await sendWhatsApp("Bucket Analysis Alert: Customer has Lays & Maggi. Suggest Pepsi bundle.");
        }

        const stats = await verifyConnections();
        let finalResponse = {
            message: `Heard: "${transcript}"`,
            transcript,
            parsed,
            session: getSession(),
            stats
        };

        // SCENE: TOTAL TRIGGER (Vision vs Voice)
        if (raw.includes("total")) {
            await handleCompute({ body: { items: session.cv_items } }, {
                json: (data) => { finalResponse.computed = data; },
                status: () => ({ json: (data) => { } })
            });

            await handleCompare(req, {
                json: (data) => { finalResponse.comparison = data; },
                status: () => ({ json: (data) => { } })
            });
        }

        res.json(finalResponse);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Handles real-time CV item increments (Direct detection signal).
 */
export const handleDetect = async (req, res) => {
    try {
        const { product, qty = 1 } = req.body;
        if (!product) return res.status(400).json({ error: "Product required" });

        // Update state
        incrementCVItem(product, qty);

        // Auto-recompute total
        const session = getSession();
        await handleCompute({ body: { items: session.cv_items } }, {
            json: (data) => { },
            status: () => ({ json: (data) => { } })
        });

        res.json({ message: "Detection processed", product, current: getSession().cv_items });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Handles incoming Computer Vision (CV) data (Real-time detections).
 */
export const handleCV = async (req, res) => {
    try {
        const { items } = req.body; // Map of { productNorm: qty }
        if (!items) return res.status(400).json({ error: "No CV items provided" });

        const status = await verifyConnections();

        // Update global CV state in the matching service
        const updated = updateCVItems(items);

        res.json({
            message: "CV state synchronized",
            status,
            synced_items: updated.current
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Calculates current totals from DB pricing.
 */
export const handleCompute = async (req, res) => {
    try {
        const { items } = req.body; // { lays: 2, coke: 1 }
        if (!items) return res.status(400).json({ error: "No items provided for computation" });

        // State accumulation
        let total = 0;
        const processedItems = [];
        const inventoryAlerts = [];

        // Logic: Iterate over vision items and fetch prices from catalog
        const entries = Object.entries(items);
        for (const [product, qty] of entries) {
            const details = await deductStock(product); // Decrement stock & check threshold
            if (details) {
                total += details.current_stock > -1 ? (details.selling_price || 0) * qty : 0;
                processedItems.push({
                    product: details.product,
                    price: details.selling_price,
                    qty
                });

                if (details.low_stock) {
                    inventoryAlerts.push({
                        type: "low_stock",
                        product: details.product,
                        stock: details.current_stock,
                        suggestion: details.reorder_suggestion
                    });
                }
            }
        }

        // Update global transaction state
        setExpectedTotal(total);

        res.json({
            expected_total: total,
            items: processedItems,
            alerts: inventoryAlerts
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Compares CV (expected) vs Audio (received) totals.
 * Detects under-billing or over-billing discrepancies.
 */
export const handleCompare = async (req, res) => {
    try {
        const session = getSession();
        const expected = session.expected_total;
        const received = session.audio_total;

        // Final Comparison Logic
        // Using Math.abs for float precision safety
        const diff = Math.abs((expected || 0) - (received || 0));
        const isMatch = diff < 0.01;

        if (isMatch) {
            return res.json({
                status: "ok",
                message: "Vision and Voice match perfectly."
            });
        }

        return res.json({
            status: "mismatch",
            expected: expected || 0,
            received: received || 0,
            difference: diff,
            message: diff > 0 ? "Potential mismatch detected." : "Equal totals."
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Erases current match session.
 */
export const handleReset = async (req, res) => {
    try {
        const status = await verifyConnections();
        const info = resetSession();
        res.json({ message: "Reset endpoint ready", status, info });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Logs missed market demand and triggers alerts on high frequency.
 */
export const handleMissedDemand = async (req, res) => {
    try {
        const { product } = req.body;
        if (!product) return res.status(400).json({ error: "Product name required" });

        const status = await verifyConnections();
        const count = await incrementMissedDemand(product);

        const response = {
            message: "Demand logged successfully",
            status,
            product,
            current_demand: count
        };

        // 🎯 WOW MOMENT: Proactive intelligence alert
        if (count > 3) {
            response.alert = true;
            response.message = "🔥🔥 High unmet demand detected for this item";
        }

        res.json(response);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Fetches the current global session state for UI synchronization.
 */
export const handleGetSession = async (req, res) => {
    try {
        const session = getSession();
        res.json(session);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Manual Trigger for Computer Vision Snapshot (Demo Mode).
 */
export const handleCameraSnapshot = async (req, res) => {
    try {
        const snapshot = await runCVSnapshot();
        updateCVItems(snapshot);

        // Auto-run compute for the new snapshot
        await handleCompute({ body: { items: snapshot } }, {
            json: (data) => { },
            status: () => ({ json: (data) => { } })
        });

        res.json({ status: "Snapshot logic executed", items: snapshot });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const handleTestWhatsapp = async (req, res) => {
    try {
        console.log("[Test] Direct WhatsApp Request Received.");
        const result = await sendWhatsApp("TEST MESSAGE FROM BACKEND: Twilio Pipeline Verified.");
        res.json({ message: "Diagnostic sent", result });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export default {
    handleAudio,
    handleCV,
    handleDetect,
    handleCompute,
    handleCompare,
    handleReset,
    handleMissedDemand,
    handleGetSession,
    handleCameraSnapshot,
    handleTestWhatsapp
};
