import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import sql from "mssql";
import { connectDB } from "./config/db.js";
import uploadRoute from "./routes/upload.routes.js";
import queryRoute from "./routes/query.routes.js";
import nlQueryRoute from "./routes/nlQuery.routes.js";
import whatsappRoute from "./routes/whatsapp.routes.js";
import analyzeRoute from "./routes/analyze.routes.js";
import transactionRoutes from "./routes/transaction.routes.js";
import debugRoutes from "./routes/debug.routes.js";
import { startCronJobs } from "./jobs/cron.js";

dotenv.config();
const app = express();

// 1. Global Request Logger (Method, URL, Timestamp)
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[HTTP] ${req.method} ${req.url} - ${timestamp}`);
  next();
});

app.use(cors());

// 2. Strict Body Parsing (Critical for Twilio)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/nl-query", nlQueryRoute);
app.use("/whatsapp", whatsappRoute);
app.use("/twilio-debug", debugRoutes);
app.use("/api/analyze", analyzeRoute);
app.use("/api", transactionRoutes);

app.get("/", (req, res) => {
  res.send("Backend running");
});

/* 👇 ADD TEST ROUTE HERE */
app.get("/test-insert", async (req, res) => {
  try {
    await sql.query(`
      INSERT INTO sales_data
      (transaction_date, product, category, quantity, unit_cost, unit_price, region, revenue, total_cost, profit)
      VALUES
      ('2026-02-27', 'Test Product', 'Test Category', 10, 50, 100, 'South',
       1000, 500, 500)
    `);

    res.send("Inserted successfully");
  } catch (err) {
    console.error(err);
    res.status(500).send("Insert failed");
  }
});

app.use("/upload", uploadRoute);
app.use("/query", queryRoute);

// app.listen(5000, () => {
//   console.log("Server running on port 5000");
// });
// ─── STARTUP LOGIC ──────────────────────────────────────────────────────────

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    const server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      // Boot the AI Watchdog capabilities
      startCronJobs();
    });

    // Graceful error handling mapping to close the server
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Please close any running terminals or instances.`);
        process.exit(1);
      } else {
        console.error("Server encountered an error:", err);
        process.exit(1);
      }
    });
  })
  .catch((err) => {
    console.error("Failed to connect to the database:", err);
    process.exit(1);
  });

