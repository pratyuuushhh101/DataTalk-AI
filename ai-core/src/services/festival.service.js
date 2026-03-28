const { extractJSONFromSpeedEngine } = require("./aiService");
const { festivalPrompt } = require("../prompts/festivalPrompt");

async function generateFestivalRecommendations(festival, inventory) {
  try {
    const inventoryList = inventory
      .map(item => item.product || item.name || item)
      .join(", ");

    const userText = `Festival: ${festival}\nInventory: [${inventoryList}]`;

    let response = await extractJSONFromSpeedEngine(festivalPrompt, userText);

    // Clean markdown
    const clean = response.replace(/```json|```/g, '').trim();

    try {
      return JSON.parse(clean);
    } catch (parseErr) {
      return {
        festival,
        suggested_products: [],
        reason: "JSON parsing failed"
      };
    }

  } catch (err) {
    console.error("Festival Service Error:", err.message);

    return {
      festival,
      suggested_products: [],
      reason: "AI service failed"
    };
  }
}

module.exports = { generateFestivalRecommendations };