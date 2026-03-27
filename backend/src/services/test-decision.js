import { processDecision } from './decision.service.js';

const tests = [
  {
    name: "Case 1: Billing Mismatch",
    input: {
      intent: "checkout",
      entities: { amount: 100 },
      detectedItems: [{ name: "item1", qty: 2 }],
      pricing: { "item1": 40 }
    },
    expected: "ALERT"
  },
  {
    name: "Case 2: Stock Alert",
    input: {
      intent: "NEGATIVE_RESPONSE",
      entities: { product: "item1" },
      inventory: { "item1": 10 }
    },
    expected: "STOCK_ALERT"
  },
  {
    name: "Case 3: Missed Demand",
    input: {
      intent: "NEGATIVE_RESPONSE",
      entities: { product: "item1" },
      inventory: { "item1": 0 }
    },
    expected: "MISSED_DEMAND"
  },
  {
    name: "Case 4: Auto Reorder",
    input: {
      intent: "some_intent",
      inventory: { "item1": 5 },
      state: {
        salesHistory: {
          "item1": [1, 2, 3, 4, 5, 6, 7] // avg 4, thresh 8. 5 < 8
        }
      }
    },
    expected: "AUTO_REORDER"
  },
  {
    name: "Case 5: Demand Spike",
    input: {
      intent: "some_intent",
      inventory: { "item1": 15 },
      state: {
        salesHistory: {
          "item1": [1, 1, 1, 1, 1, 1, 3] // avg 1.28, spike at 3
        }
      }
    },
    expected: "INCREASE_STOCK"
  },
  {
    name: "Case 6: Suggest New Product",
    input: {
      intent: "some_intent",
      state: {
        missedDemand: {
          "new_item": { count: 3, lastSeen: 123 }
        }
      }
    },
    expected: "SUGGEST_NEW_PRODUCT"
  },
  {
    name: "Case 7: Null (No decision)",
    input: {
      intent: "hello"
    },
    expected: null
  }
];

let allPassed = true;

for (const test of tests) {
  const result = processDecision(test.input);
  const type = result ? result.type : null;
  if (type !== test.expected) {
    console.error(`❌ ${test.name} FAILED: Expected ${test.expected}, got ${type}`);
    console.error(`Output:`, result);
    allPassed = false;
  } else {
    console.log(`✅ ${test.name} PASSED`);
  }
}

if (allPassed) {
  console.log("All tests passed successfully!");
}
