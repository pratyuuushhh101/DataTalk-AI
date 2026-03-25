import sql from "mssql";
import { getPool } from "../config/db.js";
import { normalizeProduct } from "../utils/normalization.js";

// ──────────────────────────────────────────────────────────────────────────────
// Supplier Service — Procurement Interface
//
// Fetches sourcing information for restock operations.
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Finds the distributor for a specific product.
 * 
 * @param {string} productName - The item to find a supplier for
 * @returns {Promise<object|null>} Supplier details or null
 */
export const getSupplierForProduct = async (productName) => {
    try {
        const pool = getPool();
        const normalized = normalizeProduct(productName);

        const result = await pool.request()
            .input("p_norm", sql.VarChar, normalized)
            .query(`
                SELECT TOP 1 supplier_name, wholesale_price, credit_days
                FROM suppliers
                WHERE product_normalized = @p_norm
                ORDER BY wholesale_price ASC
            `);

        if (result.recordset.length > 0) return result.recordset[0];

        // 🎯 FALLBACK: Realistic Indian Supplier Data for Demo
        const demoSuppliers = {
            lays: { supplier_name: "Patel Wholesale (Mumbai)", wholesale_price: 8, credit_days: 15 },
            pepsi: { supplier_name: "Sharma & Sons Distributors", wholesale_price: 15, credit_days: 30 },
            maggi: { supplier_name: "Goel Retail Supply", wholesale_price: 10, credit_days: 7 }
        };

        return demoSuppliers[normalized] || null;

    } catch (err) {
        console.warn(`⚠️ Supplier DB error, using demo fallback for "${productName}"`);
        // Duplicate fallback for total safety in Demo Mode
        const normalized = normalizeProduct(productName);
        const demoSuppliers = {
            lays: { supplier_name: "Patel Wholesale (Mumbai)", wholesale_price: 8, credit_days: 15 },
            pepsi: { supplier_name: "Sharma & Sons Distributors", wholesale_price: 15, credit_days: 30 },
            maggi: { supplier_name: "Goel Retail Supply", wholesale_price: 10, credit_days: 7 }
        };
        return demoSuppliers[normalized] || null;
    }
};

export default {
    getSupplierForProduct
};
