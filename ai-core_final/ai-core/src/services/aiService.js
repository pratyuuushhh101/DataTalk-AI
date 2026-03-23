require('node:dns').setDefaultResultOrder('ipv4first');
const axios = require('axios');

const {
    AZURE_OPENAI_KEY,
    AZURE_OPENAI_ENDPOINT,
    AZURE_OPENAI_SPEED_DEPLOYMENT,
    AZURE_OPENAI_CORE_DEPLOYMENT,
    AZURE_OPENAI_API_VERSION
} = process.env;

/**
 * Helper to build the Azure OpenAI REST URL for a specific deployment.
 */
function getAzureURL(deploymentId) {
    // Ensures no double slashes before openai/
    const baseUrl = AZURE_OPENAI_ENDPOINT.endsWith('/') ? AZURE_OPENAI_ENDPOINT : `${AZURE_OPENAI_ENDPOINT}/`;
    return `${baseUrl}openai/deployments/${deploymentId}/chat/completions?api-version=${AZURE_OPENAI_API_VERSION}`;
}

const https = require('https');

/**
 * Base function to call Azure OpenAI via REST.
 */
async function callAzureOpenAI(deploymentId, messages, temperature = 0.0) {
    const url = getAzureURL(deploymentId);

    // o-series reasoning models on Azure strictly reject temperature settings other than 1 natively.
    const payload = { messages: messages };
    if (!deploymentId.startsWith('o') && temperature !== undefined) {
        payload.temperature = temperature;
    } else if (deploymentId.startsWith('o')) {
        payload.temperature = 1;
    }

    try {
        const httpsAgent = new https.Agent({ rejectUnauthorized: false });
        const response = await axios.post(url, payload, {
            headers: {
                'api-key': AZURE_OPENAI_KEY,
                'Content-Type': 'application/json'
            },
            httpsAgent,
            timeout: 30000
        });

        return response.data.choices[0]?.message?.content || "";
    } catch (err) {
        console.error(`[Azure OpenAI Error] Deployment (${deploymentId}):`, err.response?.data || err.message);
        throw err;
    }
}

/**
 * The "Brain Engine" - used for heavy logic like generating complex MS SQL queries.
 */
async function generateSQLFromLLM(systemPrompt, userPrompt) {
    const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
    ];

    let rawSql = await callAzureOpenAI(AZURE_OPENAI_CORE_DEPLOYMENT, messages, 0.0);

    // Clean markdown if present
    rawSql = rawSql.replace(/```sql/gi, "").replace(/```/g, "").trim();
    return rawSql;
}

/**
 * The "Brain Engine" - used for providing human-like coaching and translation over raw P&L data arrays.
 */
async function generateInsightFromLLM(systemPrompt, userPrompt) {
    const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
    ];

    let insightText = await callAzureOpenAI(AZURE_OPENAI_CORE_DEPLOYMENT, messages, 0.5);
    return insightText;
}

/**
 * The "Speed Engine" - used exclusively for instant intent routing and extracting Voice/Text to JSON.
 * (This is the new Phase 1 module for Pratyush).
 */
async function extractJSONFromSpeedEngine(systemPrompt, userText) {
    const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userText }
    ];

    let jsonString = await callAzureOpenAI(AZURE_OPENAI_SPEED_DEPLOYMENT, messages, 0.0);
    // Clean markdown wrapper if LLM includes it
    jsonString = jsonString.replace(/```json/gi, "").replace(/```/g, "").trim();
    return jsonString;
}

module.exports = {
    generateSQLFromLLM,
    generateInsightFromLLM,
    extractJSONFromSpeedEngine
};
