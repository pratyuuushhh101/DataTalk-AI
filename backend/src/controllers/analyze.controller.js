import axios from "axios";
import { validateSQL, executeValidatedSQL } from "../services/analyze.service.js";

export const handleAnalyzeQuery = async (req, res) => {
  const { question } = req.body;

  if (!question) {
    return res.status(400).json({ error: "Question is required" });
  }

  try {
    // 1️⃣ Send to AI-core -> get SQL
    const aiResponse = await axios.post(
      "http://localhost:8000/generate-sql",
      { question },
      { timeout: 15000 }
    );

    const { sql } = aiResponse.data;

    if (!sql) {
      return res.status(400).json({ error: "AI Core did not return SQL" });
    }

    // 2️⃣ Validate SQL
    let validatedSQL;
    try {
      validatedSQL = validateSQL(sql);
    } catch (valErr) {
      return res.status(400).json({ error: valErr.message });
    }

    // 3️⃣ Execute validated SQL
    let data;
    try {
      data = await executeValidatedSQL(validatedSQL);
    } catch (dbError) {
      return res.status(400).json({
        error: "Failed to execute query",
        details: dbError.message
      });
    }

    // 4️⃣ Send SQL result to AI-core for insight
    let insight = "Insight generation failed or timed out.";
    try {
      const insightResponse = await axios.post(
        "http://localhost:8000/generate-insight",
        {
          question,
          data: data.slice(0, 30) // Limit rows to avoid max-token exceptions
        },
        { timeout: 60000 }
      );

      if (insightResponse.data && insightResponse.data.insight) {
        insight = insightResponse.data.insight;
      }
    } catch (aiError) {
      console.error("AI Insight Error:", aiError.message);
    }

    // 5️⃣ Return final response
    return res.json({
      sql: validatedSQL,
      data,
      insight
    });

  } catch (err) {
    console.error("Analyze Controller Error:", err.message);
    
    if (err.response) {
      return res.status(err.response.status).json({
        error: err.response.data.error || "Error from internal AI service"
      });
    }

    return res.status(500).json({ error: "Internal Server Error" });
  }
};
