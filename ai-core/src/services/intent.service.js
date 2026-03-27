function classifyIntent(text) {
  let intent = "UNKNOWN";
  let confidence = 0.0;
  let entities = {};

  const lowerText = text.toLowerCase();

  if (lowerText.match(/(?:total|bill bana|actually|no)\s*(\d+)/)) {
    intent = "BILLING";
    confidence = 0.95;
    const match = lowerText.match(/(?:total|bill bana|actually|no)\s*(\d+)/);
    if (match) entities.total = parseInt(match[1], 10);
  } else if (lowerText.match(/discount\s*(\d+)/) || lowerText.includes("kam karo")) {
    intent = "NEGOTIATION";
    confidence = 0.92;
    const match = lowerText.match(/discount\s*(\d+)/);
    if (match) entities.discount = parseInt(match[1], 10);
  } else if (lowerText.includes("do you have") || lowerText.includes("check stock")) {
    intent = "PRODUCT_QUERY";
    confidence = 0.90;
    entities.product = lowerText.replace("do you have", "").trim();
  } else if (lowerText.match(/order\s*(\d+)\s*(\w+)/)) {
    intent = "ORDER_REQUEST";
    confidence = 0.88;
    const match = lowerText.match(/order\s*(\d+)\s*(\w+)/);
    if (match) {
      entities.quantity = parseInt(match[1], 10);
      entities.product = match[2];
    }
  } else {
    if (lowerText === "no") {
        intent = "NEGATIVE";
        confidence = 0.99; 
    } else {
        intent = "UNKNOWN";
        confidence = 0.40;
    }
  }

  if (confidence < 0.85) {
    intent = "UNKNOWN";
  }

  return { intent, confidence, entities };
}

module.exports = {
  classifyIntent
};
