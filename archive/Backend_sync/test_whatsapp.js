import { sendWhatsApp } from './src/services/notification.service.js';

async function test() {
    console.log("Testing WhatsApp Pipeline...");
    const res = await sendWhatsApp("Test Message from DataTalk AI Sync Center 🚀");
    console.log("Result:", res);
}

test();
