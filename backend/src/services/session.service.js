import redis from "../config/redis.js";

const LOCAL_SESSIONS = new Map(); // Fallback if Redis is down

class SessionService {
    static async getSession(phoneNumber) {
        try {
            if (redis && redis.status === "ready") {
                const data = await redis.get(`session:${phoneNumber}`);
                return data ? JSON.parse(data) : null;
            }
        } catch (e) {
            console.error("[Session] Redis get error:", e.message);
        }
        return LOCAL_SESSIONS.get(phoneNumber);
    }

    static async setSession(phoneNumber, sessionData, ttlInSeconds = 300) {
        try {
            if (redis && redis.status === "ready") {
                await redis.setex(`session:${phoneNumber}`, ttlInSeconds, JSON.stringify(sessionData));
                return;
            }
        } catch (e) {
            console.error("[Session] Redis set error:", e.message);
        }
        LOCAL_SESSIONS.set(phoneNumber, sessionData);
        // Basic TTL for local Map
        setTimeout(() => LOCAL_SESSIONS.delete(phoneNumber), ttlInSeconds * 1000);
    }

    static async clearSession(phoneNumber) {
        try {
            if (redis && redis.status === "ready") {
                await redis.del(`session:${phoneNumber}`);
                return;
            }
        } catch (e) {
            console.error("[Session] Redis del error:", e.message);
        }
        LOCAL_SESSIONS.delete(phoneNumber);
    }
}

export default SessionService;
