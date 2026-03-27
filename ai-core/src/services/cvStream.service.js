const axios = require("axios");

/**
 * CV Edge Stabilization Service
 * 
 * Protects the Core Intelligence Layer from:
 * 1. Flickering detections (momentary item appearance/disappearance)
 * 2. Empty frames (camera blinks/occlusion)
 * 3. Duplicate flooding (static scenes unchanged)
 */

// Memory of recent frames
const FRAME_BUFFER_SIZE = 3; // roughly 1-1.5s at 2fps
let recentFrames = [];

// Last successfully broadcasted state
let lastTransmittedState = null;

// Helper to deep compare item arrays disregarding order
function areItemsIdentical(itemsA, itemsB) {
    if (!itemsA || !itemsB) return itemsA === itemsB;
    if (itemsA.length !== itemsB.length) return false;
    
    const mapA = {};
    itemsA.forEach(i => mapA[i.name] = i.qty);
    
    for (const item of itemsB) {
        if (mapA[item.name] !== item.qty) return false;
    }
    return true;
}

/**
 * Edge Filter invoked on every raw camera frame evaluation.
 * @param {Array} rawItems - e.g. [{ name: 'lays', qty: 2 }]
 */
function processCVFrameAtEdge(rawItems) {
    console.log(`\n[CV EDGE] Raw Detection:`, JSON.stringify(rawItems));

    // 1. Maintain Frame History
    const frameData = { timestamp: Date.now(), items: rawItems };
    recentFrames.push(frameData);
    if (recentFrames.length > FRAME_BUFFER_SIZE) {
        recentFrames.shift();
    }

    // Need a full buffer to guarantee stability before initial changes
    if (recentFrames.length < 2) {
        console.log(`[CV EDGE] Decision: BUFFERING (${recentFrames.length} frames)`);
        return;
    }

    // 2. Flicker Stabilization & Empty Frame Protection
    // A state is "Stable" ONLY if it appears identically across the recent buffer
    let isStable = true;
    const candidateItems = recentFrames[recentFrames.length - 1].items;

    for (let i = 0; i < recentFrames.length - 1; i++) {
        if (!areItemsIdentical(candidateItems, recentFrames[i].items)) {
            isStable = false;
            break;
        }
    }

    if (!isStable) {
        console.log(`[CV EDGE] Stabilized Detection: INDETERMINATE (Flickering)`);
        console.log(`[CV EDGE] Decision: DROPPED (Waiting for consistency)`);
        return;
    }

    // It is stable!
    console.log(`[CV EDGE] Stabilized Detection:`, JSON.stringify(candidateItems));

    // 3. Duplicate Frame Suppression (Controlled Update Strategy)
    if (areItemsIdentical(candidateItems, lastTransmittedState)) {
        console.log(`[CV EDGE] Decision: SUPPRESSED (Identical to last transmitted state)`);
        return;
    }

    // 4. Meaningful Change! Forward to Intelligence Core
    console.log(`[CV EDGE] Decision: FORWARDING CV_EVENT`);
    
    lastTransmittedState = [...candidateItems];

    const event = {
        eventId: `cv_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        timestamp: Date.now(),
        type: "CV",
        items: candidateItems
    };

    axios.post('http://localhost:8000/event', event)
        .catch(err => console.error("[CV STREAM ERROR] Failed to dispatch to core:", err.message));
}

// Ensure clean reset between test simulations
function resetEdgeState() {
    recentFrames = [];
    lastTransmittedState = null;
}

module.exports = {
    processCVFrameAtEdge,
    resetEdgeState
};
