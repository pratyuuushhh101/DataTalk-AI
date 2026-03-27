export async function fetchFestivalRecommendations(festival, inventory) {
  const staticMap = {
    "Diwali": ["sweets", "snacks", "dry fruits", "oil"],
    "Holi": ["colors", "snacks", "cold drinks"],
    "Eid al-Fitr": ["meat", "rice", "spices", "sweets"],
    "Eid al-Adha": ["meat", "rice", "spices"],
    "Christmas": ["bakery", "chocolates", "decorations"],
    "Navratri": ["fruits", "snacks", "milk"],
    "Default": ["snacks", "beverages"]
  };

  try {
    const aiCoreUrl = process.env.AI_CORE_URL || "http://localhost:8000";

    const response = await fetch(`${aiCoreUrl}/api/festival/festival-recommendation`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        festival,
        inventory
      })
    });

    console.log("AI-Core status:", response.status);

    if (!response || !response.ok) {
      throw new Error("AI-Core request failed");
    }

    const aiData = await response.json();

    if (!aiData || aiData.error || !aiData.suggested_products) {
      throw new Error("Invalid AI response");
    }

    return aiData;

  } catch (error) {
    console.error("fetchFestivalRecommendations Error:", error.message);

    return {
      festival: festival,
      suggested_products: staticMap[festival] || staticMap["Default"],
      reason: "High demand expected (AI fallback)",
      confidence: "low"
    };
  }
}
