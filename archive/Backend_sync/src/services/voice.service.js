// ──────────────────────────────────────────────────────────────────────────────
// Voice Service — Natural Language Parser
//
// Extracts intent from shopkeeper transcripts. No AI-Core needed for this
// optimized keyword scanner.
// ──────────────────────────────────────────────────────────────────────────────

const KEYWORDS = ["lays", "pepsi", "maggi", "coke", "kurkure"];

/**
 * Parses transcript for items and totals.
 * 
 * @param {string} transcript 
 * @returns {object} { items: [{ product, qty }], total: number | null }
 */
export const parseTranscript = (transcript) => {
    const raw = transcript.toLowerCase();
    const result = { items: [], total: null };

    // 1. Keyword Item Extraction
    KEYWORDS.forEach(keyword => {
        // Support 'chips' -> 'lays' and common misspellings
        if (raw.includes(keyword) || (keyword === 'lays' && raw.includes('chips'))) {
            const searchKey = (keyword === 'lays' && raw.includes('chips')) ? 'chips' : keyword;
            const regex = new RegExp(`(\\d+)\\s*${searchKey}|${searchKey}\\s*(\\d+)`, "g");
            const match = regex.exec(raw);

            if (match) {
                const qty = parseInt(match[1] || match[2]) || 1;
                result.items.push({ product: keyword, qty });
            } else {
                result.items.push({ product: keyword, qty: 1 });
            }
        }
    });

    // 2. Hindi & Business Intents
    result.isFounderKit = raw.includes("duk") || raw.includes("khol") || raw.includes("naya");
    result.isMissedDemand = raw.includes("nahi") || raw.includes("nahin") || raw.includes("no");
    result.isNext = raw.includes("next") || raw.includes("agla");

    // 3. Total / Budget Extraction
    const totalMatch = raw.match(/(?:total|budget|kithna|price)\s*(?:rs)?\s*(\d+)/i);
    if (totalMatch) {
        result.total = parseFloat(totalMatch[1]);
    }

    return result;
};

export default {
    parseTranscript
};
