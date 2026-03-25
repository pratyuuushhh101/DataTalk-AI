import twilio from "twilio";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Ensure we load the .env from the same directory as this service
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../../.env") });

// ─── Centralized Notification Service ─────────────────────────────────────────
// Single source of truth for all outbound WhatsApp messaging.
// ──────────────────────────────────────────────────────────────────────────────

const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const TWILIO_WHATSAPP_FROM = "whatsapp:" + (process.env.TWILIO_PHONE_NUMBER || "+14155238886");
const SHOPKEEPER_PHONE = "whatsapp:" + (process.env.SHOPKEEPER_PHONE || "+919038232537");

/**
 * Send a WhatsApp message to the shopkeeper.
 * 
 * @param {string} message - The message body (max 1500 chars)
 */
export const sendWhatsApp = async (message) => {
    // 1. Validate Payload
    if (!message || typeof message !== 'string' || message.trim() === "") {
        console.error("[Notify] ❌ Aborting: Message body is empty or invalid.");
        return { success: false, error: "Empty message body" };
    }

    if (message.length > 1500) {
        console.warn("[Notify] ⚠️ Message too large, truncating to 1500 chars.");
        message = message.substring(0, 1500);
    }

    try {
        console.log(`[Notify] 📤 Sending WhatsApp message...`);
        console.log(`[Notify] 📍 To: ${SHOPKEEPER_PHONE}`);
        console.log(`[Notify] 📄 Body: "${message.substring(0, 100)}${message.length > 100 ? '...' : ''}"`);

        // 2. Validate Twilio Call (Await properly)
        const result = await twilioClient.messages.create({
            from: TWILIO_WHATSAPP_FROM,
            to: SHOPKEEPER_PHONE,
            body: message,
        });

        // 3. Confirm Success
        if (result && result.sid) {
            console.log(`[Notify] ✅ WhatsApp sent successfully! SID: ${result.sid}`);
            return { success: true, sid: result.sid };
        } else {
            throw new Error("Twilio API returned success but no SID was found.");
        }

    } catch (err) {
        // 4. Detailed Error Logging
        console.error(`[Notify] ❌ Twilio Call Failed:`, err.message);
        if (err.code) console.error(`[Notify] 🔍 Twilio Error Code: ${err.code}`);
        return { success: false, error: err.message };
    }
};

export default { sendWhatsApp };
