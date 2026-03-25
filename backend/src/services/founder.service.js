// ──────────────────────────────────────────────────────────────────────────────
// Founder Kit Service — DEMO ONLY
//
// Simulates an intelligent "starter plan" recommendation engine.
// ALL data is hardcoded. No DB, no Redis, no AI, no randomness.
// Same input → same output. Always.
// ──────────────────────────────────────────────────────────────────────────────

const SCENARIOS = {

    // ─── Scenario 1: Student Area ─────────────────────────────────────────────
    low_budget_student_area: {
        scenario: "low_budget_student_area",
        title: "Student Area Starter Kit",
        budget: 10000,
        currency: "INR",
        recommended_products: [
            {
                product: "Maggi",
                quantity: 100,
                unit_cost: 10.0,
                investment: 1000,
                expected_margin: "40%",
                reason: "Top seller in student-heavy areas — fast turnover, repeat purchases daily",
            },
            {
                product: "Lays Classic",
                quantity: 80,
                unit_cost: 8.0,
                investment: 640,
                expected_margin: "25%",
                reason: "Highest impulse-buy snack — pairs with beverages for bundle sales",
            },
            {
                product: "Coca-Cola 500ml",
                quantity: 60,
                unit_cost: 25.0,
                investment: 1500,
                expected_margin: "60%",
                reason: "Strong upsell with Maggi + Lays — drives basket value up by 35%",
            },
            {
                product: "Parle-G",
                quantity: 200,
                unit_cost: 4.0,
                investment: 800,
                expected_margin: "25%",
                reason: "Lowest cost, highest volume biscuit — guaranteed daily demand",
            },
            {
                product: "Red Label Tea 250g",
                quantity: 30,
                unit_cost: 90.0,
                investment: 2700,
                expected_margin: "33%",
                reason: "Essential for hostel residents — consistent repeat purchase every 2 weeks",
            },
            {
                product: "Tata Salt 1kg",
                quantity: 40,
                unit_cost: 15.0,
                investment: 600,
                expected_margin: "67%",
                reason: "Non-negotiable essential — every household needs salt, zero price sensitivity",
            },
            {
                product: "Amul Milk 1L",
                quantity: 50,
                unit_cost: 55.0,
                investment: 2750,
                expected_margin: "18%",
                reason: "Daily essential for tea/coffee — drives foot traffic every morning",
            },
        ],
        total_investment: 9990,
        estimated_daily_revenue: 1800,
        estimated_monthly_profit: 12600,
        payback_period: "24 days",
        strategy: [
            "Stock heavy on Maggi + Lays + Coke — this trio drives 60% of student spend",
            "Place Coca-Cola next to Maggi on shelf — customers who buy one grab the other",
            "Keep Parle-G visible at counter — low cost, high impulse add-on",
            "Reorder Maggi and Lays every 3 days — they sell out fastest",
        ],
        summary: "Optimized for high-turnover snacks and beverages in student-dense areas. Focus on impulse purchases and bundle opportunities. Budget allocated 70% to fast-moving items, 30% to daily essentials.",
    },

    // ─── Scenario 2: Residential Area ─────────────────────────────────────────
    medium_budget_residential: {
        scenario: "medium_budget_residential",
        title: "Residential Area Starter Kit",
        budget: 25000,
        currency: "INR",
        recommended_products: [
            {
                product: "Aashirvaad Atta 5kg",
                quantity: 30,
                unit_cost: 180.0,
                investment: 5400,
                expected_margin: "22%",
                reason: "Staple purchase for families — every household buys atta monthly",
            },
            {
                product: "Fortune Sunflower Oil 1L",
                quantity: 25,
                unit_cost: 110.0,
                investment: 2750,
                expected_margin: "27%",
                reason: "Second most purchased staple — high ticket, consistent demand",
            },
            {
                product: "Amul Milk 1L",
                quantity: 80,
                unit_cost: 55.0,
                investment: 4400,
                expected_margin: "18%",
                reason: "Daily essential — drives morning foot traffic, builds customer habit",
            },
            {
                product: "Tata Salt 1kg",
                quantity: 60,
                unit_cost: 15.0,
                investment: 900,
                expected_margin: "67%",
                reason: "Highest margin essential — every family needs it, zero substitution",
            },
            {
                product: "Red Label Tea 250g",
                quantity: 40,
                unit_cost: 90.0,
                investment: 3600,
                expected_margin: "33%",
                reason: "Morning ritual product — repeat purchase every 10-15 days per household",
            },
            {
                product: "Maggi",
                quantity: 80,
                unit_cost: 10.0,
                investment: 800,
                expected_margin: "40%",
                reason: "Kids' favourite — parents buy in bulk, high repeat rate",
            },
            {
                product: "Parle-G",
                quantity: 150,
                unit_cost: 4.0,
                investment: 600,
                expected_margin: "25%",
                reason: "Goes with every cup of chai — automatic add-on to tea purchases",
            },
            {
                product: "Lays Classic",
                quantity: 60,
                unit_cost: 8.0,
                investment: 480,
                expected_margin: "25%",
                reason: "Weekend snack favourite — demand spikes on Saturdays and holidays",
            },
            {
                product: "Coca-Cola 500ml",
                quantity: 40,
                unit_cost: 25.0,
                investment: 1000,
                expected_margin: "60%",
                reason: "Premium upsell opportunity — highest margin per unit in the store",
            },
        ],
        total_investment: 19930,
        estimated_daily_revenue: 3200,
        estimated_monthly_profit: 22400,
        payback_period: "27 days",
        strategy: [
            "Lead with staples (Atta, Oil, Salt) — they bring families in daily",
            "Cross-sell snacks near the billing counter — Maggi, Lays, Coke as impulse adds",
            "Milk is your foot-traffic driver — stock enough for morning + evening demand",
            "Bundle Tea + Parle-G at a visible shelf — chai-biscuit is the strongest pairing in India",
            "Keep ₹5,000 reserve for emergency restocking of fast-moving items",
        ],
        summary: "Balanced mix of staples and snacks for family-oriented residential areas. Budget split: 65% essentials (atta, oil, milk, salt, tea), 35% high-margin snacks and beverages. Designed for steady daily footfall with strong repeat purchase rates.",
    },
};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns a complete starter plan for a given scenario.
 * Pure function. No side effects. No external calls.
 *
 * @param {string} scenario - One of: "low_budget_student_area", "medium_budget_residential"
 * @returns {{ scenario, title, budget, recommended_products, summary, ... } | null}
 */
export const getStarterPlan = (scenario) => {
    const plan = SCENARIOS[scenario];

    if (!plan) {
        return {
            error: "Unknown scenario",
            available: Object.keys(SCENARIOS),
        };
    }

    return plan;
};

/**
 * Returns the list of all available scenarios (for frontend dropdowns).
 */
export const getAvailableScenarios = () => {
    return Object.keys(SCENARIOS).map(key => ({
        id: key,
        title: SCENARIOS[key].title,
        budget: SCENARIOS[key].budget,
    }));
};

export default { getStarterPlan, getAvailableScenarios };
