import express from "express";
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

// ORCHESTRATED API
router.post("/voice-orchestrator", handleVoiceCommand);

export default router;
