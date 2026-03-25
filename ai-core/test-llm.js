const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

const {
    AZURE_OPENAI_KEY,
    AZURE_OPENAI_ENDPOINT,
    AZURE_OPENAI_SPEED_DEPLOYMENT,
    AZURE_OPENAI_API_VERSION
} = process.env;

const url = `${AZURE_OPENAI_ENDPOINT}openai/deployments/${AZURE_OPENAI_SPEED_DEPLOYMENT}/chat/completions?api-version=${AZURE_OPENAI_API_VERSION}`;

console.log("Testing URL:", url);

async function testLLM() {
    try {
        const response = await axios.post(url, {
            messages: [{ role: "user", content: "test" }]
        }, {
            headers: {
                'api-key': AZURE_OPENAI_KEY,
                'Content-Type': 'application/json'
            }
        });
        console.log(`Success! LLM responded.`);
    } catch (err) {
        console.log(`Error Status:`, err.response?.status);
        console.log(`Error MSG:`, JSON.stringify(err.response?.data) || err.message);
    }
}

testLLM();
