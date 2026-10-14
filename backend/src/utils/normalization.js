/**
 * DataTalk AI Normalization Engine
 * Converts any product string to a strict, symbol-free lowercase ID.
 * Example: "Parle-G 10pk" -> "parleg10pk"
 */
function normalizeProductName(name) {
    if (!name) return "";
    return String(name)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .trim();
}

// Exact normalized strings or specific misspellings -> canonical ID
const EXACT_PHONETIC_MAP = {
    "parleji": "parleg",
    "parley": "parleg",
    "parli": "parleg",
    "parlegbiscuit": "parleg",
    "majji": "maggi",
    "magi": "maggi",
    "magie": "maggi",
    "maggie": "maggi",
    "mgie": "maggi",
    "magginoodles": "maggi",
    "oil": "fortunesunfloweroil1l",
    "fortuneoil": "fortunesunfloweroil1l",
    "sunfloweroil": "fortunesunfloweroil1l",
    "fortunesunfloweroil": "fortunesunfloweroil1l",
    "atta": "aashirvaadatta5kg",
    "aashirvaad": "aashirvaadatta5kg",
    "aashirvaadatta": "aashirvaadatta5kg",
    "tea": "redlabeltea250g",
    "redlabel": "redlabeltea250g",
    "redlabeltea": "redlabeltea250g",
    "salt": "tatasalt1kg",
    "tatasalt": "tatasalt1kg",
    "milk": "amulmilk1l",
    "amulmilk": "amulmilk1l"
};

// Word-level typo replacements (only replaces whole words, never substrings like "coconutoil")
const WORD_TYPO_MAP = {
    "parleji": "parleg",
    "parley": "parleg",
    "parli": "parleg",
    "majji": "maggi",
    "magi": "maggi",
    "magie": "maggi",
    "maggie": "maggi",
    "mgie": "maggi"
};

function getStrictNormalizedName(input) {
    if (!input) return "";

    // Replace word-boundary typos first while spaces still exist
    const words = String(input)
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .trim()
        .split(/\s+/)
        .map(w => WORD_TYPO_MAP[w] || w);

    const normalized = words.join("");

    if (EXACT_PHONETIC_MAP[normalized]) {
        return EXACT_PHONETIC_MAP[normalized];
    }

    return normalized;
}

export { normalizeProductName, getStrictNormalizedName };
