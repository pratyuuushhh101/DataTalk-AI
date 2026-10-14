import { getPool, connectDB } from "./src/config/db.js";
import { getStrictNormalizedName } from "./src/utils/normalization.js";
import dotenv from "dotenv";
dotenv.config();

async function runMigration() {
    try {
        await connectDB();
        const pool = getPool();

        console.log("Ensuring sales_data table and product_normalized columns exist...");

        // Ensure sales_data exists even if migrate.js is run before first CSV upload
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='sales_data' AND xtype='U')
            CREATE TABLE sales_data (
                id INT IDENTITY(1,1) PRIMARY KEY,
                transaction_date DATE,
                product VARCHAR(255),
                product_normalized VARCHAR(255),
                category VARCHAR(255),
                quantity INT,
                unit_cost FLOAT,
                unit_price FLOAT,
                region VARCHAR(255),
                revenue FLOAT,
                total_cost FLOAT,
                profit FLOAT
            );
        `);

        for (const table of ["inventory", "suppliers", "sales_data"]) {
            await pool.request().query(`
                IF OBJECT_ID('${table}', 'U') IS NOT NULL
                AND NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('${table}') AND name = 'product_normalized')
                ALTER TABLE ${table} ADD product_normalized VARCHAR(255);
            `);
        }

        console.log("Populating normalized names across all tables...");

        for (const table of ["inventory", "suppliers", "sales_data"]) {
            const res = await pool.request().query(`
                IF OBJECT_ID('${table}', 'U') IS NOT NULL
                SELECT DISTINCT product FROM ${table} WHERE product IS NOT NULL
            `);
            for (const row of res.recordset || []) {
                const normalized = getStrictNormalizedName(row.product);
                await pool.request()
                    .input("name", row.product)
                    .input("normalized", normalized)
                    .query(`UPDATE ${table} SET product_normalized = @normalized WHERE product = @name`);
            }
        }

        console.log("Creating indexes for performance...");
        await pool.request().query("IF OBJECT_ID('inventory', 'U') IS NOT NULL AND NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_inventory_norm') CREATE INDEX idx_inventory_norm ON inventory(product_normalized)");
        await pool.request().query("IF OBJECT_ID('suppliers', 'U') IS NOT NULL AND NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_suppliers_norm') CREATE INDEX idx_suppliers_norm ON suppliers(product_normalized)");
        await pool.request().query("IF OBJECT_ID('sales_data', 'U') IS NOT NULL AND NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_sales_norm') CREATE INDEX idx_sales_norm ON sales_data(product_normalized)");

        console.log("✅ Migration Successful!");
    } catch (err) {
        console.error("❌ Migration Failed:", err.message);
    } finally {
        process.exit();
    }
}

runMigration();
