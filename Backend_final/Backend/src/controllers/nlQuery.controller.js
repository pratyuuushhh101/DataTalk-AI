import axios from "axios";
import { getReadPool } from "../config/db.js";

export const handleNLQuery = async (req, res) => {
  const { question } = req.body;

  if (!question) {
    return res.status(400).json({ error: "Question is required" });
  }

  try {
    // 1️⃣ Call AI Core to generate SQL
    const aiResponse = await axios.post(
      "http://localhost:8000/generate-sql",
      { question },
      { timeout: 15000 }
    );

    const { sql } = aiResponse.data;

    if (!sql) {
      return res.status(400).json({ error: "AI Core did not return SQL" });
    }

    // 2️⃣ Execute validated SQL safely
    let dataRows = [];
    try {
      const pool = getReadPool();
      const request = pool.request();
      request.timeout = 5000;

      const result = await request.query(sql);
      dataRows = result.recordset || [];
    } catch (dbError) {
      console.error("Database Query Error:", dbError.message);
      return res.status(400).json({
        error: "Failed to execute generated SQL against the database.",
        details: dbError.message
      });
    }

    // 3️⃣ Call AI Core again for insight generation
    let generatedInsight = "Insight generation failed or timed out.";

    try {
      const insightResponse = await axios.post(
        "http://localhost:8000/generate-insight",
        {
          question: question,
          data: dataRows.slice(0, 30)
        },
        { timeout: 60000 }
      );

      if (insightResponse.data && insightResponse.data.insight) {
        generatedInsight = insightResponse.data.insight;
      }

    } catch (aiError) {
      console.error("AI Insight Error:", aiError.message);
    }

    // 4️⃣ Return final response including insight
    return res.json({
      generatedSQL: sql,
      rowsReturned: dataRows.length,
      data: dataRows,
      insight: generatedInsight
    });

  } catch (err) {
    if (err.response) {
      // Forward the exact error and status sent by AI Core or another service
      return res.status(err.response.status).json({
        error: err.response.data.error || "Error from internal service"
      });
    }

    console.error("NL Query Error:", err);
    return res.status(500).json({
      error: err.message || "Internal Server Error"
    });
  }
};