/**
 * DataTalk AI Normalization Engine
 * Converts any product string to a strict, symbol-free lowercase ID.
 * Example: "Parle-G 10pk" -> "parleg10pk"
 */
function normalizeProductName(name) {
    if (!name) return "";
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "") // Remove all non-alphanumeric characters
        .trim();
}

/**
 * Phonetic/Common mapping for tricky multilingual variants.
 * (Expand this list as needed)
 */
const PHONETIC_MAP = {
    "parleji": "parleg",
    "parley": "parleg",
    "parli": "parleg",
    "majji": "maggi",
    "magi": "maggi",
    "magie": "maggi",
    "maggie": "maggi",
    "mgie": "maggi",
    "oil": "fortunesunfloweroil1l",
    "atta": "aashirvaadatta5kg",
    "tea": "redlabeltea250g",
    "salt": "tatasalt1kg"
};

function getStrictNormalizedName(input) {
    let normalized = normalizeProductName(input);
    // Apply phonetic mapping
    for (const [variant, canonical] of Object.entries(PHONETIC_MAP)) {
        if (normalized.includes(variant)) {
            return canonical;
        }
    }
    return normalized;
}

export { normalizeProductName, getStrictNormalizedName };
