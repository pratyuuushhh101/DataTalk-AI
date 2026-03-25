import sql from "mssql";
import { getPool } from "../config/db.js";
import { normalizeProduct } from "../utils/normalization.js";
import { getSupplierForProduct } from "./supplier.service.js";

// ──────────────────────────────────────────────────────────────────────────────
// Inventory Service — SQL Interface
//
// Handles lookups and stock management in the "inventory" table.
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Fetches core product details by matching the normalized product name.
 * 
 * @param {string} productName - Raw product name provided by CV/Audio input
 * @returns {Promise<object|null>} product data or null if not found
 */
export const getProductDetails = async (productName) => {
    try {
        const pool = getPool();
        const normalizedItem = normalizeProduct(productName); // Standardize input (lays_blue -> lays)

        const result = await pool.request()
            .input("p_norm", sql.VarChar, normalizedItem)
            .query(`
                SELECT product, selling_price, current_stock, reorder_threshold, unit_cost
                FROM inventory
                WHERE product_normalized = @p_norm
            `);

        // If found, return the first matching object, otherwise null
        return result.recordset.length > 0 ? result.recordset[0] : null;
    } catch (err) {
        console.error(`❌ Error looking up product "${productName}":`, err.message);
        throw err;
    }
};

/**
 * Decrements the stock for a single item and checks for low-stock threshold breach.
 * 
 * @param {string} productName - Normalized product name
 * @returns {Promise<object>} Result including new stock levels and alert status
 */
export const deductStock = async (productName) => {
    try {
        const pool = getPool();
        const normalized = normalizeProduct(productName);

        // 1. Decrement stock by 1
        await pool.request()
            .input("p_norm", sql.VarChar, normalized)
            .query(`
                UPDATE inventory 
                SET current_stock = current_stock - 1 
                WHERE product_normalized = @p_norm
            `);

        // 2. Fetch updated state for alert check
        const updated = await getProductDetails(normalized);
        if (!updated) throw new Error(`Product "${productName}" not found after update`);

        const low_stock = updated.current_stock < updated.reorder_threshold;
        let suggestion = null;

        // 🎯 WOW MOMENT: Proactive Intelligence (Restock Suggestion)
        if (low_stock) {
            const supplierData = await getSupplierForProduct(normalized);
            if (supplierData) {
                suggestion = {
                    type: "reorder_suggestion",
                    product: updated.product,
                    supplier_name: supplierData.supplier_name,
                    wholesale_price: supplierData.wholesale_price,
                    credit_days: supplierData.credit_days
                };
            }
        }

        return {
            product: updated.product,
            current_stock: updated.current_stock,
            low_stock,
            reorder_suggestion: suggestion
        };

    } catch (err) {
        console.error(`❌ Inventory Deduction Failed for "${productName}":`, err.message);
        throw err;
    }
};

export default {
    getProductDetails,
    deductStock
};
