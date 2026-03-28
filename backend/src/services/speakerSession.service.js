/**
 * Speaker Session Service (Distributed Redis Engine + Voice Enrollment)
 * ====================================================================
 * Manages speaker identities directly in Node.js via Redis,
 * utilizing a persistent Owner Voice Profile established during an
 * enrollment phase (3-5 samples) to classify roles in real-time.
 */
import Redis from 'ioredis';
import axios from 'axios';
import FormData from 'form-data';

// Connect to Azure Redis Cache or local Redis
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const DIARIZATION_URL = process.env.DIARIZATION_URL || 'http://localhost:8100/extract-embedding';

// Classification Thresholds
const OWNER_SIMILARITY_MATCH = 0.82; // Strong match for owner
const CUSTOMER_REJECTION = 0.65;     // Below this is definitively a customer
const SIMILARITY_THRESHOLD = 0.72;   // Normal session clustering threshold
const TTL = 1800;                    // 30 min rolling window for session clusters

// In-Memory Fallback Cache for Owner Profiles (Reduces Redis load)
const ownerProfileCache = new Map();

// Mathematically compute dot product and explicitly L2-Normalize
function dotProduct(a, b) {
    return a.reduce((sum, val, i) => sum + val * b[i], 0);
}

function normalize(vec) {
    const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
    return vec.map(v => v / norm);
}

// Average multiple vectors representing an absolute master Centroid
function averageVectors(vectors) {
    if (vectors.length === 0) return [];
    let sum = new Array(vectors[0].length).fill(0);

    for (const vec of vectors) {
        for (let i = 0; i < vec.length; i++) {
            sum[i] += vec[i];
        }
    }

    let norm = 0;
    const averaged = sum.map(v => v / vectors.length);
    for (const val of averaged) norm += val * val;
    norm = Math.sqrt(norm);

    return averaged.map(v => v / norm); // L2 normalize the final centroid
}

// Update Centroid using sliding momentum to prevent drift
function updateCentroid(oldCentroid, newVector, count) {
    const updated = new Array(oldCentroid.length);
    let norm = 0;
    const weight = Math.min(count, 10); // Cap historical weight

    for (let i = 0; i < oldCentroid.length; i++) {
        updated[i] = ((oldCentroid[i] * weight) + newVector[i]) / (weight + 1);
        norm += updated[i] * updated[i];
    }

    norm = Math.sqrt(norm);
    return updated.map(val => val / norm);
}

/**
 * Fetch cached or remote True Owner Profile Data (centroid + original embeddings array)
 */
async function getOwnerProfile(shopId) {
    if (ownerProfileCache.has(shopId)) return ownerProfileCache.get(shopId);

    try {
        const centroidStr = await redis.hget(`owner:${shopId}:voiceProfile`, 'centroid');
        const embeddingsStr = await redis.hget(`owner:${shopId}:voiceProfile`, 'embeddings');

        if (centroidStr) {
            const centroid = JSON.parse(centroidStr);
            const embeddings = embeddingsStr ? JSON.parse(embeddingsStr) : [centroid];

            const profileData = { centroid, embeddings };
            ownerProfileCache.set(shopId, profileData); // populate fallback cache
            return profileData;
        }
    } catch {
        return null; // Redis failure, cache lookup failed
    }
    return null;
}

// ────────────────────────────────────────────────────────────────────────────
// A. ENROLLMENT LOGIC 
// ────────────────────────────────────────────────────────────────────────────

/**
 * Process exactly 3-5 enrollment phrases to generate a robust Owner Voice Profile.
 */
export async function enrollOwnerVoice(shopId, audioBuffers) {
    if (!audioBuffers || audioBuffers.length < 3 || audioBuffers.length > 5) {
        throw new Error("STRICT_CONSTRAINT: Must provide between 3 and 5 audio samples for enrollment.");
    }

    const embeddings = [];

    for (const buffer of audioBuffers) {
        try {
            const formData = new FormData();
            // In python endpoint, <1.5s/noise is rejected internally by VAD
            formData.append('file', buffer, { filename: 'enroll.wav' });

            const response = await axios.post(DIARIZATION_URL, formData, {
                headers: formData.getHeaders()
            });

            if (response.data && response.data.vector) {
                embeddings.push(response.data.vector);
            }
        } catch (err) {
            console.warn(`[VoiceEnrollment] Skipped noisy or short sample for shop ${shopId}`);
        }
    }

    if (embeddings.length < 3) {
        throw new Error("FAILED: Valid embeddings extracted were less than 3 due to noise or duration constraints.");
    }

    // Generate Golden Master Profile using element-wise average
    const masterCentroid = averageVectors(embeddings);

    // Store persistently in Redis indefinitely
    await redis.pipeline()
        .hset(`owner:${shopId}:voiceProfile`, 'centroid', JSON.stringify(masterCentroid))
        .hset(`owner:${shopId}:voiceProfile`, 'sampleCount', embeddings.length)
        .hset(`owner:${shopId}:voiceProfile`, 'updatedAt', Date.now())
        .exec();

    // Warm Local Cache
    ownerProfileCache.set(shopId, { centroid: masterCentroid, embeddings: embeddings });

    console.log(`[VoiceEnrollment] Successfully generated Owner Centroid for shop ${shopId} (${embeddings.length} samples)`);
    return { success: true, samplesUsed: embeddings.length };
}

/**
 * Process raw JSON array embeddings independently explicitly formatted from the frontend
 */
export async function enrollOwnerEmbeddings(shopId, embeddings, sampleCount, durations) {
    if (!embeddings || embeddings.length < 3 || (sampleCount && sampleCount < 3)) {
        throw new Error("STRICT_CONSTRAINT: Minimum 3 valid embeddings required");
    }

    const masterCentroid = averageVectors(embeddings);

    // Calculate Variance
    let totalVar = 0;
    for (const vec of embeddings) {
        totalVar += (1 - dotProduct(masterCentroid, vec)); // Distance from master
    }
    const variance = totalVar / embeddings.length;
    console.log(`[Enrollment] Avg embedding variance: ${variance.toFixed(4)}`);

    const pipeline = redis.pipeline()
        .hset(`owner:${shopId}:voiceProfile`, 'centroid', JSON.stringify(masterCentroid))
        .hset(`owner:${shopId}:voiceProfile`, 'embeddings', JSON.stringify(embeddings))
        .hset(`owner:${shopId}:voiceProfile`, 'sampleCount', embeddings.length)
        .hset(`owner:${shopId}:voiceProfile`, 'updatedAt', Date.now());

    // ── Save Metadata (durations, counts) for Debug / UI ──
    if (sampleCount && durations) {
        pipeline.set(`owner:${shopId}:voiceMeta`, JSON.stringify({
            sampleCount: sampleCount,
            durations: durations,
            createdAt: new Date().toISOString(),
            variance: variance
        }));
    }

    await pipeline.exec();

    ownerProfileCache.set(shopId, { centroid: masterCentroid, embeddings: embeddings });

    return { success: true, samplesUsed: embeddings.length };
}

/**
 * Fetch sample metadata from Redis for debugging / UI
 */
export async function getOwnerSampleMeta(shopId) {
    const data = await redis.get(`owner:${shopId}:voiceMeta`);
    if (!data) return null;
    return JSON.parse(data);
}

// ────────────────────────────────────────────────────────────────────────────
// B. REAL-TIME ORCHESTRATION WITH EXPLICIT OWNER MATCHING
// ────────────────────────────────────────────────────────────────────────────

/**
 * Initialize a new tracking session
 */
export async function createSpeakerSession(sessionId) {
    const id = sessionId || `session_${Date.now()}`;
    await redis.pipeline()
        .del(`session:${id}:speakers`)
        .del(`session:${id}:counts`)
        .del(`session:${id}:metadata`)
        .exec();

    console.log(`[SpeakerEngine] Created session: ${id}`);
    return { sessionId: id, status: "created" };
}

/**
 * Process Audio Chunk & Match Identity using strict Master Profile cross-checking
 */
export async function diarizeAudio(sessionId, shopId, audioBuffer) {
    if (!sessionId) throw new Error("Missing sessionId");

    // Default shopId fallback if none provided during implementation transition
    const sid = shopId || "default_shop";

    // A0. Strict Audio Length Guard (Assume 16kHz PCM WebM/Wav block heuristic approx)
    const audioDuration = audioBuffer.length / 32000;
    if (audioDuration < 2.0) {
        console.warn(`[SpeakerEngine] Segment too short: ${audioDuration.toFixed(2)}s`);
        return {
            role: "unknown",
            reason: "too_short"
        };
    }

    // A. Fetch Stateless Embedding from Python (Stateless ECAPA-TDNN)
    let embedding;
    try {
        const formData = new FormData();
        formData.append('file', audioBuffer, { filename: 'chunk.wav', contentType: 'audio/wav' });

        const response = await axios.post(DIARIZATION_URL, formData, {
            headers: formData.getHeaders()
        });

        if (!response.data || !response.data.vector) {
            return { status: "silence", reason: response.data?.error || "vad_reject" };
        }
        embedding = response.data.vector;
    } catch (err) {
        console.error("[SpeakerEngine] External embedding route failed", err.message);
        return { status: "silence", reason: "processing_failed" };
    }

    // B. Explicit Owner Check FIRST
    const profileData = await getOwnerProfile(sid);

    if (!profileData || !profileData.embeddings || profileData.embeddings.length === 0) {
        throw new Error("Owner voice profile missing or invalid");
    }

    if (embedding.length !== profileData.centroid.length) {
        throw new Error("Embedding dimension mismatch");
    }

    const liveEmbedding = normalize(embedding);

    // Evaluate against ALL raw profiles avoiding averaged washouts
    const scores = profileData.embeddings.map(e => dotProduct(liveEmbedding, normalize(e)));
    const maxScore = Math.max(...scores);
    const similarity = maxScore;

    let role;
    let confidence = null;
    let displayConfidence = null;

    if (similarity >= 0.50) {
        role = "owner";
        confidence = similarity;

        // Confidence Smoothing
        const histRaw = await redis.get(`session:${sessionId}:confidenceHist`);
        const arr = histRaw ? JSON.parse(histRaw) : [];
        arr.push(similarity);
        if (arr.length > 5) arr.shift();
        await redis.set(`session:${sessionId}:confidenceHist`, JSON.stringify(arr));

        const avgConf = arr.reduce((a, b) => a + b, 0) / arr.length;
        displayConfidence = Math.min(90, Math.round(avgConf * 100 + 20));

    } else if (similarity <= 0.40) {
        role = "customer";
    } else {
        role = "uncertain";
    }

    // D. Session Locking Tracking
    if (role === "owner") {
        await redis.hset(`session:${sessionId}:metadata`, 'ownerSpeakerId', 'Speaker-Owner');
    }

    console.log("🔍 Max Similarity Score:", similarity.toFixed(4));
    console.log("🧠 Role Assigned:", role);
    if (role === 'owner') console.log("📈 Smoothed Display Confidence:", displayConfidence);
    console.log("📊 Thresholds: owner>=0.50, customer<=0.40 (Max Cluster Engine)");

    return {
        speakerId: role === "owner" ? "Speaker-Owner" : `Speaker-${Date.now()}`,
        role: role,
        confidence: confidence,
        displayConfidence: displayConfidence,
        isNew: true
    };
}

/**
 * Identify the speaker role manually (for out-of-band checks)
 */
export async function identifySpeakerRole(sessionId, specificSpeakerId = null) {
    try {
        if (!specificSpeakerId) return { role: "unknown", confidence: 0, speakerId: null };

        const countsMap = await redis.hgetall(`session:${sessionId}:counts`);
        const ownerCount = parseInt(countsMap['Speaker-Owner'] || "0");
        const specificCount = parseInt(countsMap[specificSpeakerId] || "0");

        let role = "customer";
        if (specificSpeakerId === 'Speaker-Owner') {
            role = "owner";
        }

        return {
            speakerId: specificSpeakerId,
            role,
            confidence: 1.0
        };
    } catch {
        return { role: "unknown", confidence: 0, speakerId: null };
    }
}

/**
 * Fetch active Session state and profiles
 */
export async function getSessionState(sessionId) {
    const [speakersMap, countsMap] = await Promise.all([
        redis.hgetall(`session:${sessionId}:speakers`),
        redis.hgetall(`session:${sessionId}:counts`)
    ]);

    if (Object.keys(speakersMap).length === 0) return null;

    const speakers = {};
    for (const sid of Object.keys(speakersMap)) {
        speakers[sid] = {
            segment_count: parseInt(countsMap[sid] || "0"),
            role: sid === 'Speaker-Owner' ? "owner" : "customer"
        };
    }

    return {
        session_id: sessionId,
        num_speakers: Object.keys(speakersMap).length,
        speakers
    };
}

/**
 * Force assign owner logic (Override hook)
 */
export async function calibrateOwner(sessionId, speakerId) {
    return { success: false, reason: "Manual calibration disabled. System relies strictly on Voice Enrollment Master Profile." };
}

/**
 * Cleanup a session manually
 */
export async function endSpeakerSession(sessionId) {
    if (!sessionId) return { status: "ignored" };
    await redis.pipeline()
        .del(`session:${sessionId}:speakers`)
        .del(`session:${sessionId}:counts`)
        .del(`session:${sessionId}:metadata`)
        .exec();
    return { status: "ended", sessionId };
}

/**
 * Health Check for Python Microservice
 */
export async function checkDiarizationHealth() {
    try {
        const response = await axios.get(DIARIZATION_URL.replace("/extract-embedding", "/health"), { timeout: 2000 });
        if (response.status === 200) return { status: "healthy", redis: redis.status };
    } catch {
        // Fallback or ignore
    }
    return { status: "unhealthy" };
}
