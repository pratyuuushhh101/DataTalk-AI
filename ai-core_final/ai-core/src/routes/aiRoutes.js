const express = require("express");
const { generateSQL, generateInsight, extractMessage, transcribeVoice } = require("../controllers/aiController");

const router = express.Router();

// Intent Router & JSON Extractor (The Speed Engine & Validation Shield)
router.post("/extract", extractMessage);

// Audio transcription (The Ears)
router.post("/transcribe", transcribeVoice);

// Receives English Text / Translated English Text and outputs SQL
router.post("/generate-sql", generateSQL);

// Receives JSON data arrays and outputs a text-based analytical insight/summary
router.post("/generate-insight", generateInsight);

module.exports = router;
