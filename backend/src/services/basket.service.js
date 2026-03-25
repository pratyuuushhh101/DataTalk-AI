import { getStrictNormalizedName } from "../utils/normalization.js";

// ─── Basket Service ───────────────────────────────────────────────────────────
// Deterministic, rule-based basket suggestions.
// No AI-Core, no randomness, no external dependencies.
//
// RULES:
//   ✅ Pure function — same input always produces same output
//   ✅ Uses normalization utils for product matching
//   ❌ No SQL, no Redis, no HTTP calls
//   ❌ No randomness
// ──────────────────────────────────────────────────────────────────────────────

const BASKET_RULES = [
    { if: ["bread"], suggest: "butter", display: "Amul Butter" },
    { if: ["maggi", "lays"], suggest: "coke", display: "Coca-Cola 500ml" },
    { if: ["maggi"], suggest: "lays", display: "Lays Classic" },
    { if: ["rice"], suggest: "dal", display: "Toor Dal 1kg" },
    { if: ["tea", "redlabeltea250g"], suggest: "sugar", display: "Sugar 1kg" },
    { if: ["milk", "amulmilk500ml"], suggest: "bread", display: "Bread" },
    { if: ["biscuit", "parleg"], suggest: "tea", display: "Red Label Tea 250g" },
    { if: ["butter"], suggest: "bread", display: "Bread" },
    { if: ["coke", "pepsi"], suggest: "lays", display: "Lays Classic" },
    { if: ["soap", "dettolsoap"], suggest: "shampoo", display: "Head & Shoulders Sachet" },
    { if: ["oil", "fortunesunfloweroil1l"], suggest: "atta", display: "Aashirvaad Atta 5kg" },
    { if: ["atta", "aashirvaadatta5kg"], suggest: "oil", display: "Fortune Sunflower Oil 1L" },
];

/**
 * Generates deterministic basket suggestions based on items purchased.
 * Pure function: no side effects, no network calls, no randomness.
 *
 * @param {Array<{ product: string }>} items - Array of purchased items (must have `product` field)
 * @returns {{ suggestions: string[] }} - Deduplicated display names of suggested products
 */
export const suggestItems = (items) => {
    if (!items || items.length === 0) {
        return { suggestions: [] };
    }

    // Normalize all basket products
    const basketNormalized = items.map(i => getStrictNormalizedName(i.product));

    const suggestions = [];

    for (const rule of BASKET_RULES) {
        // Check if ALL condition products are present in the basket
        const allPresent = rule.if.every(conditionProduct =>
            basketNormalized.some(basketProduct =>
                basketProduct.includes(conditionProduct) || conditionProduct.includes(basketProduct)
            )
        );

        if (allPresent) {
            // Don't suggest something already in the basket
            const alreadyInBasket = basketNormalized.some(bp =>
                bp.includes(rule.suggest) || rule.suggest.includes(bp)
            );

            if (!alreadyInBasket) {
                suggestions.push(rule.display);
            }
        }
    }

    // Deduplicate
    return { suggestions: [...new Set(suggestions)] };
};

export default { suggestItems };
