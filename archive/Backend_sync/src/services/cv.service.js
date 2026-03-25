// ──────────────────────────────────────────────────────────────────────────────
// Computer Vision (CV) Service — Mock Snapshot
//
// Provides a deterministic snapshot for the Demo Orchestrator.
// In a production scenario, this would trigger the Camera device or call a 
// Vision Detection API.
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Executes a 'Snapshot' of the current counter state.
 * Currently returns a deterministic, multi-item set for the "Perfect Demo" flow.
 * 
 * @returns {object} Map of { productNorm: qty }
 */
export const runCVSnapshot = async () => {
    // Fixed Demo Snapshot as per requirements
    return {
        lays_blue: 1,
        lays_green: 1,
        lays_red: 1,
        lays_yellow: 1,
        pepsi: 1
    };
};

export default {
    runCVSnapshot
};
