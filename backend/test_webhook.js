import axios from 'axios';

const TEST_SENDER = 'whatsapp:+919038232537';
const BASE_URL = 'http://localhost:5000/whatsapp';

async function sendWebhook(body) {
    try {
        const res = await axios.post(BASE_URL, `From=${encodeURIComponent(TEST_SENDER)}&Body=${encodeURIComponent(body)}`, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        console.log(`[TEST] Input: "${body}"`);
        console.log(`[TEST] Reply: "${res.data}"\n`);
    } catch (e) {
        console.error(`[TEST] Error:`, e.response?.data || e.message);
    }
}

async function runTests() {
    console.log("🚀 Starting E2E DataTalk AI Tests...\n");

    // 1. Stock Query (Deterministic)
    await sendWebhook("how many maggi left");

    // 2. Transaction (Simple Text)
    await sendWebhook("sold 5 parleg");

    // 3. Multi-language / Phonetic Phonetic
    await sendWebhook("becha 2 oil");

    // 4. Slot Filling Flow (Simulated Sequence)
    console.log("--- SLOT FILLING TEST (Order) ---");
    await sendWebhook("order");
    await sendWebhook("parleg");
    await sendWebhook("10");

    console.log("✅ Tests Completed.");
}

runTests();
