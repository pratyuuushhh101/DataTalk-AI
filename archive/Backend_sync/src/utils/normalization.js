/**
 * Standardizes product names for demo-safe matching.
 * Handles vision suffixes (e.g., "lays_blue" -> "lays").
 * 
 * @param {string} productStr 
 * @returns {string} Lowercased, clean product name.
 */
export const normalizeProduct = (productStr) => {
    if (!productStr) return "";

    // 1. Convert to lowercase
    // 2. Remove all characters after the first underscore
    // Example: "Lays_Blue" -> "lays"
    return productStr.toLowerCase().split("_")[0];
};

export default {
    normalizeProduct
};
