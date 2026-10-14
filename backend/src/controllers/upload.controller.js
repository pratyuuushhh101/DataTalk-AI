import { uploadToBlob } from "../services/blob.service.js";
import csv from "csv-parser";
import fs from "fs";
import sql from "mssql";
import { getPool } from "../config/db.js";
import { getStrictNormalizedName } from "../utils/normalization.js";

// Flexible column alias mapping so any column order or common header naming works
const COLUMN_ALIASES = {
  transaction_date: ["transaction_date", "date", "order_date", "sale_date", "invoice_date", "timestamp", "day"],
  product: ["product", "product_name", "item", "item_name", "sku", "name", "description", "particulars"],
  category: ["category", "product_category", "department", "type", "group", "segment"],
  quantity: ["quantity", "qty", "units", "units_sold", "count", "volume"],
  unit_cost: ["unit_cost", "cost", "cost_price", "buying_price", "purchase_price", "cp"],
  unit_price: ["unit_price", "price", "selling_price", "mrp", "rate", "sp", "amount"],
  region: ["region", "city", "location", "store", "branch", "area", "zone", "state"]
};

function parseFlexibleDate(rawDate) {
  if (!rawDate) return new Date().toISOString().split("T")[0];
  const str = String(rawDate).trim();

  // 1. Explicit ISO YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    const [, yyyy, mm, dd] = isoMatch;
    return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  }

  // 2. Explicit Indian DD/MM/YYYY or DD-MM-YYYY (Checked BEFORE V8 new Date() to prevent MM/DD inversion)
  const dmyMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (dmyMatch) {
    let [, first, second, yyyy] = dmyMatch;
    // If second number > 12, first is Month and second is Day (US format); otherwise default to Indian DD/MM/YYYY
    const isUSFormat = parseInt(second, 10) > 12 && parseInt(first, 10) <= 12;
    const dd = isUSFormat ? second : first;
    const mm = isUSFormat ? first : second;
    return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  }

  // 3. Fallback for named dates like "20 Feb 2026"
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split("T")[0];
  }
  return null;
}

function resolveColumn(row, canonicalKey) {
  const aliases = COLUMN_ALIASES[canonicalKey] || [canonicalKey];
  for (const alias of aliases) {
    if (row[alias] !== undefined && row[alias] !== "") {
      return row[alias];
    }
  }
  return undefined;
}

export const handleUpload = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const filePath = req.file.path;
  const rows = [];
  let headerMapValid = false;

  try {
    await new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(
          csv({
            mapHeaders: ({ header }) =>
              header
                .replace(/^\uFEFF/, "") // Strip Excel UTF-8 BOM
                .trim()
                .toLowerCase()
                .replace(/[\s-]+/g, "_")
          })
        )
        .on("headers", (headers) => {
          const hasProduct = COLUMN_ALIASES.product.some((a) => headers.includes(a));
          const hasPrice = COLUMN_ALIASES.unit_price.some((a) => headers.includes(a));

          if (!hasProduct || !hasPrice) {
            reject(
              new Error(
                `CSV must include at least a product column (${COLUMN_ALIASES.product.slice(0, 3).join("/")}) and a price column (${COLUMN_ALIASES.unit_price.slice(0, 3).join("/")}). Found: ${headers.join(", ")}`
              )
            );
            return;
          }
          headerMapValid = true;
        })
        .on("data", (data) => rows.push(data))
        .on("end", resolve)
        .on("error", reject);
    });

    if (!headerMapValid) {
      return res.status(400).json({ error: "Invalid CSV structure" });
    }

    if (rows.length === 0) {
      return res.status(400).json({ error: "CSV is empty" });
    }

    // Validate and prepare all rows in memory before opening DB transaction
    const preparedRows = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const productRaw = resolveColumn(row, "product");
      if (!productRaw) continue; // Skip blank trailing lines

      const formattedDate = parseFlexibleDate(resolveColumn(row, "transaction_date"));
      const quantity = parseInt(resolveColumn(row, "quantity") ?? "1", 10);
      const unitPrice = parseFloat(resolveColumn(row, "unit_price"));
      const rawCost = resolveColumn(row, "unit_cost");
      const unitCost = rawCost !== undefined ? parseFloat(rawCost) : +(unitPrice * 0.75).toFixed(2);
      const category = String(resolveColumn(row, "category") || "General").trim();
      const region = String(resolveColumn(row, "region") || "Local").trim();
      const normalized = getStrictNormalizedName(productRaw);

      if (isNaN(quantity) || isNaN(unitCost) || isNaN(unitPrice) || !formattedDate) {
        return res.status(400).json({
          error: `Invalid numeric or date value on CSV row ${i + 2} (product: "${productRaw}").`
        });
      }

      const revenue = +(quantity * unitPrice).toFixed(2);
      const totalCost = +(quantity * unitCost).toFixed(2);
      const profit = +(revenue - totalCost).toFixed(2);

      preparedRows.push({
        transaction_date: formattedDate,
        product: String(productRaw).trim(),
        product_normalized: normalized,
        category,
        quantity,
        unit_cost: unitCost,
        unit_price: unitPrice,
        region,
        revenue,
        total_cost: totalCost,
        profit
      });
    }

    const pool = getPool();

    // Ensure table and index exist
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
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_sales_norm')
      CREATE INDEX idx_sales_norm ON sales_data(product_normalized);
    `);

    // Atomic Transaction ([BUG-05] Fix)
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      for (const item of preparedRows) {
        await new sql.Request(transaction)
          .input("transaction_date", sql.Date, item.transaction_date)
          .input("product", sql.VarChar(255), item.product)
          .input("product_normalized", sql.VarChar(255), item.product_normalized)
          .input("category", sql.VarChar(255), item.category)
          .input("quantity", sql.Int, item.quantity)
          .input("unit_cost", sql.Float, item.unit_cost)
          .input("unit_price", sql.Float, item.unit_price)
          .input("region", sql.VarChar(255), item.region)
          .input("revenue", sql.Float, item.revenue)
          .input("total_cost", sql.Float, item.total_cost)
          .input("profit", sql.Float, item.profit)
          .query(`
            INSERT INTO sales_data
            (transaction_date, product, product_normalized, category, quantity, unit_cost, unit_price, region, revenue, total_cost, profit)
            VALUES
            (@transaction_date, @product, @product_normalized, @category, @quantity, @unit_cost, @unit_price, @region, @revenue, @total_cost, @profit)
          `);
      }
      await transaction.commit();
    } catch (txErr) {
      await transaction.rollback();
      throw txErr;
    }

    await uploadToBlob(req.file);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    return res.json({
      message: "Upload successful",
      rowsInserted: preparedRows.length
    });
  } catch (err) {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    return res.status(400).json({
      error: err.message
    });
  }
};
