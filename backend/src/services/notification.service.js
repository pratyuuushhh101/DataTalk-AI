import twilio from "twilio";
import dotenv from "dotenv";
dotenv.config();

// ─── Centralized Notification Service ─────────────────────────────────────────
// Single source of truth for all outbound WhatsApp messaging.
// Every service that needs to send a message imports this instead of Twilio directly.
// ──────────────────────────────────────────────────────────────────────────────

const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const TWILIO_WHATSAPP_FROM = "whatsapp:" + process.env.TWILIO_PHONE_NUMBER;
const SHOPKEEPER_PHONE = "whatsapp:" + process.env.SHOPKEEPER_PHONE;

/**
 * Send a WhatsApp message to the shopkeeper.
 * All services MUST use this instead of instantiating Twilio directly.
 *
 * @param {string} message - The message body to send
 * @returns {Promise<{ success: boolean, sid?: string, error?: string }>}
 */
export const sendWhatsApp = async (message) => {
    try {
        const result = await twilioClient.messages.create({
            from: TWILIO_WHATSAPP_FROM,
            to: SHOPKEEPER_PHONE,
            body: message,
        });
        console.log(`[Notify] ✅ WhatsApp sent (SID: ${result.sid}): ${message.substring(0, 60)}...`);
        return { success: true, sid: result.sid };
    } catch (err) {
        console.error(`[Notify] ❌ WhatsApp send failed:`, err.message);
        return { success: false, error: err.message };
    }
};

export default { sendWhatsApp };
