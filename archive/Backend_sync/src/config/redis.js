import Redis from "ioredis";
import dotenv from "dotenv";
dotenv.config();

let redis = null;

const USE_REDIS = process.env.USE_REDIS === "true";

if (USE_REDIS) {
    try {
        const redisOptions = {
            host: process.env.REDIS_HOST || "127.0.0.1",
            port: parseInt(process.env.REDIS_PORT, 10) || 6380,
            password: process.env.REDIS_PASSWORD || "",
            tls: {}, // SSL Required for Azure
            maxRetriesPerRequest: 1,
            connectTimeout: 5000,
        };

        redis = new Redis(redisOptions);

        redis.on("connect", () => console.log("✅ Redis Enabled (Azure Cloud Connected)"));
        redis.on("error", (err) => {
            console.error(`❌ Redis Error (Code: ${err.code}):`, err.message);
        });
    } catch (err) {
        console.error("❌ Redis Client Initialization Failed:", err);
        redis = null;
    }
} else {
    console.log("ℹ️ Redis Disabled (Fallback Mode — using internal JS object)");
}

export default redis;
