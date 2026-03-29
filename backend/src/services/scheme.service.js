// ─── Government Scheme Recommendation Service ───
// Uses behavior-based detection from real transaction signals only.
// No assumed costs, no fixed percentages, no artificial math.

const LOW_REVENUE_THRESHOLD = 500;  // minimum cumulative revenue to be considered healthy
const LOW_ORDER_THRESHOLD = 5;      // minimum order count to be considered healthy

const SCHEMES = [
  {
    name: "PM Mudra Yojana",
    benefit: "Collateral-free loan up to ₹10 lakh",
    reason: "Improves working capital"
  },
  {
    name: "Stand-Up India Scheme",
    benefit: "Loan for expansion",
    reason: "Supports growth"
  },
  {
    name: "CGTMSE Scheme",
    benefit: "Credit guarantee",
    reason: "Reduces financial risk"
  }
];

/**
 * Analyzes business health purely from transaction signals.
 * Returns "poor" or "good" — never divides, never produces NaN.
 *
 * @param {Array} salesData - Raw sales/transaction rows
 * @returns {"poor" | "good"}
 */
function analyzeBusinessHealth(salesData) {
  // STEP 1: Handle empty / missing data
  if (!salesData || salesData.length === 0) {
    return "poor";
  }

  // STEP 2: Compute metrics from real signals only
  let revenue = 0;
  const orderCount = salesData.length;

  salesData.forEach(item => {
    revenue += Number(item.total_amount || item.price * item.quantity || 0);
  });

  // STEP 3: Health logic — behavior-based, no division, no NaN paths
  if (revenue < LOW_REVENUE_THRESHOLD || orderCount < LOW_ORDER_THRESHOLD) {
    return "poor";
  }

  return "good";
}

/**
 * Returns applicable government schemes when business health is poor.
 * Always returns an array — empty when health is good.
 *
 * @param {Array} salesData - Raw sales/transaction rows
 * @returns {Array}
 */
export function recommendSchemes(salesData) {
  const health = analyzeBusinessHealth(salesData);

  if (health === "poor") {
    return SCHEMES;
  }

  return [];
}
