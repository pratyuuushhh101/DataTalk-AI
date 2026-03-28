import express from "express";
import multer from "multer";
import {
    demoBilling,
    demoLowStock,
    demoMissedDemand,
    demoInsights,
    demoFounderKit,
    demoFounderScenarios,
    demoAudio,
    demoResetSession,
    demoGetSession,
    demoCameraSnapshot,
    demoCompare,
    demoRecentSales
} from "../controllers/demo.controller.js";
import { handleVoiceCommand } from "../controllers/voiceSession.controller.js";

const router = express.Router();

// ── Multer config for audio file parsing ──
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB max
});

router.post("/billing", demoBilling);
router.post("/low-stock", demoLowStock);
router.post("/missed-demand", demoMissedDemand);
router.get("/insights", demoInsights);
router.post("/founder-kit", demoFounderKit);
router.get("/founder-kit/scenarios", demoFounderScenarios);

// PORTED FROM 5050
router.post("/audio", demoAudio);
router.get("/session", demoGetSession);
router.post("/reset", demoResetSession);
router.post("/camera-snapshot", demoCameraSnapshot);
router.get("/compare", demoCompare);
router.get("/sales/recent", demoRecentSales);

// ORCHESTRATED API — accepts multipart/form-data with audio file
router.post("/voice-orchestrator", upload.single("audio"), handleVoiceCommand);

export default router;
