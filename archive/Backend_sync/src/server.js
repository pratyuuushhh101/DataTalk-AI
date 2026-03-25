import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js";
import matchRoutes from "./routes/match.routes.js";

dotenv.config();

const app = express();
const PORT = 5050; // Different port to coexist with main backend (5000)

// 1. Cross-Origin Resource Sharing
app.use(cors());

// 2. Request Parsers (JSON + URL-Encoded)
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// 3. Status Check / Health
app.use((req, res, next) => {
    console.log(`[Matching Server] 🔍 ${req.method} ${req.url} - ${new Date().toISOString()}`);
    next();
});

// 4. API Routes
app.use("/", matchRoutes);

// ──────────────────────────────────────────────────────────────────────────────
// STARTUP LOGIC
// ──────────────────────────────────────────────────────────────────────────────

connectDB()
    .then(() => {
        console.log("DB Connected");
        const server = app.listen(PORT, () => {
            console.log(`\n📦 Matching & Sync Server Running on Port ${PORT}`);
            console.log(`🚀 API: http://localhost:${PORT}/compute`);
        });

        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                console.error(`❌ Port ${PORT} is in use. Please close existing instances.`);
                process.exit(1);
            } else {
                console.error("❌ Critical server error:", err);
                process.exit(1);
            }
        });
    })
    .catch((err) => {
        console.error("error: SQL Connection failed.");
        console.error("Error Detail:", err.message);
        process.exit(1);
    });
