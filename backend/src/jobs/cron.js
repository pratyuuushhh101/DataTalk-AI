import cron from 'node-cron';
import axios from 'axios';
import { getPool } from '../config/db.js';
import { sendWhatsApp } from '../services/notification.service.js';

import { getRecommendations } from "../services/recommendation.service.js";
import * as inventoryService from "../services/inventory.service.js";
import * as transactionService from "../services/transaction.service.js";
import * as salesService from "../services/sales.service.js";

import { getUpcomingFestival } from "../services/calendar.service.js";

async function runRecommendationEngine() {
    try {
        const inventory = typeof inventoryService.getAll === 'function' ? await inventoryService.getAll().catch(()=>[]) : [];
        const salesData = typeof transactionService.getAll === 'function' ? await transactionService.getAll().catch(()=>[]) : [];
        const globalSalesData = typeof salesService.getAggregatedData === 'function' ? await salesService.getAggregatedData().catch(()=>[]) : [];

        const region = inventory?.[0]?.region || "India";
        const festivalData = await getUpcomingFestival();
        const festival = festivalData ? festivalData.name : null;

        const recommendations = await getRecommendations({
            inventory,
            salesData,
            globalSalesData,
            region,
            festival
        });

        console.log("Auto Recommendation Generated:", JSON.stringify(recommendations, null, 2));

    } catch (err) {
        console.error("Recommendation Engine Error:", err.message);
    }
}


export const startCronJobs = () => {
    console.log("[Cron] Booting up Proactive Azure Watchdogs...");

    // ── 1. The 6:00 AM Macro News Watchdog ──────────────────────────────────────────
    // Checks GNews API for supply chain disruptions impacting the top inventory items.
    cron.schedule('0 6 * * *', async () => {
        console.log("[Cron] Running 6AM Macro News Watchdog...");
        try {
            const apiKey = process.env.NEWS_API_KEY;

            // 1A. Fetch Top Business Headlines in India via NewsAPI.org
            const newsRes = await axios.get(`https://newsapi.org/v2/top-headlines?country=in&category=business&pageSize=5&apiKey=${apiKey}`);
            const articles = newsRes.data.articles || [];
            if (articles.length === 0) return;

            const headlines = articles.map(a => a.title).join(" | ");

            // 1B. Get Shop's Top Inventory Items
            const pool = getPool();
            const topStock = await pool.request().query(`SELECT TOP 5 product FROM inventory ORDER BY current_stock DESC`);
            const stockList = topStock.recordset.map(r => r.product).join(", ");

            // 1C. Query the AI Core (o4-mini Extractor logic could be expanded here, but we pass to Brain Engine via generate-insight)
            const systemPrompt = `You are a Macro Supply Chain expert. Analyze these Indian news headlines: "${headlines}". 
            Does any headline directly threaten the supply or cost of these local shop inventory items: "${stockList}"? 
            If yes, write a VERY SHORT WhatsApp warning (2 sentences). If no threat, return strictly "NO_THREAT"`;

            const aiRes = await axios.post("http://localhost:8000/generate-insight", {
                question: "Analyze macro threats",
                data: [],
                customPrompt: systemPrompt
            });

            const warning = aiRes.data?.insight || "NO_THREAT";

            if (warning && !warning.includes("NO_THREAT")) {
                await sendWhatsApp(`🚨 *Morning Supply Chain Alert*\n\n${warning}`);
            }
        } catch (err) {
            console.error("[Cron] News Watchdog Error:", err.message);
        }
    });

    // ── 2. The 4-Hour Low Stock Anti-Leak Sweeper ──────────────────────────────────
    // Prevents missed sales by scanning for stock dips.
    cron.schedule('0 */4 * * *', async () => {
        console.log("[Cron] Running 4-Hour Low Stock Sweeper...");
        try {
            const pool = getPool();
            const result = await pool.request().query(`
                SELECT product, current_stock, reorder_threshold 
                FROM inventory 
                WHERE current_stock <= reorder_threshold
            `);

            const lowItems = result.recordset;
            if (lowItems.length > 0) {
                let msg = `⚠️ *Low Stock Warning*\n\n`;
                lowItems.forEach(item => {
                    msg += `• ${item.product}: Only ${item.current_stock} left!\n`;
                });
                msg += `\nReply with "Order [qty] [item]" to restock immediately.`;

                await sendWhatsApp(msg);
            }
        } catch (err) {
            console.error("[Cron] Low Stock Sweeper Error:", err.message);
        }
    });

    // ── 3. The 1st-of-Month Govt Schemes Matcher ───────────────────────────────────
    // Detects sustained momentum and pushes MUDRA loan scaling links.
    cron.schedule('0 10 1 * *', async () => {
        console.log("[Cron] Running Monthly Schemes Matcher...");
        try {
            const pool = getPool();
            // Complex aggregation: Check if last month had positive total profit
            const result = await pool.request().query(`
                SELECT SUM(profit) as MonthlyProfit
                FROM sales_data
                WHERE MONTH(transaction_date) = MONTH(DATEADD(MONTH, -1, GETDATE()))
                  AND YEAR(transaction_date) = YEAR(DATEADD(MONTH, -1, GETDATE()))
            `);

            const monthlyProfit = result.recordset[0]?.MonthlyProfit || 0;

            if (monthlyProfit > 0) {
                const msg = `🎉 *Monthly Business Review*\n\nGreat job! You made a profit of ₹${monthlyProfit} last month.\n\nSince your business is growing steadily, you now qualify to apply for the *PM MUDRA Yojana* loan to expand your shop (Up to ₹50,000 capital).\n\nTap here to apply securely: https://www.mudra.org.in/`;
                await sendWhatsApp(msg);
            }
        } catch (err) {
            console.error("[Cron] Schemes Matcher Error:", err.message);
        }
    });

    // ── Ambient Recommendation Engine ──────────────────────────────────────────
    cron.schedule("0 */6 * * *", runRecommendationEngine);

    // FOR TESTING:
    cron.schedule("* * * * *", runRecommendationEngine);
};
