// ──────────────────────────────────────────────────────────────────────────────
// Match Service — Session State & Voice Parsing
//
// Manages real-time session state for Sync Center reconciliation.
// Contains the ONLY audio parser in the system.
// ──────────────────────────────────────────────────────────────────────────────

const SESSIONS = new Map();

// ─── Word → Number Mapping ──────────────────────────────────────────────────
const WORD_NUMBERS = {
    "one": 1, "ek": 1, "a": 1,
    "two": 2, "do": 2,
    "three": 3, "teen": 3, "tin": 3,
    "four": 4, "char": 4, "chaar": 4,
    "five": 5, "paanch": 5, "panch": 5,
    "six": 6, "cheh": 6, "che": 6,
    "seven": 7, "saat": 7,
    "eight": 8, "aath": 8,
    "nine": 9, "nau": 9,
    "ten": 10, "das": 10
};

// ─── Product Synonym Map ────────────────────────────────────────────────────
// All synonyms → canonical DB key
const SYNONYMS = {
    "chips": "lays",
    "chip": "lays",
    "lays": "lays",
    "lay": "lays",
    "pepsi": "pepsi",
    "peps": "pepsi",
    "coke": "coke",
    "coca": "coke",
    "maggi": "maggi",
    "maggie": "maggi",
    "magi": "maggi",
    "kurkure": "kurkure",
    "biscuit": "parleg",
    "parle": "parleg",
    "oil": "fortunesunfloweroil1l",
    "atta": "aashirvaadatta5kg",
    "tea": "redlabeltea250g",
    "salt": "tatasalt1kg"
};

// ─── Session Management ─────────────────────────────────────────────────────

const ensureSession = (id = 'demo-session') => {
    if (!SESSIONS.has(id)) {
        SESSIONS.set(id, {
            cv_items: {},
            audio_items: {},
            expected_total: null,
            audio_total: null,
            founder_mode: false,
            last_product: null,
            alerts: []
        });
    }
    return SESSIONS.get(id);
};

export const getSession = (id = 'demo-session') => ensureSession(id);

export const resetSession = (id = 'demo-session') => {
    const fresh = {
        cv_items: {},
        audio_items: {},
        audio_total: null,
        expected_total: null,
        founder_mode: false,
        last_product: null,
        alerts: []
    };
    SESSIONS.set(id, fresh);
    console.log("[RESET] ✅ Transaction fully cleared. Fresh session created.");
    return fresh;
};

export const setFounderMode = (active, id = 'demo-session') => {
    ensureSession(id).founder_mode = active;
};

// ─── Robust Audio Parser ────────────────────────────────────────────────────
/**
 * Parses a voice transcript into structured items + total.
 *
 * Handles:
 *   "4 chips, one pepsi, total 50"
 *   "two maggi and three lays total hundred"
 *   "chips pepsi total 20"
 *
 * @param {string} transcript - Raw voice text
 * @returns {{ items: object, total: number|null }}
 *   items: { lays: 4, pepsi: 1 }  (canonical name → qty)
 *   total: 50 or null
 */
export const parseTranscript = (transcript) => {
    const raw = transcript.toLowerCase().replace(/[.,!?]/g, " ").replace(/\s+/g, " ").trim();
    const tokens = raw.split(" ");
    const items = {};
    let total = null;

    console.log(`[PARSER] 🔍 Tokenized: [${tokens.join(", ")}]`);

    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];

        // ── Extract "total" value ──
        if (token === "total" || token === "bill" || token === "hisab" || token === "kithna") {
            // Look ahead for the number
            for (let j = i + 1; j < Math.min(i + 3, tokens.length); j++) {
                const num = parseNumber(tokens[j]);
                if (num !== null) {
                    total = num;
                    console.log(`[PARSER] 💰 Total detected: ₹${total}`);
                    i = j; // skip past the number
                    break;
                }
            }
            continue;
        }

        // ── Check if token is a known product ──
        const canonical = SYNONYMS[token];
        if (canonical) {
            // Look BACKWARD for a quantity (e.g., "4 chips")
            let qty = 1;
            if (i > 0) {
                const prevNum = parseNumber(tokens[i - 1]);
                if (prevNum !== null) qty = prevNum;
            }
            // Also look FORWARD (e.g., "chips 4" — less common but possible)
            if (qty === 1 && i + 1 < tokens.length) {
                const nextNum = parseNumber(tokens[i + 1]);
                if (nextNum !== null && !SYNONYMS[tokens[i + 1]]) {
                    qty = nextNum;
                }
            }

            items[canonical] = (items[canonical] || 0) + qty;
            console.log(`[PARSER] 📦 Item: "${token}" → ${canonical} x${qty}`);
        }
    }

    console.log(`[PARSER] ✅ Result: items=${JSON.stringify(items)}, total=${total}`);
    return { items, total };
};

/**
 * Convert a token to a number.
 * Handles: "4", "four", "chaar"
 * Returns null if not a number.
 */
function parseNumber(token) {
    if (!token) return null;
    // Direct numeric
    const direct = parseInt(token, 10);
    if (!isNaN(direct) && direct > 0) return direct;
    // Word lookup
    if (WORD_NUMBERS[token] !== undefined) return WORD_NUMBERS[token];
    return null;
}

// ─── Session Setters ────────────────────────────────────────────────────────

export const updateCVItems = (items, id = 'demo-session') => {
    ensureSession(id).cv_items = items;
};

export const setExpectedTotal = (total, id = 'demo-session') => {
    ensureSession(id).expected_total = total;
};

export const setAudioTotal = (total, id = 'demo-session') => {
    ensureSession(id).audio_total = total;
};

export const setAudioItems = (items, id = 'demo-session') => {
    ensureSession(id).audio_items = items;
};

export const addAlert = (alert, id = 'demo-session') => {
    ensureSession(id).alerts.push(alert);
};

export default {
    getSession, resetSession, setFounderMode, parseTranscript,
    updateCVItems, setExpectedTotal, setAudioTotal, setAudioItems, addAlert
};
