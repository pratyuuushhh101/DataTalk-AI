import { uploadToBlob } from "../services/blob.service.js";
import csv from "csv-parser";
import fs from "fs";
import sql from "mssql";
import { getAdminPool } from "../config/db.js";

const REQUIRED_COLUMNS = [
  "transaction_date",
  "product",
  "category",
  "quantity",
  "unit_cost",
  "unit_price",
  "region"
];

export const handleUpload = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const filePath = req.file.path;
  const rows = [];
  let headersValidated = false;

  try {
    await new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on("headers", (headers) => {
          const missing = REQUIRED_COLUMNS.filter(
            (col) => !headers.includes(col)
          );

          if (missing.length > 0) {
            reject(
              new Error(`Missing required columns: ${missing.join(", ")}`)
            );
          }

          headersValidated = true;
        })
        .on("data", (data) => {
          rows.push(data);
        })
        .on("end", resolve)
        .on("error", reject);
    });

    if (!headersValidated) {
      return res.status(400).json({ error: "Invalid CSV structure" });
    }

    if (rows.length === 0) {
      return res.status(400).json({ error: "CSV is empty" });
    }

    const pool = getAdminPool();

    for (const row of rows) {
      const quantity = parseInt(row.quantity);
      const unitCost = parseFloat(row.unit_cost);
      const unitPrice = parseFloat(row.unit_price);

      if (isNaN(quantity) || isNaN(unitCost) || isNaN(unitPrice)) {
        return res.status(400).json({ error: "Invalid numeric values in CSV" });
      }

      const revenue = quantity * unitPrice;
      const totalCost = quantity * unitCost;
      const profit = revenue - totalCost;

      await pool.request()
        .input("transaction_date", sql.VarChar, row.transaction_date)
        .input("product", sql.VarChar, row.product)
        .input("category", sql.VarChar, row.category)
        .input("quantity", sql.Int, quantity)
        .input("unit_cost", sql.Float, unitCost)
        .input("unit_price", sql.Float, unitPrice)
        .input("region", sql.VarChar, row.region)
        .input("revenue", sql.Float, revenue)
        .input("total_cost", sql.Float, totalCost)
        .input("profit", sql.Float, profit)
        .query(`
          INSERT INTO sales_data
          (transaction_date, product, category, quantity, unit_cost, unit_price, region, revenue, total_cost, profit)
          VALUES
          (@transaction_date, @product, @category, @quantity, @unit_cost, @unit_price, @region, @revenue, @total_cost, @profit)
        `);
    }

    await uploadToBlob(req.file);
    fs.unlinkSync(filePath);

    return res.json({
      message: "Upload successful",
      rowsInserted: rows.length
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