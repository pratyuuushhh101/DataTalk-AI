const Groq = require("groq-sdk");

// Initialize Groq client (automatically picks up process.env.GROQ_API_KEY)
const groq = new Groq();

/**
 * Calls Groq (Llama 3) to convert prompt text to SQL.
 * @param {string} finalPrompt 
 * @returns {Promise<string>}
 */
async function generateSQLFromLLM(finalPrompt) {
    try {
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: "user",
                    content: finalPrompt,
                },
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0, // 0 for exact deterministic SQL
        });

        // Clean up markdown block format logic in case LLM disobeys rules
        let responseText = chatCompletion.choices[0]?.message?.content || "";
        responseText = responseText.replace(/```sql/gi, "").replace(/```/g, "").trim();

        return responseText;
    } catch (err) {
        console.error("Groq API Error (SQL):", err);
        throw new Error("Failed to generate SQL from AI Core.");
    }
}

/**
 * Calls Groq (Llama 3) to generate business insights from data.
 * @param {string} finalPrompt 
 * @returns {Promise<string>}
 */
async function generateInsightFromLLM(finalPrompt) {
    try {
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: "user",
                    content: finalPrompt,
                },
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.5,
        });

        return chatCompletion.choices[0]?.message?.content || "No insights could be generated from the data.";
    } catch (err) {
        console.error("Groq API Error (Insight):", err);
        throw new Error("Failed to generate Insights from AI Core.");
    }
}

module.exports = {
    generateSQLFromLLM,
    generateInsightFromLLM
};
