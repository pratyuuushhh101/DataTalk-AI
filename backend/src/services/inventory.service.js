import { getPool } from "../config/db.js";
import { getStrictNormalizedName } from "../utils/normalization.js";

// ─── Inventory Service ────────────────────────────────────────────────────────
// Single source of truth for all inventory reads and writes.
// No other service should run raw SQL against the inventory table.
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Fetches inventory details for a product.
 *
 * @param {string} product - Raw or normalized product name
 * @returns {Promise<{ product: string, product_normalized: string, current_stock: number, reorder_threshold: number, unit_cost: number, selling_price: number, category: string } | null>}
 */
export const getInventory = async (product) => {
    const normalized = getStrictNormalizedName(product);
    const pool = getPool();

    const result = await pool.request()
        .input("norm", normalized)
        .query(`
            SELECT product, product_normalized, current_stock, reorder_threshold,
                   unit_cost, selling_price, category
            FROM inventory
            WHERE product_normalized = @norm
        `);

    if (result.recordset.length === 0) {
        return null;
    }

    return result.recordset[0];
};

/**
 * Atomically updates inventory stock by a delta.
 * Positive delta = restock (+50), Negative delta = sale (-3).
 * Prevents stock from going negative.
 *
 * @param {string} product - Raw or normalized product name
 * @param {number} quantityChange - Delta to apply (positive = add, negative = subtract)
 * @returns {Promise<{ product: string, updatedStock: number }>}
 */
export const updateInventory = async (product, quantityChange) => {
    const normalized = getStrictNormalizedName(product);
    const pool = getPool();

    // Prevent negative stock with a WHERE guard
    const result = await pool.request()
        .input("change", quantityChange)
        .input("norm", normalized)
        .query(`
            UPDATE inventory
            SET current_stock = current_stock + @change
            OUTPUT inserted.product, inserted.current_stock
            WHERE product_normalized = @norm
              AND (current_stock + @change) >= 0
        `);

    if (result.recordset.length === 0) {
        // Either product doesn't exist or change would make stock negative
        const existing = await getInventory(product);
        if (!existing) {
            throw new Error(`Product "${product}" not found in inventory.`);
        }
        throw new Error(
            `Insufficient stock for "${existing.product}". ` +
            `Current: ${existing.current_stock}, Requested change: ${quantityChange}`
        );
    }

    const updated = result.recordset[0];
    console.log(`[Inventory] ${updated.product}: stock updated by ${quantityChange > 0 ? "+" : ""}${quantityChange} → ${updated.current_stock}`);

    return {
        product: updated.product,
        updatedStock: updated.current_stock,
    };
};

export default { getInventory, updateInventory };
