import { getEventRecommendations } from "./event.service.js";
import { fetchFestivalRecommendations } from "./festival.service.js";
import { recommendSchemes } from "./scheme.service.js";

function getBasketRecommendations(salesData) {
  if (!Array.isArray(salesData)) return { combinations: [] };

  const grouped = {};

  salesData.forEach(item => {
    if (!item) return;
    const billId = item.BillId || item.bill_id;
    if (!billId) return;

    if (!grouped[billId]) grouped[billId] = [];
    grouped[billId].push(item.product);
  });

  const pairCount = {};

  Object.values(grouped).forEach(products => {
    for (let i = 0; i < products.length; i++) {
      for (let j = i + 1; j < products.length; j++) {
        const pair = [products[i], products[j]].sort().join(",");
        pairCount[pair] = (pairCount[pair] || 0) + 1;
      }
    }
  });

  return {
    type: "BASKET_RECOMMENDATION",
    combinations: Object.entries(pairCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([p]) => p.split(","))
  };
}

function getColdStartRecommendations(globalSalesData) {
  if (!Array.isArray(globalSalesData)) return { products: [] };

  return {
    type: "COLD_START_RECOMMENDATION",
    products: globalSalesData
      .sort((a, b) => (b.count || 0) - (a.count || 0))
      .slice(0, 5)
      .map(x => x.product)
  };
}

export async function getRecommendations(input) {
  const { inventory, salesData, globalSalesData, region, festival } = input || {};

  const eventRecommendations = await getEventRecommendations(region);
  const basket = getBasketRecommendations(salesData);
  const coldStart = getColdStartRecommendations(globalSalesData);
  const government_schemes = recommendSchemes(salesData);

  let festival_insights = null;

  if (festival && inventory && Array.isArray(inventory)) {
    festival_insights = await fetchFestivalRecommendations(festival, inventory);
  }

  return {
    events: eventRecommendations,
    basket,
    coldStart,
    festival_insights,
    government_schemes
  };
}
