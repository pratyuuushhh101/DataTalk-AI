import { getInventory, updateInventory } from "./inventory.service.js";
import { findBestSupplier } from "./supplier.service.js";
import { sendWhatsApp } from "./notification.service.js";
import { getStrictNormalizedName } from "../utils/normalization.js";
import redis from "../config/redis.js";

// ─── Reorder Service ──────────────────────────────────────────────────────────
// Single source of truth for ALL automatic reorder logic.
// Checks stock → Redis lock → supplier selection → inventory restock → WhatsApp.
//
// RULES:
//   ✅ Uses inventory.service for reads + writes
//   ✅ Uses supplier.service for supplier selection
//   ✅ Uses notification.service for WhatsApp
//   ✅ Redis lock to prevent duplicate reorders
//   ❌ No raw SQL
//   ❌ No direct Twilio instantiation
// ──────────────────────────────────────────────────────────────────────────────

const REORDER_LOCK_PREFIX = "reorder:lock:";
const REORDER_LOCK_TTL = 600; // 10 minutes — DO NOT delete, let it expire

/**
 * Checks if a reorder lock exists for a product.
 * @returns {Promise<boolean>} true if locked (reorder already in progress)
 */
async function isReorderLocked(productNormalized) {
    try {
        if (redis && redis.status === "ready") {
            const existing = await redis.get(`${REORDER_LOCK_PREFIX}${productNormalized}`);
            return existing !== null;
        }
    } catch (e) {
        console.warn(`[Reorder] Redis lock check failed:`, e.message);
    }
    return false; // If Redis is down, allow reorder (fail-open)
}

/**
 * Acquires a reorder lock (TTL = 10 min, auto-expires, never manually deleted).
 */
async function acquireReorderLock(productNormalized) {
    try {
        if (redis && redis.status === "ready") {
            await redis.setex(`${REORDER_LOCK_PREFIX}${productNormalized}`, REORDER_LOCK_TTL, "locked");
            console.log(`[Reorder] 🔒 Lock acquired for "${productNormalized}" (TTL: ${REORDER_LOCK_TTL}s)`);
        }
    } catch (e) {
        console.warn(`[Reorder] Redis lock acquire failed:`, e.message);
    }
}

/**
 * Checks inventory levels and triggers an automatic reorder if stock is low.
 *
 * Flow:
 *   1. Normalize product
 *   2. Fetch inventory → if healthy, return early
 *   3. Check Redis lock → if locked, skip (duplicate prevention)
 *   4. Acquire lock (10 min TTL)
 *   5. Find best supplier
 *   6. Update inventory (+qty)
 *   7. Send WhatsApp notification
 *
 * @param {string} product - Raw or normalized product name
 * @param {number} qty - Quantity to reorder (default: 50)
 * @param {string} source - Trigger source: "low_stock" | "missed_demand" | "manual"
 * @returns {Promise<{ reordered: boolean, product?: string, supplier?: string, newStock?: number } | null>}
 */
export const checkAndTriggerReorder = async (product, qty = 50, source = "low_stock") => {
    const normalized = getStrictNormalizedName(product);

    try {
        // ── Step 1: Fetch inventory ──
        const inv = await getInventory(product);

        if (!inv) {
            console.log(`[Reorder] "${product}" not found in inventory. Skipping.`);
            return null;
        }

        // ── Step 2: Stock healthy? ──
        if (inv.current_stock >= inv.reorder_threshold) {
            console.log(`[Reorder] ✅ Stock healthy: ${inv.product} (${inv.current_stock}/${inv.reorder_threshold})`);
            return { reordered: false, product: inv.product };
        }

        console.log(`[Reorder] ⚠️ Low stock: ${inv.product} (${inv.current_stock}/${inv.reorder_threshold})`);

        // ── Step 3: Redis lock check ──
        if (await isReorderLocked(normalized)) {
            console.log(`[Reorder] 🔒 SKIPPED "${inv.product}" — reorder lock active (duplicate prevention)`);
            return { reordered: false, product: inv.product, reason: "lock_active" };
        }

        // ── Step 4: Acquire lock ──
        await acquireReorderLock(normalized);

        // ── Step 5: Find best supplier ──
        const supplierResult = await findBestSupplier(normalized, qty);
        const s = supplierResult.primarySupplier;

        // ── Step 6: Restock inventory ──
        const updated = await updateInventory(product, qty);

        // ── Step 7: WhatsApp notification ──
        const triggerLabel = {
            low_stock: "📉 Low Stock",
            missed_demand: "🔥 Missed Demand",
            manual: "📦 Manual",
        }[source] || "📦 Reorder";

        const msg =
            `${triggerLabel} *Auto-Reorder*\n\n` +
            `Product: ${inv.product}\n` +
            `Stock Before: ${inv.current_stock} units\n` +
            `Ordered: ${qty} units from ${s.supplier_name}\n` +
            `Stock After: ${updated.updatedStock} units\n` +
            `Price: INR ${s.wholesale_price}/unit (Total: INR ${supplierResult.totalCost})\n` +
            `Credit: ${s.credit_days > 0 ? `Yes (${s.credit_days} days)` : "Cash Only"}\n` +
            `Order: ${supplierResult.link}`;

        await sendWhatsApp(msg);

        console.log(`[Reorder] ✅ Auto-ordered ${qty}x ${inv.product} from ${s.supplier_name} [source: ${source}]`);

        return {
            reordered: true,
            product: inv.product,
            supplier: s.supplier_name,
            quantity: qty,
            totalCost: supplierResult.totalCost,
            newStock: updated.updatedStock,
        };

    } catch (err) {
        console.error(`[Reorder] Failed for "${product}":`, err.message);
        return null;
    }
};

export default { checkAndTriggerReorder };
