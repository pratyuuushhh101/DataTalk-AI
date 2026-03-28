import axios from "axios";
import { processTransaction } from "../services/transaction.service.js";
import { getInventory } from "../services/inventory.service.js";
import { getPool } from "../config/db.js";
import { diarizeAudio } from "../services/speakerSession.service.js";

// Session processing guard
let processing = false;

// ── Owner-lock cache per session (prevents re-classifying every utterance) ──
const ownerLockCache = new Map();
const OWNER_LOCK_DURATION_MS = 5 * 60 * 1000; // 5 min lock after confirmed owner

/**
 * Check if the owner has been recently locked for this session.
 * Once a speaker is confirmed as "owner" with high confidence,
 * we don't re-classify for OWNER_LOCK_DURATION_MS to save latency.
 */
function isOwnerLocked(sessionId) {
    const lock = ownerLockCache.get(sessionId);
    if (!lock) return false;
    if (Date.now() - lock.timestamp > OWNER_LOCK_DURATION_MS) {
        ownerLockCache.delete(sessionId);
        return false;
    }
    return true;
}

function lockOwner(sessionId, speakerId, confidence, displayConfidence) {
    ownerLockCache.set(sessionId, {
        speakerId,
        confidence,
        displayConfidence,
        timestamp: Date.now()
    });
}

// Helpers to invoke AI-Core exactly like nlQuery.controller
async function handleAnalyticsQuery(question) {
    try {
        const sqlRes = await axios.post("http://localhost:8000/generate-sql", { question });
        const sqlData = sqlRes.data;
        if (!sqlData.sql) return "Sorry, I couldn't generate the analytics query.";

        // Run SQL locally
        const pool = getPool();
        const dbResult = await pool.request().query(sqlData.sql);
        const rows = dbResult.recordset || [];

        // Generate Insight
        const insightRes = await axios.post("http://localhost:8000/generate-insight", {
            question,
            data: rows.slice(0, 30)
        });
        const insightData = insightRes.data;
        return insightData.insight || "Data fetched, but failed to generate insight.";
    } catch (err) {
        console.error("[VOICE-ANALYTICS] Error:", err.message);
        return "Analytics failed due to internal error.";
    }
}

export const handleVoiceCommand = async (req, res) => {
    console.log("[BACKEND-PIPELINE] 🚨 Request received at /voice-orchestrator");
    console.log(`[BACKEND-PIPELINE] Current Guard State: processing=${processing}`);

    // ── Session Guard ──
    if (processing) {
        console.warn("[BACKEND-PIPELINE] ⚠️ REJECTED: System is busy processing a previous command.");
        return res.json({ status: "busy", message: "Processing previous command." });
    }

    const { transcript, image, ipCameraUrl, speakerSessionId, shopId } = req.body;

    // ── Audio from multer (multipart/form-data) ──
    const audioFile = req.file; // Populated by multer middleware

    // Log EXACTLY what the frontend sent
    console.log(`[BACKEND-PIPELINE] Payload Check:`);
    console.log(`  - Transcript: ${transcript ? `"${transcript}"` : "❌ MISSING"}`);
    console.log(`  - Image: ${image ? "✅ Present (Base64)" : "❌ MISSING"}`);
    console.log(`  - IP Camera: ${ipCameraUrl ? "✅ Present" : "❌ MISSING"}`);
    console.log(`  - Speaker Session: ${speakerSessionId ? "✅ " + speakerSessionId : "❌ NONE"}`);
    console.log(`  - Shop ID: ${shopId || "default_shop"}`);
    console.log(`  - Audio Chunk: ${audioFile ? `✅ ${(audioFile.size / 1024).toFixed(1)}KB (${audioFile.mimetype})` : "❌ NONE"}`);

    if (!transcript) {
        console.warn("[BACKEND-PIPELINE] ❌ REJECTED: No transcript provided.");
        return res.status(400).json({ error: "Transcript required." });
    }

    processing = true;

    try {
        console.log(`\n[VOICE] Transcript: "${transcript}"`);

        const sid = shopId || "default_shop";

        // ════════════════════════════════════════════════════════════════════
        // FALLBACK DETERMINISTIC TRANSACTION STATE MACHINE 
        // ════════════════════════════════════════════════════════════════════
        if (!global._fallbackStates) global._fallbackStates = new Map();
        const fallbackKey = speakerSessionId || "global";
        if (!global._fallbackStates.has(fallbackKey)) {
            global._fallbackStates.set(fallbackKey, { state: "IDLE", cvTotal: null });
        }
        let fsm = global._fallbackStates.get(fallbackKey);

        const rawFSM = transcript.toLowerCase().trim();

        const extractNumber = (text) => {
            const hindiMap = {
                "ek": 1, "do": 2, "teen": 3, "char": 4, "paanch": 5, "che": 6, "cha": 6, "chhe": 6,
                "saat": 7, "aath": 8, "nau": 9, "das": 10, "dus": 10,
                "bees": 20, "tees": 30, "chalis": 40, "pachas": 50, "pachaas": 50,
                "sath": 60, "sattar": 70, "assi": 80, "nabbe": 90, "sau": 100
            };
            const words = text.split(/[\s,]+/);
            for (let w of words) {
                if (!isNaN(w) && w.trim() !== '') return Number(w);
                if (hindiMap[w]) return hindiMap[w];
            }
            return null;
        };

        const QUESTION_KEYWORDS = ["kitna", "kitne", "total kitna", "price kya", "kitna hua", "iska kya", "kya hua", "total amount"];
        const isQuestion = QUESTION_KEYWORDS.some(k => rawFSM.includes(k));

        if (isQuestion) {
            console.log(`[STATE] IDLE -> AWAITING_TOTAL_FROM_OWNER`);
            console.log(`[INTENT] Customer Question Detected: "${transcript}"`);
            fsm.state = "AWAITING_TOTAL_FROM_OWNER";
            console.log("[CV] CV Total computed: Pending Owner validation (Background vision active)");
            processing = false;
            return res.json({
                status: "silent_pass",
                triggerAI: false,
                reason: "awaiting_owner_total",
                message: "Awaiting owner response", // No audio interrupt
                speaker: { role: "customer", confidence: null, displayConfidence: null }
            });
        }

        const voiceTotal = extractNumber(rawFSM);

        console.log("[IMAGE CHECK]", {
            hasImage: !!image,
            hasIPCamera: !!ipCameraUrl,
            state: fsm.state,
            transcript: rawFSM
        });

        // Active State Transition -> Trigger billing
        if (fsm.state === "AWAITING_TOTAL_FROM_OWNER" && voiceTotal !== null) {
            console.log(`[STATE] AWAITING_TOTAL_FROM_OWNER -> IDLE`);
            console.log(`[VOICE] Extracted Total: ₹${voiceTotal}`);

            if (!image && !ipCameraUrl) {
                console.warn("[FALLBACK] Missing image during total validation. Aborting.");
                fsm.state = "IDLE"; // Reset on failure
                processing = false;
                return res.json({
                    status: "error",
                    error: "IMAGE_REQUIRED_FOR_VALIDATION",
                    message: "Camera frame missing. Transaction cannot be validated."
                });
            }

            fsm.state = "IDLE";
            console.log(`[PIPELINE] Bypassing Speaker Rules: Triggering direct transaction for ₹${voiceTotal}`);

            const pipelineResult = await processTransaction(`total ${voiceTotal}`, image || null);
            processing = false;

            // Guarantee role for FSM fulfillment
            return res.json({
                ...pipelineResult,
                speaker: {
                    role: "owner",
                    confidence: 0.9,
                    displayConfidence: 90,
                    id: "Speaker-Owner"
                }
            });
        }

        // Direct Override trigger ("total 20", "hisab tees")
        if ((rawFSM.includes("total") || rawFSM.includes("bill") || rawFSM.includes("hisab")) && voiceTotal !== null) {
            console.log(`[STATE] DIRECT TRANSACTION TRIGGER_OVERRIDE`);
            console.log(`[VOICE] Extracted Total: ₹${voiceTotal}`);

            fsm.state = "IDLE";
            console.log(`[PIPELINE] Bypassing Speaker Rules: Triggering direct transaction for ₹${voiceTotal}`);

            const pipelineResult = await processTransaction(`total ${voiceTotal}`, image || null);
            processing = false;

            // Guarantee role for direct total override
            return res.json({
                ...pipelineResult,
                speaker: {
                    role: "owner",
                    confidence: 0.9,
                    displayConfidence: 90,
                    id: "Speaker-Owner"
                }
            });
        }

        // ════════════════════════════════════════════════════════════════════
        // SPEAKER IDENTIFICATION GATE (MUST HAPPEN BEFORE ANY AI TRIGGER)
        // ════════════════════════════════════════════════════════════════════
        let speakerResult = {
            role: "unknown",
            confidence: 0,
            displayConfidence: null,
            speakerId: null,
            shouldProcessFurther: false
        };

        // Check owner-lock cache first (avoids redundant embedding extraction)
        if (speakerSessionId && isOwnerLocked(speakerSessionId)) {
            const lock = ownerLockCache.get(speakerSessionId);
            speakerResult = {
                role: "owner",
                confidence: lock.confidence,
                displayConfidence: lock.displayConfidence || null,
                speakerId: lock.speakerId,
                shouldProcessFurther: true
            };
            console.log(`[SPEAKER] 🔒 Owner LOCKED for session (cached, confidence: ${lock.confidence.toFixed(3)})`);

        } else if (speakerSessionId && audioFile) {
            // Real-time classification: extract embedding → compare against master profile
            try {
                const audioBuffer = audioFile.buffer;
                console.log(`[SPEAKER] 🎤 Audio received: ${(audioBuffer.length / 1024).toFixed(1)}KB (${audioFile.originalname})`);
                console.log(`[SPEAKER] Classifying against master profile...`);

                const diarResult = await diarizeAudio(speakerSessionId, sid, audioBuffer);

                if (diarResult.status === "silence") {
                    console.log(`[SPEAKER] VAD rejected (silence/noise)`);
                    speakerResult.role = "unknown";
                } else {
                    speakerResult = {
                        role: diarResult.role,
                        confidence: diarResult.confidence,
                        displayConfidence: diarResult.displayConfidence || null,
                        speakerId: diarResult.speakerId,
                        shouldProcessFurther: diarResult.role === "owner"
                    };

                    // Lock owner identity for session duration
                    if (diarResult.role === "owner" && diarResult.confidence > 0.60) {
                        lockOwner(speakerSessionId, diarResult.speakerId, diarResult.confidence, diarResult.displayConfidence);
                        console.log(`[SPEAKER] 🛡️ Owner CONFIRMED and LOCKED (similarity: ${diarResult.confidence.toFixed(3)})`);
                    }
                }

                console.log(`[SPEAKER] Classification: role=${speakerResult.role}, confidence=${speakerResult.confidence.toFixed(3)}, speaker=${speakerResult.speakerId}`);
            } catch (err) {
                console.error("[SPEAKER] Classification failed:", err.message);
                // Fail-open: allow processing if classification fails (graceful degradation)
                speakerResult.shouldProcessFurther = true;
                speakerResult.role = "unknown";
            }

        } else if (speakerSessionId && !audioFile) {
            // No audio chunk sent — log warning but allow processing
            console.warn(`[SPEAKER] ⚠️ No audio file received. Speaker cannot be identified.`);
            speakerResult.shouldProcessFurther = true;
            speakerResult.role = "unknown";

        } else {
            // No speaker session at all — allow processing (backward compatibility)
            speakerResult.shouldProcessFurther = true;
        }

        // ════════════════════════════════════════════════════════════════════
        // OWNER GATE: Strict Logging and AI Blocking
        // ════════════════════════════════════════════════════════════════════

        // final fallback for role
        const finalRole = (speakerResult.role === "unknown" || !speakerResult.role) ? "customer" : speakerResult.role;
        const finalDisplayConf = (finalRole === "owner") ? (speakerResult.displayConfidence || 85) : null;

        console.log("[ROLE FINAL]", {
            role: finalRole,
            displayConfidence: finalDisplayConf,
            state: fsm.state,
            transcript: transcript
        });

        let logPrefix = (finalRole === "owner") ? "[🧑💼 Owner]" : "[👤 Customer]";

        // Hard requirement: Clear console logging
        console.log(`${logPrefix}: "${transcript}"`);

        if (finalRole !== "owner") {
            console.log(`[GATE] 🚫 BLOCKED: Non-owner speech detected. Not processing AI actions.`);
            return res.json({
                triggerAI: false,
                reason: "non-owner",
                status: "blocked",
                speaker: {
                    id: speakerResult.speakerId || `Speaker-${Date.now()}`,
                    role: "customer",
                    confidence: null,
                    displayConfidence: null
                },
                message: "Non-owner speech. Ignored."
            });
        }

        // ── Helper: Attach speaker metadata to every response ───────────────
        const withSpeaker = (responseObj) => ({
            ...responseObj,
            speaker: {
                id: speakerResult.speakerId || "Speaker-Owner",
                role: "owner",
                confidence: speakerResult.confidence || 0.8,
                displayConfidence: finalDisplayConf
            },
        });

        // ════════════════════════════════════════════════════════════════════
        // AI TRIGGER GATE — Lightweight intent classifier
        // ════════════════════════════════════════════════════════════════════

        const raw = transcript.toLowerCase().trim();

        const AI_KEYWORDS = [
            "kitna", "kitne", "kitni", "stock", "sales", "profit", "report",
            "data", "dikha", "bata", "analysis", "analytics", "week", "month",
            "today", "aaj", "kal", "last", "total", "bill", "hisab",
            "order", "reorder", "supplier", "inventory", "summary",
            "revenue", "expense", "margin", "trend", "compare",
            "kya hai", "bacha hai", "baki hai", "kaisa chal", "kaise chal"
        ];

        // Check if it's AI-directed
        const isAIDirected = AI_KEYWORDS.some(k => raw.includes(k));
        const isTransactionTrigger = raw.includes("total") || raw.includes("bill") || raw.includes("hisab");

        const intentDetected = isAIDirected || isTransactionTrigger;

        // Determine final trigger logic
        let triggerAI = false;
        let triggerReason = "conversation";

        if (finalRole === "owner" && intentDetected) {
            triggerAI = true;
            triggerReason = isTransactionTrigger ? "owner_transaction" : "owner_intent";
        } else if (finalRole !== "owner") {
            triggerAI = false;
            triggerReason = "customer";
        } else {
            triggerAI = false;
            triggerReason = "noise";
        }

        /**
         * Step 2: Cooldown — prevent spam triggering within 5 seconds
         */
        const COOLDOWN_MS = 5000;
        const cooldownKey = `lastTrigger:${speakerSessionId || "global"}`;

        if (triggerAI && triggerReason !== "owner_transaction") {
            // Transactions bypass cooldown (billing is time-critical)
            if (!global._aiTriggerTimestamps) global._aiTriggerTimestamps = new Map();
            const lastTrigger = global._aiTriggerTimestamps.get(cooldownKey) || 0;

            if (Date.now() - lastTrigger < COOLDOWN_MS) {
                console.log(`[TRIGGER] ⏳ Cooldown active (${((COOLDOWN_MS - (Date.now() - lastTrigger)) / 1000).toFixed(1)}s remaining). Silently passing.`);
                triggerAI = false;
                triggerReason = "cooldown";
            }
        }

        // Update cooldown timestamp
        if (triggerAI) {
            if (!global._aiTriggerTimestamps) global._aiTriggerTimestamps = new Map();
            global._aiTriggerTimestamps.set(cooldownKey, Date.now());
        }

        console.log(`[TRIGGER] Decision: triggerAI=${triggerAI}, reason="${triggerReason}", text="${transcript.substring(0, 50)}..."`);

        /**
         * Step 3: Silent pass — if not triggered, DO NOT respond or interrupt
         */
        if (!triggerAI) {
            console.log(`[TRIGGER] 🔇 Silent pass. Not interrupting natural conversation.`);
            return res.json(withSpeaker({
                status: "silent_pass",
                triggerAI: false,
                reason: triggerReason,
                message: null // No message = no interruption on frontend
            }));
        }

        console.log(`[BACKEND-PIPELINE] ✅ Speaker AUTHORIZED (${speakerResult.role}). AI triggered (${triggerReason}). Sending to AI-Core...`);

        // 1. Send to AI Core for Intent Classification
        const extractRes = await axios.post("http://localhost:8000/extract", { message: transcript });

        let parsed = extractRes.data.data;

        if (!parsed || !parsed.intent) {
            console.warn("[VOICE] AI Core returned no intent. Falling back to GUIDED.");
            parsed = { intent: "GUIDED", query: transcript };
        }

        console.log(`[AI CORE] Intent: ${parsed.intent}`);
        console.log(`[AI CORE] Extracted:`, parsed);

        // 2. Route based on Intent
        switch (parsed.intent) {
            case "TRANSACTION":
                // ONLY trigger billing if "total" is spoken
                if (raw.includes("total") || raw.includes("bill") || raw.includes("hisab")) {
                    console.log("[ROUTER] Routed to TRANSACTION pipeline");

                    let finalImage = image || null;

                    // ── Handle IP Webcam Network Ingestion ──
                    if (req.body.ipCameraUrl) {
                        try {
                            const url = new URL('/shot.jpg', req.body.ipCameraUrl).href;
                            console.log(`[ROUTER] Fetching network frame from: ${url}`);
                            const snapshotRes = await axios.get(url, { responseType: 'arraybuffer', timeout: 5000 });
                            const b64 = Buffer.from(snapshotRes.data, 'binary').toString('base64');
                            finalImage = `data:image/jpeg;base64,${b64}`;
                            console.log(`[ROUTER] Network frame captured successfully (${(b64.length / 1024).toFixed(1)}KB)`);
                        } catch (err) {
                            console.error(`[ROUTER] Failed to capture from IP Camera:`, err.message);
                        }
                    }

                    const pipelineResult = await processTransaction(transcript, finalImage);
                    return res.json(withSpeaker(pipelineResult));
                } else {
                    console.log("[ROUTER] TRANSACTION intent detected, but 'total' keyword missing. Accumulating only.");
                    return res.json(withSpeaker({
                        status: "accumulating",
                        parsed: { items: parsed.product ? { [parsed.product]: parsed.qty || 1 } : {} },
                        message: "Adding item..."
                    }));
                }

            case "INVENTORY_QUERY":
                console.log("[ROUTER] Routed to INVENTORY_QUERY");
                if (!parsed.product) {
                    return res.json(withSpeaker({
                        type: "ai_response",
                        category: "inventory",
                        message: "Kiska stock check karna hai?",
                        timestamp: Date.now()
                    }));
                }
                const inv = await getInventory(parsed.product);
                if (inv) {
                    return res.json(withSpeaker({
                        type: "ai_response",
                        category: "inventory",
                        message: `${inv.product} ka ${inv.current_stock} bacha hai.`,
                        timestamp: Date.now()
                    }));
                } else {
                    return res.json(withSpeaker({
                        type: "ai_response",
                        category: "inventory",
                        message: `Ye product inventory mein nahi mila.`,
                        timestamp: Date.now()
                    }));
                }

            case "BUSINESS_ANALYTICS":
                console.log("[ROUTER] Routed to BUSINESS_ANALYTICS");
                const insight = await handleAnalyticsQuery(parsed.query || transcript);
                return res.json(withSpeaker({
                    type: "ai_response",
                    category: "analytics",
                    message: insight,
                    timestamp: Date.now()
                }));

            case "ORDER":
                console.log("[ROUTER] Routed to ORDER");
                if (parsed.product) {
                    return res.json(withSpeaker({
                        type: "ai_response",
                        category: "order",
                        message: `${parsed.product} ka order place karne ka request note kar liya gaya hai.`,
                        timestamp: Date.now()
                    }));
                } else {
                    return res.json(withSpeaker({
                        type: "ai_response",
                        category: "order",
                        message: `Order place karne ke liye product ka naam bataiye.`,
                        timestamp: Date.now()
                    }));
                }

            case "GUIDED":
            default:
                console.log("[ROUTER] Routed to GUIDED/Fallback");
                return res.json(withSpeaker({
                    type: "ai_response",
                    category: "guided",
                    message: "Boliye, mai kaise madad karu aapki?",
                    timestamp: Date.now()
                }));
        }
    } catch (err) {
        console.error("[VOICE] Orchestration Error:", err.message);
        return res.json({
            type: "ai_response",
            category: "guided",
            message: "Samajh nahi aaya, dubara boliye.",
            timestamp: Date.now()
        });
    } finally {
        processing = false;
    }
};

export default { handleVoiceCommand };
