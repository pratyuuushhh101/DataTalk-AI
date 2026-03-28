/**
 * Speaker Diarization Controller
 * ================================
 * REST API controllers for speaker session management
 * and diarization operations.
 */

import {
    createSpeakerSession,
    diarizeAudio,
    getSessionState,
    endSpeakerSession,
    calibrateOwner,
    identifySpeakerRole,
    checkDiarizationHealth,
    enrollOwnerVoice,
    enrollOwnerEmbeddings,
    getOwnerSampleMeta
} from "../services/speakerSession.service.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Redis from "ioredis";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

/**
 * POST /speaker/session
 * Create a new speaker diarization session.
 */
export const createSession = async (req, res) => {
    try {
        const { sessionId } = req.body;
        const result = await createSpeakerSession(sessionId);

        console.log(`[Speaker] Session created: ${result.sessionId}`);
        res.json(result);
    } catch (err) {
        console.error("[Speaker] Session creation failed:", err.message);
        res.status(500).json({ error: "Failed to create speaker session" });
    }
};

/**
 * GET /speaker/session/:sessionId
 * Get current session state with speaker mappings.
 */
export const getSession = async (req, res) => {
    const { sessionId } = req.params;
    const state = getSessionState(sessionId);

    if (!state) {
        return res.status(404).json({ error: "Session not found" });
    }

    res.json(state);
};

/**
 * DELETE /speaker/session/:sessionId
 * End and cleanup a speaker session.
 */
export const deleteSession = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const result = await endSpeakerSession(sessionId);
        res.json(result);
    } catch (err) {
        console.error("[Speaker] Session deletion failed:", err.message);
        res.status(500).json({ error: "Failed to end session" });
    }
};

/**
 * POST /speaker/diarize
 * Send audio for diarization within an active session.
 *
 * Body (multipart/form-data):
 *   - sessionId: string
 *   - language: string (default "en-IN")
 *   - audio: file (WAV/OGG/WebM)
 *
 * OR Body (JSON with base64):
 *   - sessionId: string
 *   - language: string
 *   - audioBase64: string (base64-encoded audio)
 */
export const diarize = async (req, res) => {
    try {
        const { sessionId, language = "en-IN", audioBase64 } = req.body;

        if (!sessionId) {
            return res.status(400).json({ error: "sessionId is required" });
        }

        let audioBuffer;

        if (req.file) {
            // Multipart upload
            audioBuffer = req.file.buffer;
        } else if (audioBase64) {
            // Base64 encoded audio
            audioBuffer = Buffer.from(audioBase64, "base64");
        } else {
            return res.status(400).json({
                error: "Audio data required (file upload or audioBase64)",
            });
        }

        console.log(
            `[Speaker] Diarizing: session=${sessionId}, ` +
            `size=${Math.round(audioBuffer.length / 1024)}KB`
        );

        const result = await diarizeAudio(sessionId, audioBuffer, language);
        res.json(result);
    } catch (err) {
        console.error("[Speaker] Diarization failed:", err.message);
        res.status(500).json({ error: err.message });
    }
};

/**
 * POST /speaker/session/:sessionId/calibrate
 * Manually set which speaker is the owner.
 *
 * Body: { speakerId: "Speaker-1" }
 */
export const calibrate = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { speakerId } = req.body;

        if (!speakerId) {
            return res.status(400).json({ error: "speakerId is required" });
        }

        const result = await calibrateOwner(sessionId, speakerId);
        res.json(result);
    } catch (err) {
        console.error("[Speaker] Calibration failed:", err.message);
        res.status(500).json({ error: err.message });
    }
};

/**
 * GET /speaker/identify/:sessionId
 * Get the role of the most recent speaker (used by Voice Orchestrator).
 */
export const identify = async (req, res) => {
    const { sessionId } = req.params;
    const identity = identifySpeakerRole(sessionId);
    res.json(identity);
};

/**
 * GET /speaker/health
 * Check health of the diarization pipeline.
 */
export const healthCheck = async (req, res) => {
    try {
        const health = await checkDiarizationHealth();
        const statusCode = health.status === "healthy" ? 200 : 503;
        res.status(statusCode).json(health);
    } catch {
        res.status(503).json({ status: "unavailable" });
    }
};

/**
 * POST /speaker/enroll
 * Body (multipart/form-data):
 *   - shopId: string
 *   - samples: multiple audio files (min 3, max 5)
 */
export const enroll = async (req, res) => {
    try {
        const { shopId } = req.body;

        if (!shopId) {
            return res.status(400).json({ error: "shopId is required" });
        }

        if (!req.files || req.files.length < 3 || req.files.length > 5) {
            return res.status(400).json({ error: "Must upload exactly 3 to 5 audio samples" });
        }

        const audioBuffers = req.files.map(file => file.buffer);
        console.log(`[Speaker] Enrolling shop ${shopId} with ${audioBuffers.length} samples`);

        const result = await enrollOwnerVoice(shopId, audioBuffers);
        res.json(result);
    } catch (err) {
        console.error("[Speaker] Enrollment failed:", err.message);
        res.status(500).json({ error: err.message });
    }
};

/**
 * POST /speaker/enroll-owner
 * Body (JSON):
 *   - shopId: string
 *   - embeddings: array of arrays (float)
 *   - sampleCount: number
 *   - durations: array of numbers
 */
export const enrollOwnerJson = async (req, res) => {
    try {
        const { shopId = "default_shop", embeddings, sampleCount, durations } = req.body;

        let parsedEmbeddings = embeddings;
        let parsedDurations = durations;

        if (typeof embeddings === 'string') parsedEmbeddings = JSON.parse(embeddings);
        if (typeof durations === 'string') parsedDurations = JSON.parse(durations);

        if (!parsedEmbeddings || parsedEmbeddings.length < 3) {
            return res.status(400).json({ error: "Minimum 3 valid embeddings required" });
        }

        // ── 1. Save Audio Samples ──
        const dir = path.join(__dirname, "../../storage/voice-samples");
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        const savedSamples = [];
        if (req.files && req.files.length > 0) {
            req.files.forEach((file, index) => {
                const fileName = `sample_${Date.now()}_${index}.webm`;
                const filePath = path.join(dir, fileName);
                fs.writeFileSync(filePath, file.buffer);
                savedSamples.push({
                    fileName,
                    duration: parsedDurations[index] || 0,
                    createdAt: new Date().toISOString()
                });
            });

            // Store metadata to REDIS specifically for the UI Viewer
            await redis.set(`owner:${shopId}:voiceSamples`, JSON.stringify({ samples: savedSamples }));
        }

        console.log("✅ Owner voice enrolled for shopId:", shopId);
        console.log("Samples received:", parsedEmbeddings.length);
        if (savedSamples.length > 0) console.log("Audio Blobs Saved:", savedSamples.length);

        // ── 2. Run core embedding service logic ──
        const result = await enrollOwnerEmbeddings(shopId, parsedEmbeddings, sampleCount, parsedDurations);
        res.json(result);
    } catch (err) {
        console.error("[Speaker] JSON Enrollment failed:", err.message);
        res.status(500).json({ error: err.message });
    }
};

/**
 * GET /debug/owner-samples/:shopId
 * Fetch owner samples metadata
 */
export const getOwnerSamplesMeta = async (req, res) => {
    try {
        const { shopId } = req.params;
        const meta = await getOwnerSampleMeta(shopId);
        if (!meta) {
            return res.status(404).json({ error: "No enrollment found for this shopId" });
        }
        res.json(meta);
    } catch (err) {
        console.error("[Speaker] Failed to get generic owner samples:", err.message);
        res.status(500).json({ error: err.message });
    }
};

/**
 * GET /speaker/owner-samples/:shopId
 * Fetch list of enrolled audio samples for viewing
 */
export const getOwnerSamples = async (req, res) => {
    try {
        const data = await redis.get(`owner:${req.params.shopId}:voiceSamples`);
        if (!data) return res.json({ samples: [] });
        res.json(JSON.parse(data));
    } catch (err) {
        console.error("[Speaker] Get owner samples failed:", err.message);
        res.status(500).json({ error: err.message });
    }
};

/**
 * GET /speaker/sample/:fileName
 * Serve an individual sample audio file
 */
export const getSampleFile = async (req, res) => {
    try {
        const filePath = path.join(__dirname, "../../storage/voice-samples", req.params.fileName);
        if (!fs.existsSync(filePath)) {
            return res.status(404).send("Not found");
        }
        res.sendFile(filePath);
    } catch (err) {
        console.error("[Speaker] Get sample file failed:", err.message);
        res.status(500).json({ error: err.message });
    }
};

export default {
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
};
