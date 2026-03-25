import pkg from 'twilio';
const { Twilio } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const client = new Twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

async function test() {
    try {
        console.log("Twilio SID:", process.env.TWILIO_ACCOUNT_SID);
        console.log("From:", "whatsapp:+14155238886");
        console.log("To:", "whatsapp:+919038232537");

        const message = await client.messages.create({
            body: 'Hello from DataTalk AI! Sandbox test 2.',
            from: 'whatsapp:+14155238886',
            to: 'whatsapp:+919038232537'
        });
        console.log("SUCCESS! SID:", message.sid);
    } catch (e) {
        console.error("FAILURE:", e.message);
    }
}

test();
