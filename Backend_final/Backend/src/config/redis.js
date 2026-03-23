import Redis from "ioredis";
import dotenv from "dotenv";
dotenv.config();

const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";

let redis;

try {
    const redisOptions = {
        maxRetriesPerRequest: 1,
        connectTimeout: 500, // Very aggressive half-second timeout
        lazyConnect: true,
        retryStrategy: (times) => {
            return null; // Don't retry at all for high-latency cloud instances
        }
    };

    // Azure specific: Need TLS for rediss:// on port 6380
    if (REDIS_URL.startsWith("rediss")) {
        redisOptions.tls = {};
    }

    redis = new Redis(REDIS_URL, redisOptions);

    redis.on("error", (err) => {
        // Silent error to avoid log flood
    });
} catch (e) {
    console.warn("[Redis] Initialization failed.");
}

export default redis;
