function processDecision(input) {
  if (!input) return null;

  const { intent, entities = {}, speaker, detectedItems = [], inventory = {}, pricing = {}, state = {} } = input;
  
  // Safe access wrappers
  const safeEntities = entities || {};
  const safeItems = detectedItems || [];
  const safeInventory = inventory || {};
  const safePricing = pricing || {};
  const safeState = state || {};
  const missedDemand = safeState.missedDemand || {};
  const salesHistory = safeState.salesHistory || {};

  // PRIORITY 1: ALERT (Billing Mismatch)
  if (safeItems.length > 0 && safeEntities.amount !== undefined) {
    let expectedTotal = 0;
    for (const item of safeItems) {
      if (item && item.name && typeof item.qty === 'number') {
        const price = safePricing[item.name] || 0;
        expectedTotal += item.qty * price;
      }
    }
    
    if (expectedTotal !== safeEntities.amount) {
      return {
        type: "ALERT",
        message: "Billing mismatch detected"
      };
    }
  }

  const targetProduct = safeEntities.product || safeState.lastQueryProduct;

  // PRIORITY 2: STOCK_ALERT
  if (intent === "NEGATIVE_RESPONSE" && targetProduct && safeInventory[targetProduct] > 0) {
    return {
      type: "STOCK_ALERT",
      product: targetProduct,
      message: "Item is available in stock"
    };
  }

  // PRIORITY 3: MISSED_DEMAND
  if (intent === "NEGATIVE_RESPONSE" && targetProduct && safeInventory[targetProduct] === 0) {
    if (!safeState.missedDemand) {
      safeState.missedDemand = {};
    }
    if (!safeState.missedDemand[targetProduct]) {
      safeState.missedDemand[targetProduct] = { count: 0, lastSeen: Date.now() };
    }
    safeState.missedDemand[targetProduct].count += 1;
    safeState.missedDemand[targetProduct].lastSeen = Date.now();
    
    return {
      type: "MISSED_DEMAND",
      product: targetProduct
    };
  }

  // PRIORITY 4: AUTO_REORDER
  for (const product in safeInventory) {
    const sales = salesHistory[product] || [];
    const last7 = sales.slice(-7);
    const avgSales = last7.length > 0 ? last7.reduce((a, b) => a + b, 0) / last7.length : 0;
    const threshold = avgSales * 2;
    
    if (safeInventory[product] === 0 || safeInventory[product] < threshold) {
      return {
        type: "AUTO_REORDER",
        product,
        suggested_qty: Math.ceil(avgSales * 3),
        reason: "Stock is low or out of stock"
      };
    }
  }

  // PRIORITY 5: INCREASE_STOCK (Demand Spike)
  for (const product in salesHistory) {
    const sales = salesHistory[product] || [];
    const last7 = sales.slice(-7);
    const avgSales = last7.length > 0 ? last7.reduce((a, b) => a + b, 0) / last7.length : 0;
    const todaySales = sales.length > 0 ? sales[sales.length - 1] : 0;
    
    if (todaySales > (avgSales * 1.5)) {
      return {
        type: "INCREASE_STOCK",
        product,
        suggested_qty: Math.ceil(avgSales * 2),
        reason: "Demand spike detected"
      };
    }
  }

  // PRIORITY 6: SUGGEST_NEW_PRODUCT
  for (const product in missedDemand) {
    const data = missedDemand[product];
    if (data && data.count >= 3) {
      return {
        type: "SUGGEST_NEW_PRODUCT",
        product,
        suggested_qty: data.count * 3,
        reason: "Repeated customer demand"
      };
    }
  }

  return null;
}

export { processDecision };
