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

    // Ensure the table exists before inserting
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='sales_data' AND xtype='U')
      CREATE TABLE sales_data (
          id INT IDENTITY(1,1) PRIMARY KEY,
          transaction_date DATE,
          product VARCHAR(255),
          category VARCHAR(255),
          quantity INT,
          unit_cost FLOAT,
          unit_price FLOAT,
          region VARCHAR(255),
          revenue FLOAT,
          total_cost FLOAT,
          profit FLOAT
      )
    `);

    for (const row of rows) {
      const quantity = parseInt(row.quantity);
      const unitCost = parseFloat(row.unit_cost);
      const unitPrice = parseFloat(row.unit_price);

      // Bulletproof Date Parsing
      let formattedDate = null;
      if (row.transaction_date) {
        let d = new Date(row.transaction_date);
        // JS Date parsing success
        if (!isNaN(d.getTime())) {
          formattedDate = d.toISOString().split('T')[0];
        } else {
          // Fallback for DD/MM/YYYY or DD-MM-YYYY
          const parts = String(row.transaction_date).split(/[-/]/);
          if (parts.length === 3 && parts[2].length === 4) {
            formattedDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
          }
        }
      }

      if (isNaN(quantity) || isNaN(unitCost) || isNaN(unitPrice) || !formattedDate) {
        return res.status(400).json({ error: "Invalid numeric or date values in CSV. Check format." });
      }

      const revenue = quantity * unitPrice;
      const totalCost = quantity * unitCost;
      const profit = revenue - totalCost;

      await pool.request()
        .input("transaction_date", sql.Date, formattedDate)
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