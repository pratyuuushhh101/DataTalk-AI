require('node:dns').setDefaultResultOrder('ipv4first');
const axios = require('axios');
const https = require('https');

const {
    GROQ_API_KEY,
    AZURE_OPENAI_KEY,
    AZURE_OPENAI_SPEED_DEPLOYMENT,
    AZURE_OPENAI_CORE_DEPLOYMENT
} = process.env;

/**
 * Base function to call Groq (OpenAI-compatible REST API).
 */
async function callAzureOpenAI(deploymentId, messages, temperature = 0.0) {
    const url = 'https://api.groq.com/openai/v1/chat/completions';
    const apiKey = (GROQ_API_KEY || AZURE_OPENAI_KEY || '').trim();

    // Map only exact legacy Azure deployment names
    let model = deploymentId || 'openai/gpt-oss-120b';
    if (model === 'gpt-4o') model = 'openai/gpt-oss-120b';
    if (model === 'o4-mini') model = 'openai/gpt-oss-20b';

    const payload = {
        model: model,
        messages: messages,
        temperature: temperature
    };

    try {
        const httpsAgent = new https.Agent({ rejectUnauthorized: false });
        const response = await axios.post(url, payload, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            httpsAgent,
            timeout: 30000
        });

        return response.data.choices[0]?.message?.content || "";
    } catch (err) {
        console.error(`[Groq API Error] Model (${model}):`, err.response?.data || err.message);
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
