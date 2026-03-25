import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

// ─── Computer Vision (CV) Service ─────────────────────────────────────────────
// EVENT-DRIVEN: Called ONCE per transaction, NOT continuously.
// All credentials from .env — NOTHING hardcoded.
// ──────────────────────────────────────────────────────────────────────────────

const PREDICTION_KEY = process.env.AZURE_CV_PREDICTION_KEY;
const ENDPOINT = process.env.AZURE_CV_ENDPOINT;
const PROJECT_ID = process.env.AZURE_CV_PROJECT_ID;
const PUBLISHED_NAME = process.env.AZURE_CV_PUBLISHED_NAME;

// Tags that are known Lays variants → normalize to "lays"
const LAYS_VARIANTS = new Set([
    "lays_yellow", "lays_blue", "lays_green", "lays_red",
    "laysyellow", "laysblue", "laysgreen", "laysred",
    "lays", "lays classic", "lays_classic"
]);

/**
 * Compute IoU between two bounding boxes.
 */
function computeIoU(a, b) {
    const x1 = Math.max(a.left, b.left);
    const y1 = Math.max(a.top, b.top);
    const x2 = Math.min(a.left + a.width, b.left + b.width);
    const y2 = Math.min(a.top + a.height, b.top + b.height);
    const intersection = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
    const union = (a.width * a.height) + (b.width * b.height) - intersection;
    return union > 0 ? intersection / union : 0;
}

/**
 * Remove overlapping detections — keep highest confidence per region.
 */
function deduplicateDetections(detections) {
    const sorted = [...detections].sort((a, b) => b.probability - a.probability);
    const kept = [];
    for (const pred of sorted) {
        let dominated = false;
        for (const existing of kept) {
            if (computeIoU(pred.boundingBox, existing.boundingBox) > 0.40) {
                console.log(`[CV] 🔄 Suppressed "${pred.tagName}"(${(pred.probability * 100).toFixed(1)}%) — overlaps "${existing.tagName}"`);
                dominated = true;
                break;
            }
        }
        if (!dominated) kept.push(pred);
    }
    return kept;
}

/**
 * Sends image buffer to Azure Custom Vision for object detection.
 * @param {Buffer} imageBuffer - Binary image (JPEG/PNG)
 * @returns {Promise<object>} { normalizedProduct: count }
 */
export const runCVSnapshot = async (imageBuffer) => {
    // ── Validate credentials ──
    if (!PREDICTION_KEY || !ENDPOINT || !PROJECT_ID || !PUBLISHED_NAME) {
        console.error("[CV] ❌ MISSING CREDENTIALS:");
        console.error(`[CV]   PREDICTION_KEY: ${PREDICTION_KEY ? "✅ set" : "❌ MISSING"}`);
        console.error(`[CV]   ENDPOINT: ${ENDPOINT ? "✅ set" : "❌ MISSING"}`);
        console.error(`[CV]   PROJECT_ID: ${PROJECT_ID ? "✅ set" : "❌ MISSING"}`);
        console.error(`[CV]   PUBLISHED_NAME: ${PUBLISHED_NAME ? "✅ set" : "❌ MISSING"}`);
        return {};
    }

    if (!imageBuffer || imageBuffer.length === 0) {
        console.error("[CV] ❌ Empty image buffer received.");
        return {};
    }

    // ── Build URL from env vars ──
    const url = `${ENDPOINT.replace(/\/$/, "")}/customvision/v3.0/Prediction/${PROJECT_ID}/detect/iterations/${PUBLISHED_NAME}/image`;

    console.log(`[CV] 📸 Sending ${(imageBuffer.length / 1024).toFixed(1)}KB to Azure...`);
    console.log(`[CV] 🔗 Endpoint: ${url}`);
    console.log(`[CV] 🔑 Key: ${PREDICTION_KEY.substring(0, 10)}...${PREDICTION_KEY.substring(PREDICTION_KEY.length - 6)}`);

    try {
        const response = await axios.post(url, imageBuffer, {
            headers: {
                "Prediction-Key": PREDICTION_KEY,
                "Content-Type": "application/octet-stream"
            },
            timeout: 15000
        });

        console.log(`[CV] ✅ Azure responded: HTTP ${response.status}`);
        const rawDetections = response.data.predictions || [];

        // Log ALL raw detections
        console.log(`[CV] 🔍 Raw detections (${rawDetections.length}):`);
        rawDetections.forEach(p => {
            const box = p.boundingBox;
            console.log(`[CV]   → ${p.tagName}: ${(p.probability * 100).toFixed(1)}% ${box ? `[${box.left.toFixed(2)},${box.top.toFixed(2)} ${box.width.toFixed(2)}x${box.height.toFixed(2)}]` : ''}`);
        });

        // Step 1: Filter by 60% confidence
        const candidates = rawDetections.filter(p => p.probability > 0.60 && p.boundingBox);

        // Step 2: Deduplicate overlapping boxes
        const deduplicated = deduplicateDetections(candidates);

        // Step 3: Build result with normalization
        const result = {};
        for (const pred of deduplicated) {
            let tag = pred.tagName.toLowerCase().replace(/[\s\-_]/g, "");

            if (LAYS_VARIANTS.has(pred.tagName.toLowerCase().replace(/[\s]/g, "_")) || LAYS_VARIANTS.has(tag)) {
                tag = "lays";
            }

            result[tag] = (result[tag] || 0) + 1;
        }

        console.log(`[CV] ✅ Final output: ${JSON.stringify(result)}`);
        return result;

    } catch (err) {
        console.error(`[CV] ❌ AZURE API FAILED`);
        console.error(`[CV] ❌ Status: ${err.response?.status || 'no response'}`);
        console.error(`[CV] ❌ Body: ${JSON.stringify(err.response?.data || err.message)}`);
        console.error(`[CV] ❌ URL used: ${url}`);
        return {};
    }
};

export default { runCVSnapshot };
