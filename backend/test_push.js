import twilio from "twilio";
import dotenv from "dotenv";
dotenv.config();

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

async function testPush() {
    try {
        const message = await client.messages.create({
            body: "🚀 DataTalk AI Push Test: I'm back in REST API Mode!",
            from: process.env.TWILIO_WHATSAPP_NUMBER,
            to: `whatsapp:${process.env.SHOPKEEPER_PHONE || '916290347847'}` // Fallback for Pratyush
        });
        console.log("✅ Message Sent! SID:", message.sid);
    } catch (e) {
        console.error("❌ Message Failed:", e.message);
    }
}

testPush();
