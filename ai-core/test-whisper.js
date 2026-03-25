const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

const {
    AZURE_OPENAI_WHISPER_KEY,
    AZURE_OPENAI_WHISPER_ENDPOINT,
    AZURE_OPENAI_WHISPER_DEPLOYMENT,
    AZURE_OPENAI_API_VERSION
} = process.env;

const baseUrl = AZURE_OPENAI_WHISPER_ENDPOINT.endsWith('/') ? AZURE_OPENAI_WHISPER_ENDPOINT : `${AZURE_OPENAI_WHISPER_ENDPOINT}/`;
const url = `${baseUrl}openai/deployments/${AZURE_OPENAI_WHISPER_DEPLOYMENT}/audio/transcriptions?api-version=${AZURE_OPENAI_API_VERSION}`;

console.log("Testing URL:", url);

async function testAuth(headerName) {
    try {
        const response = await axios.post(url, "dummydata", {
            headers: {
                [headerName]: AZURE_OPENAI_WHISPER_KEY,
                'Content-Type': 'multipart/form-data'
            }
        });
        console.log(`[${headerName}] Success!`);
    } catch (err) {
        console.log(`[${headerName}] Error Status:`, err.response?.status);
        console.log(`[${headerName}] Error MSG:`, JSON.stringify(err.response?.data) || err.message);
    }
}

async function run() {
    await testAuth('api-key');
    await testAuth('Ocp-Apim-Subscription-Key');
}
run();
