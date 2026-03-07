const express = require("express");
const { generateSQL, generateInsight } = require("../controllers/aiController");

const router = express.Router();

// Receives English Text / Translated English Text and outputs SQL
router.post("/generate-sql", generateSQL);

// Receives JSON data arrays and outputs a text-based analytical insight/summary
router.post("/generate-insight", generateInsight);

module.exports = router;
