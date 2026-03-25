import { getPool } from "../config/db.js";

// ──────────────────────────────────────────────────────────────────────────────
// Database Service — Query Interface
//
// Centralized service for all Azure SQL interactions. 
// Provides standard wrappers for executing queries and procedures.
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Executes a basic SQL query string.
 * Initial implementation for requirement verification.
 * 
 * @param {string} queryStr - The query to execute
 * @returns {Promise<Array>} Results set
 */
export const executeQuery = async (queryStr) => {
    try {
        const pool = getPool();
        const result = await pool.request().query(queryStr);
        return result.recordset;
    } catch (err) {
        console.error("❌ SQL Query Error:", err.message);
        throw err;
    }
};

export default {
    executeQuery
};
