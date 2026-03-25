import { logTransaction, getItemsByBillId } from "./sales.service.js";
import { incrementDemand } from "./demand.service.js";
import { checkAndTriggerReorder } from "./reorder.service.js";
import { suggestItems } from "./basket.service.js";
import { sendWhatsApp } from "./notification.service.js";
import { getStrictNormalizedName } from "../utils/normalization.js";
import crypto from "crypto";

// ─── Ambient Orchestration Service ────────────────────────────────────────────
// Central coordinator for demo flows.
// RULES:
//   ✅ Delegates to existing services ONLY
//   ✅ Uses reorder.service for stock-check + reorder
//   ✅ Uses basket.service for deterministic suggestions
//   ✅ Uses notification.service for WhatsApp
//   ❌ No raw SQL (except via sales.service)
//   ❌ No AI-Core calls
//   ❌ No direct Twilio instantiation
//   ❌ No Redis operations
//   ❌ No inline business rules
// ──────────────────────────────────────────────────────────────────────────────

// ─── 1. handleBillingEvent(items) ─────────────────────────────────────────────
// items: [{ product: "milk", quantity: 2 }, ...]
// Triggers basket analysis ONCE per bill_id (not per item).
export const handleBillingEvent = async (items) => {
    if (!items || items.length === 0) {
        throw new Error("Billing event requires at least one item.");
    }

    const bill_id = `BILL-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
    console.log(`[Ambient] 🧾 New Billing Event: ${bill_id} (${items.length} items)`);

    const results = [];

    // ── Phase 1: Log each transaction ──
    for (const item of items) {
        const normalizedProduct = getStrictNormalizedName(item.product);

        try {
            const txResult = await logTransaction({
                product: normalizedProduct,
                quantity: item.quantity,
                bill_id,
            });

            results.push({
                product: item.product,
                status: "success",
                profit: txResult.profit,
                new_stock: txResult.new_stock,
            });
            console.log(`[Ambient]   ✅ ${item.product} x${item.quantity} logged`);

        } catch (err) {
            results.push({ product: item.product, status: "failed", error: err.message });
            console.error(`[Ambient]   ❌ ${item.product} failed: ${err.message}`);
        }
    }

    // ── Phase 2: WhatsApp sale confirmation ──
    const successCount = results.filter(r => r.status === "success").length;
    const totalProfit = results.reduce((sum, r) => sum + (r.profit || 0), 0);
    const itemsSummary = results
        .filter(r => r.status === "success")
        .map(r => `• ${r.product}`)
        .join("\n");

    await sendWhatsApp(
        `🧾 *Sale Recorded*\n\n` +
        `Bill: ${bill_id}\n` +
        `Items: ${successCount}/${items.length}\n` +
        `${itemsSummary}\n` +
        `Total Profit: INR ${totalProfit.toFixed(2)}`
    );

    // ── Phase 3: Check stock + auto-reorder (per product) ──
    for (const item of items) {
        const normalizedProduct = getStrictNormalizedName(item.product);
        await checkAndTriggerReorder(normalizedProduct);
    }

    // ── Phase 4: Basket analysis — ONCE per bill_id ──
    const basketResult = await runBasketAnalysis(bill_id);

    return { bill_id, results, basketSuggestions: basketResult.suggestions };
};

// ─── 2. handleMissedDemand(product) ───────────────────────────────────────────
// Pure delegation to demand.service.
export const handleMissedDemand = async (product) => {
    console.log(`[Ambient] Missed demand registered for: "${product}"`);
    return await incrementDemand(product);
};

// ─── 3. runBasketAnalysis(billId) ─────────────────────────────────────────────
// Fetches items from DB by bill_id, runs basket.service rules, sends WhatsApp.
// Called ONCE per bill — no per-item triggers, no race conditions.
async function runBasketAnalysis(billId) {
    try {
        // Step 1: Fetch items from sales_data by bill_id
        const billItems = await getItemsByBillId(billId);
        console.log(`[Ambient] Basket analysis for ${billId}: ${billItems.length} items`);

        if (billItems.length === 0) {
            console.log(`[Ambient] No items found for ${billId}. Skipping basket analysis.`);
            return { billId, suggestions: [] };
        }

        // Step 2: Run deterministic rule engine
        const { suggestions } = suggestItems(billItems);
        console.log(`[Ambient] Basket result for ${billId}: [${suggestions.join(", ") || "none"}]`);

        // Step 3: Send WhatsApp ONLY if suggestions exist
        if (suggestions.length > 0) {
            const purchasedNames = billItems.map(i => i.product).join(", ");
            const suggestedNames = suggestions.join(", ");

            await sendWhatsApp(
                `💡 *Basket Suggestion*\n\n` +
                `Bill: ${billId}\n` +
                `Customers who bought ${purchasedNames} also bought ${suggestedNames}\n\n` +
                `Suggest these to increase bill value!`
            );

            console.log(`[Ambient] Basket suggestion sent for ${billId}`);
        }

        return { billId, suggestions };
    } catch (err) {
        console.error(`[Ambient] Basket analysis failed for ${billId}:`, err.message);
        return { billId, suggestions: [] };
    }
}

export default {
    handleBillingEvent,
    handleMissedDemand,
};
