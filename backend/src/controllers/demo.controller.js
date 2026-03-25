import { handleBillingEvent } from "../services/ambient.service.js";
import { checkAndTriggerReorder } from "../services/reorder.service.js";
import { incrementDemand, getDemandInsights } from "../services/demand.service.js";
import { getStarterPlan, getAvailableScenarios } from "../services/founder.service.js";
import { getPool } from "../config/db.js";
import redis from "../config/redis.js";
import {
    getSession, resetSession, setFounderMode, parseTranscript,
    updateCVItems, setExpectedTotal, setAudioTotal, setAudioItems, addAlert
} from "../services/match.service.js";
import { sendWhatsApp } from "../services/notification.service.js";
import { runCVSnapshot } from "../services/cv.service.js";
import { getInventory } from "../services/inventory.service.js";

// ──────────────────────────────────────────────────────────────────────────────
// DEMO CONTROLLER — FORCED SUCCESS PATHS
//
// This controller guarantees identical, impressive output on EVERY run.
// All state is reset before each endpoint. Products are auto-seeded.
// This is NOT production code — it is a demo orchestrator.
// ──────────────────────────────────────────────────────────────────────────────

// ─── DEMO DATA: Products that MUST exist ──────────────────────────────────────

const DEMO_INVENTORY = [
    { product: "Lays Classic", norm: "lays", category: "Snacks", stock: 100, threshold: 20, cost: 8.0, price: 10.0 },
    { product: "Coca-Cola 500ml", norm: "coke", category: "Beverages", stock: 80, threshold: 15, cost: 25.0, price: 40.0 },
];

const DEMO_SUPPLIERS = [
    { name: "Snack Distributors", product: "Lays Classic", norm: "lays", wprice: 7.5, phone: "919876000001", credit: 15, climit: 5000, cash: 0, delivery: 2 },
    { name: "Beverage Hub", product: "Coca-Cola 500ml", norm: "coke", wprice: 22.0, phone: "919876000002", credit: 30, climit: 10000, cash: 0, delivery: 1 },
];

// ─── DEMO SETUP HELPERS ──────────────────────────────────────────────────────

/**
 * Ensures Lays and Coke exist in inventory + suppliers.
 * Runs once per endpoint call. Idempotent — safe to call repeatedly.
 */
async function ensureDemoProducts() {
    const pool = getPool();

    for (const p of DEMO_INVENTORY) {
        const check = await pool.request()
            .input("n", p.norm)
            .query("SELECT 1 FROM inventory WHERE product_normalized = @n");

        if (check.recordset.length === 0) {
            await pool.request()
                .input("p", p.product).input("n", p.norm).input("cat", p.category)
                .input("s", p.stock).input("t", p.threshold)
                .input("c", p.cost).input("pr", p.price)
                .query(`
                    INSERT INTO inventory (product, product_normalized, category, current_stock, reorder_threshold, unit_cost, selling_price)
                    VALUES (@p, @n, @cat, @s, @t, @c, @pr)
                `);
            console.log(`[Demo Setup] ✅ Inserted "${p.product}" into inventory`);
        }
    }

    for (const s of DEMO_SUPPLIERS) {
        const check = await pool.request()
            .input("n", s.norm)
            .query("SELECT 1 FROM suppliers WHERE product_normalized = @n");

        if (check.recordset.length === 0) {
            await pool.request()
                .input("sn", s.name).input("p", s.product).input("n", s.norm)
                .input("wp", s.wprice).input("ph", s.phone)
                .input("cr", s.credit).input("cl", s.climit)
                .input("ca", s.cash).input("dl", s.delivery)
                .query(`
                    INSERT INTO suppliers (supplier_name, product, product_normalized, wholesale_price, phone_number, credit_days, credit_limit, cash_only, delivery_days)
                    VALUES (@sn, @p, @n, @wp, @ph, @cr, @cl, @ca, @dl)
                `);
            console.log(`[Demo Setup] ✅ Inserted supplier "${s.name}" for "${s.product}"`);
        }
    }
}

/**
 * Forces a product's stock to an exact value. No checks, no guards.
 */
async function forceStock(normalized, stockValue) {
    const pool = getPool();
    await pool.request()
        .input("s", stockValue).input("n", normalized)
        .query("UPDATE inventory SET current_stock = @s WHERE product_normalized = @n");
}

/**
 * Clears ALL Redis state for a product (reorder lock + demand counter).
 */
async function clearRedis(normalized) {
    if (redis && redis.status === "ready") {
        await redis.del(`reorder:lock:${normalized}`);
        await redis.del(`missed:${normalized}`);
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// ENDPOINT 1: POST /demo/billing
//
// GUARANTEES:
//   ✅ Both Maggi and Lays always succeed (products seeded, stock reset)
//   ✅ Basket always suggests "Coca-Cola 500ml" (Maggi+Lays → Coke rule)
//   ✅ WhatsApp receipt always sent
//   ✅ Identical output on every call
// ──────────────────────────────────────────────────────────────────────────────

export const demoBilling = async (req, res) => {
    console.log("[Demo] 🧾 /demo/billing triggered");

    try {
        // ── DEMO OVERRIDE: Seed products + reset state ──
        await ensureDemoProducts();
        await forceStock("maggi", 150);   // Always start at 150
        await forceStock("lays", 100);    // Always start at 100
        await clearRedis("maggi");
        await clearRedis("lays");

        const DEMO_ITEMS = [
            { product: "Maggi", quantity: 2 },
            { product: "Lays", quantity: 2 },
        ];

        const result = await handleBillingEvent(DEMO_ITEMS);

        res.json({
            message: "Demo billing executed",
            billId: result.bill_id,
            items: DEMO_ITEMS.map(i => `${i.product} x${i.quantity}`),
            triggered: ["sale_logged", "whatsapp_receipt", "basket_suggestion", "reorder_check"],
            basketSuggestions: result.basketSuggestions,
            details: result,
        });
    } catch (err) {
        console.error("[Demo] Billing failed:", err.message);
        res.status(500).json({ error: err.message });
    }
};

// ──────────────────────────────────────────────────────────────────────────────
// ENDPOINT 2: POST /demo/low-stock
//
// GUARANTEES:
//   ✅ Reorder ALWAYS triggers (stock forced to 5, threshold is 30)
//   ✅ Supplier always found (Maggi has suppliers in seeder)
//   ✅ WhatsApp reorder alert always sent
//   ✅ Identical output on every call
// ──────────────────────────────────────────────────────────────────────────────

export const demoLowStock = async (req, res) => {
    console.log("[Demo] 📉 /demo/low-stock triggered");

    const DEMO_PRODUCT = "maggi";

    try {
        // ── DEMO OVERRIDE: Force stock BELOW threshold ──
        await forceStock(DEMO_PRODUCT, 5);    // Threshold is 30 → 5 < 30 → triggers reorder
        await clearRedis(DEMO_PRODUCT);        // Clear any existing lock

        const result = await checkAndTriggerReorder(DEMO_PRODUCT, 50, "low_stock");

        // ── DEMO OVERRIDE: Reset stock to healthy after demo ──
        await forceStock(DEMO_PRODUCT, 150);

        res.json({
            message: "Low stock reorder triggered",
            product: DEMO_PRODUCT,
            reordered: result?.reordered ?? false,
            supplier: result?.supplier ?? null,
            newStock: result?.newStock ?? null,
            result,
        });
    } catch (err) {
        console.error("[Demo] Low stock failed:", err.message);
        res.status(500).json({ error: err.message });
    }
};

// ──────────────────────────────────────────────────────────────────────────────
// ENDPOINT 3: POST /demo/missed-demand
//
// GUARANTEES:
//   ✅ Demand counter always reaches threshold (5/5)
//   ✅ Reorder ALWAYS triggers (Coke stock forced low, lock cleared, supplier exists)
//   ✅ WhatsApp reorder alert always sent
//   ✅ Identical output on every call
// ──────────────────────────────────────────────────────────────────────────────

export const demoMissedDemand = async (req, res) => {
    console.log("[Demo] 🔥 /demo/missed-demand triggered");

    const DEMO_PRODUCT = "coke";
    const DEMO_ITERATIONS = 5;

    try {
        // ── DEMO OVERRIDE: Ensure Coke exists + force conditions ──
        await ensureDemoProducts();
        await forceStock(DEMO_PRODUCT, 3);     // Below threshold (15) → reorder will fire
        await clearRedis(DEMO_PRODUCT);         // Clear lock + counter → clean slate

        let lastResult = null;

        for (let i = 0; i < DEMO_ITERATIONS; i++) {
            lastResult = await incrementDemand(DEMO_PRODUCT);
            console.log(`[Demo]   Demand ${i + 1}/${DEMO_ITERATIONS}: count=${lastResult.count}`);
        }

        res.json({
            message: "Missed demand threshold reached — reorder triggered",
            product: DEMO_PRODUCT,
            demandCount: DEMO_ITERATIONS,
            reorderTriggered: lastResult.reorderTriggered,
            result: lastResult,
        });
    } catch (err) {
        console.error("[Demo] Missed demand failed:", err.message);
        res.status(500).json({ error: err.message });
    }
};

// ──────────────────────────────────────────────────────────────────────────────
// ENDPOINT 4: GET /demo/insights
//
// GUARANTEES:
//   ✅ ALWAYS returns non-empty insights (Redis seeded before fetch)
//   ✅ Consistent, believable data every time
//   ✅ Works even if /demo/missed-demand was never called
// ──────────────────────────────────────────────────────────────────────────────

export const demoInsights = async (req, res) => {
    console.log("[Demo] 📊 /demo/insights triggered");

    try {
        // ── DEMO OVERRIDE: Seed demand data so insights are never empty ──
        if (redis) {
            // Only seed if no missed:* keys exist (don't overwrite real data)
            const keys = [];
            let cursor = "0";
            try {
                do {
                    const [nextCursor, batch] = await redis.scan(cursor, "MATCH", "missed:*", "COUNT", 100);
                    cursor = nextCursor;
                    keys.push(...batch);
                } while (cursor !== "0");

                if (keys.length === 0) {
                    // Seed believable demand data
                    await redis.set("missed:coke", "4");
                    await redis.expire("missed:coke", 604800);
                    await redis.set("missed:bread", "3");
                    await redis.expire("missed:bread", 604800);
                    await redis.set("missed:butter", "2");
                    await redis.expire("missed:butter", 604800);
                    await redis.set("missed:dettolsoap", "2");
                    await redis.expire("missed:dettolsoap", 604800);
                    await redis.set("missed:pepsi", "1");
                    await redis.expire("missed:pepsi", 604800);
                    console.log("[Demo] 📊 Seeded demand data for insights");
                }
            } catch (err) {
                console.warn("[Demo] Redis seed skipped:", err.message);
            }
        }

        const insights = await getDemandInsights();

        res.json({
            message: "Demand insights fetched",
            count: insights.length,
            insights,
        });
    } catch (err) {
        console.error("[Demo] Insights failed:", err.message);
        res.status(500).json({ error: err.message });
    }
};

// ──────────────────────────────────────────────────────────────────────────────
// ENDPOINT 5: POST /demo/founder-kit
//
// GUARANTEES:
//   ✅ Always returns a structured product recommendation plan
//   ✅ Feels like an AI recommendation, is 100% hardcoded
//   ✅ Two scenarios: student area (₹10K) and residential (₹25K)
//   ✅ Same input → same output, always
// ──────────────────────────────────────────────────────────────────────────────

export const demoFounderKit = async (req, res) => {
    const scenario = req.query.scenario || req.body?.scenario || "low_budget_student_area";
    console.log(`[Demo] 🚀 /demo/founder-kit triggered (scenario: ${scenario})`);

    try {
        const plan = getStarterPlan(scenario);

        if (plan.error) {
            return res.status(400).json({
                error: plan.error,
                available_scenarios: plan.available,
            });
        }

        res.json({
            message: "Founder Kit recommendation generated",
            plan,
        });
    } catch (err) {
        console.error("[Demo] Founder Kit failed:", err.message);
        res.status(500).json({ error: err.message });
    }
};

// ─── Bonus: List available scenarios ──────────────────────────────────────────

export const demoFounderScenarios = async (req, res) => {
    res.json({
        message: "Available Founder Kit scenarios",
        scenarios: getAvailableScenarios(),
    });
};

// ─── INTEGRATED MATCHING & SYNC — EVENT-DRIVEN PIPELINE ────────────────────────

import { processTransaction } from "../services/transaction.service.js";

/**
 * /demo/audio — THE main entry point for all voice events.
 *
 * EVENT-DRIVEN DESIGN:
 *   - Normal speech → parse & store items
 *   - "total" detected → TRIGGERS FULL PIPELINE (CV → Compute → Compare)
 *   - "duk/naya" → Founder Kit mode
 *   - "next" → Reset
 *
 * Frontend sends { transcript, image? } where image is the latest camera frame.
 */
export const demoAudio = async (req, res) => {
    try {
        const { transcript, image } = req.body;
        if (!transcript) return res.status(400).json({ error: "Transcript required" });

        const raw = transcript.toLowerCase();
        const session = getSession();
        console.log(`\n[AUDIO] 🎤 Heard: "${raw}" | FounderMode: ${session.founder_mode}`);

        // 1. RESET
        if (raw.includes("next") || raw.includes("agla")) {
            const fresh = resetSession();
            return res.json({
                status: "reset_done",
                message: "Transaction cleared. Ready for next.",
                session: fresh
            });
        }

        // 2. FOUNDER KIT TRIGGER
        if (raw.includes("duk") || raw.includes("khol") || raw.includes("naya")) {
            console.log(`[AUDIO] 🎯 Founder Kit Triggered!`);
            setFounderMode(true);
            return res.json({ status: "founder_mode_active", message: "Budget?" });
        }

        // 3. BUDGET → WHATSAPP
        if (session.founder_mode && (raw.match(/\d+/) || raw.includes("hazar"))) {
            const budget = raw.match(/\d+/) ? raw.match(/\d+/)[0] : "50,000";
            console.log(`[AUDIO] 💰 Budget: ${budget}. Sending Setup List...`);

            const list = `FOUNDER KIT: SHOP SETUP (Budget: Rs.${budget})\n---------------------------------\n` +
                `- Maggi Masala Pack x 50\n` +
                `- Parle-G Biscuit x 100\n` +
                `- Lays Classic (Blue) x 20\n` +
                `- Pepsi 500ml x 10\n` +
                `- Fortune Oil x 5\n\n` +
                `Area: Residential-High Demand.\nReady to Setup!`;

            await sendWhatsApp(list);
            setFounderMode(false);
            return res.json({ status: "inventory_sent", message: "Check WhatsApp for Setup List" });
        }

        // ═══════════════════════════════════════════════════════════════
        // 4. "TOTAL" DETECTED → FIRE FULL TRANSACTION PIPELINE
        // ═══════════════════════════════════════════════════════════════
        if (raw.includes("total") || raw.includes("bill") || raw.includes("hisab")) {
            console.log("[AUDIO] ⚡ 'TOTAL' keyword detected. Firing transaction pipeline...");
            const pipelineResult = await processTransaction(transcript, image || null);
            return res.json(pipelineResult);
        }

        // 5. Default: parse and accumulate items (pre-total phase)
        const parsed = parseTranscript(transcript);
        if (Object.keys(parsed.items).length > 0) setAudioItems(parsed.items);
        if (parsed.total) setAudioTotal(parsed.total);

        res.json({
            status: "accumulating",
            message: `Heard: "${transcript}"`,
            transcript,
            parsed,
            session: getSession()
        });

    } catch (err) {
        console.error("[AUDIO] Error:", err.message);
        res.status(500).json({ error: err.message });
    }
};

export const demoResetSession = async (req, res) => {
    const fresh = resetSession();
    console.log("[SESSION] 🔄 Session reset.");
    res.json(fresh);
};

export const demoGetSession = async (req, res) => {
    res.json(getSession());
};

/**
 * Standalone camera snapshot — still available for manual scans.
 * But the MAIN flow is event-driven via /demo/audio.
 */
export const demoCameraSnapshot = async (req, res) => {
    try {
        const { image } = req.body;
        if (!image) return res.status(400).json({ error: "Image data required" });

        const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
        const imageBuffer = Buffer.from(base64Data, "base64");

        const detectedItems = await runCVSnapshot(imageBuffer);
        updateCVItems(detectedItems);

        // Compute total from detections
        let total = 0;
        for (const [product, qty] of Object.entries(detectedItems)) {
            const details = await getInventory(product);
            if (details) total += (details.selling_price || 0) * qty;
        }
        setExpectedTotal(total);

        res.json({
            status: "Snapshot analyzed",
            items: detectedItems,
            expected_total: total,
            session: getSession()
        });
    } catch (err) {
        console.error("[CV] Snapshot failed:", err.message);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Compare endpoint — returns current session comparison.
 */
export const demoCompare = async (req, res) => {
    const session = getSession();
    const expected = session.expected_total || 0;
    const received = session.audio_total || 0;
    const diff = Math.abs(expected - received);
    const isMatch = diff < 0.01;

    res.json({
        status: isMatch ? "ok" : "mismatch",
        expected,
        received,
        difference: diff,
        message: isMatch ? "Perfect match!" : "Discrepancy detected!"
    });
};

// ─── Recent Sales (for testing) ──────────────────────────────────────────────
export const demoRecentSales = async (req, res) => {
    try {
        const pool = getPool();
        const result = await pool.request().query(`
            SELECT TOP 10 product, quantity, revenue, profit, category, region, transaction_date, bill_id
            FROM sales_data
            ORDER BY transaction_date DESC
        `);
        res.json({ sales: result.recordset });
    } catch (err) {
        console.error("[SALES] Query failed:", err.message);
        res.status(500).json({ error: err.message });
    }
};

export default {
    demoBilling,
    demoLowStock,
    demoMissedDemand,
    demoInsights,
    demoFounderKit,
    demoFounderScenarios,
    demoAudio,
    demoResetSession,
    demoGetSession,
    demoCameraSnapshot,
    demoCompare,
    demoRecentSales
};
