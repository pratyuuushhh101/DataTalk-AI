import sql from "mssql";
import { getPool } from "../config/db.js";

// ──────────────────────────────────────────────────────────────────────────────
// Sales Service — Transaction Logging
//
// Records all successful sales in the "sales_data" table for future analytics.
// Handles automatic revenue and profit calculation.
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Persists a transaction for a single product to Azure SQL.
 * 
 * @param {object} productData - Object containing product details (base name, price, cost)
 * @param {number} quantity - Number of units sold (defaults to 1 for this flow)
 * @returns {Promise<boolean>} Success status
 */
export const logTransaction = async (productData, quantity = 1) => {
    try {
        const pool = getPool();
        const revenue = productData.selling_price * quantity;
        const profit = (productData.selling_price - productData.unit_cost) * quantity;

        await pool.request()
            .input("product", sql.VarChar, productData.product)
            .input("quantity", sql.Int, quantity)
            .input("revenue", sql.Float, revenue)
            .input("profit", sql.Float, profit)
            .input("region", sql.VarChar, "demo_store")
            .query(`
                INSERT INTO sales_data (product, quantity, revenue, profit, transaction_date, region)
                VALUES (@product, @quantity, @revenue, @profit, GETDATE(), @region)
            `);

        console.log(`[Sales Service] ✅ Logged sale for "${productData.product}" - Profit: ₹${profit}`);
        return true;

    } catch (err) {
        console.error(`❌ Sales Logging Failed for "${productData.product}":`, err.message);
        throw err;
    }
};

export default {
    logTransaction
};
