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
import demoRoutes from "./routes/demo.routes.js";
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

// 2. Strict Body Parsing (Critical for Twilio + Camera Snapshots)
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.use("/nl-query", nlQueryRoute);
app.use("/whatsapp", whatsappRoute);
app.use("/twilio-debug", debugRoutes);
app.use("/api/analyze", analyzeRoute);
app.use("/api", transactionRoutes);
app.use("/demo", demoRoutes);

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

// Start with DB connection attempt, but fallback to server start for demo safety
connectDB()
  .catch((err) => {
    console.warn("\n⚠️  [DEMO MODE] Could not connect to Azure SQL. Falling back to local/hardcoded demo logic.");
    console.error("Cause:", err.message);
  })
  .finally(() => {
    const server = app.listen(PORT, () => {
      console.log(`\n🚀 Server running on port ${PORT}`);
      console.log(`🔗 Local Test: http://localhost:${PORT}/demo/founder-kit`);
      startCronJobs();
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use.`);
        process.exit(1);
      } else {
        console.error("❌ Server error:", err);
        process.exit(1);
      }
    });
  });

