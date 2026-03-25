import redis from "../config/redis.js";

// ──────────────────────────────────────────────────────────────────────────────
// Redis Service — Abstraction Layer
//
// Provides a unified interface for data persistence.
// Logic automatically switches between Cloud Redis and local In-Memory fallback
// based on the USE_REDIS feature flag.
// ──────────────────────────────────────────────────────────────────────────────

const IN_MEMORY_DEMAND = {}; // Fallback storage: { product: count }

/**
 * Increments the demand counter for a specific product.
 * @param {string} product - Normalized product name.
 * @returns {number} Updated count.
 */
export const incrementMissedDemand = async (product) => {
    const key = `missed:${product}`;

    if (redis) {
        try {
            const count = await redis.incr(key);
            await redis.expire(key, 604800); // 7 days
            return count;
        } catch (err) {
            console.error(`[Redis Service] INCR failed for ${product}:`, err.message);
            // Fallback to memory on failure even if redis is enabled
            return incrementLocal(product);
        }
    }

    return incrementLocal(product);
};

/**
 * Fetches the current demand count for a product.
 * @param {string} product
 * @returns {number}
 */
export const getMissedDemand = async (product) => {
    const key = `missed:${product}`;

    if (redis) {
        try {
            const val = await redis.get(key);
            return parseInt(val) || 0;
        } catch (err) {
            console.error(`[Redis Service] GET failed for ${product}:`, err.message);
            return IN_MEMORY_DEMAND[product] || 0;
        }
    }

    return IN_MEMORY_DEMAND[product] || 0;
};

// Private helper for in-memory increment logic
function incrementLocal(product) {
    if (!IN_MEMORY_DEMAND[product]) {
        IN_MEMORY_DEMAND[product] = 0;
    }
    IN_MEMORY_DEMAND[product] += 1;
    return IN_MEMORY_DEMAND[product];
}

export default {
    incrementMissedDemand,
    getMissedDemand
};
