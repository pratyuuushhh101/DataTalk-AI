import { getPool, connectDB } from "./src/config/db.js";
import { normalizeProductName } from "./src/utils/normalization.js";
import dotenv from 'dotenv';
dotenv.config();

async function runMigration() {
    try {
        await connectDB();
        const pool = getPool();

        console.log("Adding product_normalized columns...");

        // 1. Update inventory
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('inventory') AND name = 'product_normalized')
            ALTER TABLE inventory ADD product_normalized VARCHAR(100);
        `);

        // 2. Update suppliers
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('suppliers') AND name = 'product_normalized')
            ALTER TABLE suppliers ADD product_normalized VARCHAR(100);
        `);

        // 3. Update sales_data
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('sales_data') AND name = 'product_normalized')
            ALTER TABLE sales_data ADD product_normalized VARCHAR(100);
        `);

        console.log("Populating normalized names...");

        // Fetch all products to normalize
        const productsRes = await pool.request().query("SELECT product FROM inventory");
        for (const row of productsRes.recordset) {
            const normalized = normalizeProductName(row.product);
            await pool.request()
                .input('name', row.product)
                .input('normalized', normalized)
                .query("UPDATE inventory SET product_normalized = @normalized WHERE product = @name");

            await pool.request()
                .input('name', row.product)
                .input('normalized', normalized)
                .query("UPDATE suppliers SET product_normalized = @normalized WHERE product = @name");

            await pool.request()
                .input('name', row.product)
                .input('normalized', normalized)
                .query("UPDATE sales_data SET product_normalized = @normalized WHERE product = @name");
        }

        console.log("Creating indexes for performance...");
        await pool.request().query("IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_inventory_norm') CREATE INDEX idx_inventory_norm ON inventory(product_normalized)");
        await pool.request().query("IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_suppliers_norm') CREATE INDEX idx_suppliers_norm ON suppliers(product_normalized)");
        await pool.request().query("IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_sales_norm') CREATE INDEX idx_sales_norm ON sales_data(product_normalized)");

        console.log("Migration Successful!");
    } catch (err) {
        console.error("Migration Failed:", err.message);
    } finally {
        process.exit();
    }
}

runMigration();
