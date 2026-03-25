import redis from "../config/redis.js";
import { getStrictNormalizedName } from "../utils/normalization.js";
import { checkAndTriggerReorder } from "./reorder.service.js";

// ─── Demand Service ───────────────────────────────────────────────────────────
// Redis-based missed demand tracking.
// When customers ask for products that are OUT OF STOCK, this service
// increments a counter. Once threshold is reached → triggers reorder.
//
// RULES:
//   ✅ Redis only (no SQL)
//   ✅ Delegates reorder to reorder.service
//   ❌ No raw SQL
//   ❌ No direct Twilio / WhatsApp
// ──────────────────────────────────────────────────────────────────────────────

const KEY_PREFIX = "missed:";
const THRESHOLD = 5;
const TTL_SECONDS = 604800; // 7 days

/**
 * Local in-memory fallback if Redis is unavailable.
 */
const LOCAL_DEMAND = new Map();

/**
 * Increments the missed demand counter for a product.
 * If threshold (5) is reached → calls reorder.service → resets counter.
 *
 * @param {string} product - Raw or normalized product name
 * @returns {Promise<{ count: number, reorderTriggered: boolean }>}
 */
export const incrementDemand = async (product) => {
    const normalized = getStrictNormalizedName(product);
    const key = `${KEY_PREFIX}${normalized}`;
    let count = 0;
    let reorderTriggered = false;

    try {
        // ── Increment ──
        if (redis && redis.status === "ready") {
            count = await redis.incr(key);
            await redis.expire(key, TTL_SECONDS);
        } else {
            const prev = LOCAL_DEMAND.get(normalized) || 0;
            count = prev + 1;
            LOCAL_DEMAND.set(normalized, count);
            setTimeout(() => LOCAL_DEMAND.delete(normalized), TTL_SECONDS * 1000);
        }

        console.log(`[Demand] 📈 ${normalized} demand: ${count}/${THRESHOLD}`);

        // ── Threshold check ──
        if (count >= THRESHOLD) {
            console.log(`[Demand] 🔥 Threshold reached for "${normalized}". Triggering reorder...`);

            const result = await checkAndTriggerReorder(normalized, 50, "missed_demand");
            reorderTriggered = result?.reordered === true;

            // ── Reset counter ──
            if (redis && redis.status === "ready") {
                await redis.del(key);
                console.log(`[Demand] 🔄 Counter reset for "${normalized}"`);
            } else {
                LOCAL_DEMAND.delete(normalized);
            }
        }
    } catch (err) {
        console.error(`[Demand] Error for "${normalized}":`, err.message);
    }

    return { count, reorderTriggered };
};

/**
 * Returns the top demanded products (sorted descending by count).
 * Scans all `missed:*` keys in Redis and returns the top 5.
 *
 * @returns {Promise<Array<{ product: string, count: number }>>}
 */
export const getDemandInsights = async () => {
    const results = [];

    try {
        if (redis && redis.status === "ready") {
            // SCAN for all missed:* keys (non-blocking)
            const keys = [];
            let cursor = "0";

            do {
                const [nextCursor, batch] = await redis.scan(cursor, "MATCH", `${KEY_PREFIX}*`, "COUNT", 100);
                cursor = nextCursor;
                keys.push(...batch);
            } while (cursor !== "0");

            // Fetch counts for each key
            for (const key of keys) {
                const val = await redis.get(key);
                const count = parseInt(val) || 0;
                const product = key.replace(KEY_PREFIX, "");
                results.push({ product, count });
            }
        } else {
            // Local fallback
            for (const [product, count] of LOCAL_DEMAND.entries()) {
                results.push({ product, count });
            }
        }
    } catch (err) {
        console.error("[Demand] getDemandInsights error:", err.message);
    }

    // Sort descending, limit to top 5
    return results
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
};

/**
 * Returns the current demand count for a single product (read-only).
 *
 * @param {string} product - Raw or normalized product name
 * @returns {Promise<number>}
 */
export const getDemandCount = async (product) => {
    const normalized = getStrictNormalizedName(product);
    try {
        if (redis && redis.status === "ready") {
            const val = await redis.get(`${KEY_PREFIX}${normalized}`);
            return parseInt(val) || 0;
        }
    } catch (e) { /* silent */ }
    return LOCAL_DEMAND.get(normalized) || 0;
};

export default { incrementDemand, getDemandInsights, getDemandCount };
