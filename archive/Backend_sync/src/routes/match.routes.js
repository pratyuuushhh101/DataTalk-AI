import express from "express";
import {
    handleAudio, handleCV, handleDetect, handleCompute,
    handleCompare, handleReset, handleMissedDemand,
    handleGetSession, handleCameraSnapshot, handleTestWhatsapp
} from "../controllers/match.controller.js";

const router = express.Router();

// CV (Vision) Data
router.post("/cv", handleCV);
router.post("/cv/detect", handleDetect);
router.post("/camera-snapshot", handleCameraSnapshot);

// Audio (Voice) Data
router.post("/audio", handleAudio);

// Process Totals
router.post("/compute", handleCompute);

// Final Theft / Discrepancy Detection
router.post("/compare", handleCompare);

// Session Reset
router.post("/reset", handleReset);

// Missed Demand Log
router.post("/missed-demand", handleMissedDemand);
router.get("/session", handleGetSession);

// Twilio Diagnostic
router.post("/test-whatsapp", handleTestWhatsapp);

export default router;
