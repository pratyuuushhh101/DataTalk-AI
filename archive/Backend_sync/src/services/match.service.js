// ──────────────────────────────────────────────────────────────────────────────
// Match Service — Global Transaction Logic
//
// Maintains the state of the current vision-voice comparison session.
// This is currently in-memory but logic is ready for Redis persistence.
// ──────────────────────────────────────────────────────────────────────────────

let currentTransaction = {
    cv_items: {},      // Items detected by Camera
    audio_items: [],   // Items heard via Voice
    audio_total: null,
    expected_total: null,
    founder_mode: false, // For Scene 1 logic
    last_product: null,  // To track missed demand
    alerts: []           // Proactive bucket analysis alerts
};

/**
 * Reset the session state.
 */
export const resetSession = () => {
    currentTransaction = {
        cv_items: {},
        audio_items: [],
        audio_total: null,
        expected_total: null,
        founder_mode: false,
        last_product: null,
        alerts: []
    };
    return { message: "Session reset successful" };
};

/**
 * Return current state.
 */
export const getSession = () => {
    return currentTransaction;
};

/**
 * Append or Increment CV items.
 * @param {string} product 
 * @param {number} qty 
 */
export const incrementCVItem = (product, qty = 1) => {
    if (currentTransaction.cv_items[product]) {
        currentTransaction.cv_items[product] += qty;
    } else {
        currentTransaction.cv_items[product] = qty;
    }
    return { message: "Item incremented", current: currentTransaction.cv_items };
};

/**
 * Add / Update CV items (Full batch).
 * @param {object} items - Map of { product: qty }
 */
export const updateCVItems = (items) => {
    Object.assign(currentTransaction.cv_items, items);
    return { message: "CV state updated", current: currentTransaction.cv_items };
};

/**
 * Add items to Audio log.
 * @param {Array} items - List of { product, qty } from audio extraction
 */
export const updateAudioItems = (items) => {
    currentTransaction.audio_items.push(...items);
    return { message: "Audio state updated", log_count: currentTransaction.audio_items.length };
};

/**
 * Updates the expected total for the current session.
 * 
 * @param {number} total 
 */
export const setExpectedTotal = (total) => {
    currentTransaction.expected_total = total;
    return currentTransaction.expected_total;
};

/**
 * Updates the audio total stated by the shopkeeper.
 * 
 * @param {number} total 
 */
export const setAudioTotal = (total) => {
    currentTransaction.audio_total = total;
    return currentTransaction.audio_total;
};

/**
 * Set Founder Mode.
 */
export const setFounderMode = (val) => {
    currentTransaction.founder_mode = val;
    return val;
};

/**
 * Update Last Product.
 */
export const setLastProduct = (product) => {
    currentTransaction.last_product = product;
    return product;
};

/**
 * Add / Clear proactive alerts.
 */
export const addAlert = (alert) => {
    currentTransaction.alerts.push(alert);
    return currentTransaction.alerts;
};

export const clearAlerts = () => {
    currentTransaction.alerts = [];
};

export default {
    resetSession,
    getSession,
    updateCVItems,
    incrementCVItem,
    updateAudioItems,
    setExpectedTotal,
    setAudioTotal,
    setFounderMode,
    setLastProduct,
    addAlert,
    clearAlerts
};
