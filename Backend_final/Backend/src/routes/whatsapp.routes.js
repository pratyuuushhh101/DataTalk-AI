import express from "express";
import { handleWhatsAppWebhook } from "../controllers/whatsapp.controller.js";

const router = express.Router();

// Twilio sends a POST request to this endpoint when a WhatsApp message arrives.
// No auth middleware — Twilio signs its requests, but for dev/demo we keep it open.
router.post("/webhook", handleWhatsAppWebhook);

// Health check — useful for testing ngrok connectivity
router.get("/health", (req, res) => {
    res.json({ status: "WhatsApp webhook is live ✅" });
});

export default router;
