const express = require("express");
const multer = require("multer");
const fs = require("fs");
const { generateSQL, generateInsight, extractMessage, transcribeVoice } = require("../controllers/aiController");
const { transcribeAudioWithLang } = require("../services/speech.service");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Intent Router & JSON Extractor (The Speed Engine & Validation Shield)
router.post("/extract", extractMessage);

// Audio transcription (The Ears) - supports multipart file ('audio' or 'file') OR base64 JSON
router.post("/transcribe", upload.any(), async (req, res, next) => {
    try {
        const uploadedFile = (req.files && req.files[0]) || req.file;
        if (uploadedFile) {
            const buffer = uploadedFile.buffer || fs.readFileSync(uploadedFile.path);
            const result = await transcribeAudioWithLang(buffer, uploadedFile.mimetype || "audio/webm");
            if (uploadedFile.path && fs.existsSync(uploadedFile.path)) {
                try { fs.unlinkSync(uploadedFile.path); } catch (e) {}
            }
            return res.json(result);
        }
        // Fallback to existing controller if called with JSON body from backend (e.g., Twilio audioUrl)
        return transcribeVoice(req, res, next);
    } catch (err) {
        console.error("[/transcribe Error]:", err.message);
        return res.status(500).json({ error: err.message || "Transcription failed" });
    }
});

// Receives English Text / Translated English Text and outputs SQL
router.post("/generate-sql", generateSQL);

// Receives JSON data arrays and outputs a text-based analytical insight/summary
router.post("/generate-insight", generateInsight);

module.exports = router;
