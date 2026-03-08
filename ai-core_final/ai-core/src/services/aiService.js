require('node:dns').setDefaultResultOrder('ipv4first');
const axios = require('axios');

const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;
const MISTRAL_MODEL = "mistral-small-latest";
const MISTRAL_URL = "https://api.mistral.ai/v1/chat/completions";

/**
 * Calls Mistral to convert prompt text to SQL.
 * @param {string} finalPrompt 
 * @returns {Promise<string>}
 */
async function generateSQLFromLLM(finalPrompt) {
    try {
        const response = await axios.post(MISTRAL_URL, {
            model: MISTRAL_MODEL,
            messages: [
                { role: "user", content: finalPrompt }
            ],
            temperature: 0 // 0 for exact deterministic SQL
        }, {
            headers: {
                'Authorization': `Bearer ${MISTRAL_API_KEY}`,
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });

        const chatCompletion = response.data;
        let responseText = chatCompletion.choices[0]?.message?.content || "";
        responseText = responseText.replace(/```sql/gi, "").replace(/```/g, "").trim();

        return responseText;
    } catch (err) {
        console.error("Mistral API Error (SQL):", err.response?.data || err.message);
        throw new Error("Failed to generate SQL from AI Core.");
    }
}

/**
 * Calls Mistral to generate business insights from data.
 * @param {string} finalPrompt 
 * @returns {Promise<string>}
 */
async function generateInsightFromLLM(finalPrompt) {
    try {
        const response = await axios.post(MISTRAL_URL, {
            model: MISTRAL_MODEL,
            messages: [
                { role: "user", content: finalPrompt }
            ],
            temperature: 0.5
        }, {
            headers: {
                'Authorization': `Bearer ${MISTRAL_API_KEY}`,
                'Content-Type': 'application/json'
            },
            timeout: 45000
        });

        const chatCompletion = response.data;
        return chatCompletion.choices[0]?.message?.content || "No insights could be generated from the data.";
    } catch (err) {
        console.error("Mistral API Error (Insight):", err.response?.data || err.message);
        throw new Error("Failed to generate Insights from AI Core.");
    }
}

module.exports = {
    generateSQLFromLLM,
    generateInsightFromLLM
};
