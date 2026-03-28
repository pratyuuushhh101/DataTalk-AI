/**
 * Speaker Diarization Routes
 * ============================
 * REST API routes for speaker session management and diarization.
 *
 * Routes:
 *   POST   /speaker/session                    → Create session
 *   GET    /speaker/session/:sessionId          → Get session state
 *   DELETE /speaker/session/:sessionId          → End session
 *   POST   /speaker/diarize                     → Diarize audio chunk
 *   POST   /speaker/session/:sessionId/calibrate → Set owner manually
 *   GET    /speaker/identify/:sessionId         → Identify latest speaker role
 *   GET    /speaker/health                      → Pipeline health check
 */

import { Router } from "express";
import multer from "multer";
import {
    createSession,
    getSession,
    deleteSession,
    diarize,
    calibrate,
    identify,
    healthCheck,
    enroll,
    enrollOwnerJson,
    getOwnerSamplesMeta,
    getOwnerSamples,
    getSampleFile
} from "../controllers/speaker.controller.js";

const router = Router();

// Multer config for audio file uploads (in-memory, max 10MB)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// ── Session Management ──────────────────────────────────────────────────────
router.post("/session", createSession);
router.get("/session/:sessionId", getSession);
router.delete("/session/:sessionId", deleteSession);

// ── Diarization ─────────────────────────────────────────────────────────────
router.post("/diarize", upload.single("audio"), diarize);

// ── Enrollment ──────────────────────────────────────────────────────────────
router.post("/enroll", upload.array("samples", 5), enroll);
router.post("/enroll-owner", upload.array("samples", 5), enrollOwnerJson);
router.get("/owner-samples/:shopId", getOwnerSamples);
router.get("/sample/:fileName", getSampleFile);

// ── Calibration ─────────────────────────────────────────────────────────────
router.post("/session/:sessionId/calibrate", calibrate);

// ── Speaker Identification ──────────────────────────────────────────────────
router.get("/identify/:sessionId", identify);

// ── Health ──────────────────────────────────────────────────────────────────
router.get("/health", healthCheck);

// ── Debug ───────────────────────────────────────────────────────────────────
router.get("/debug/owner-samples/:shopId", getOwnerSamplesMeta);

export default router;
