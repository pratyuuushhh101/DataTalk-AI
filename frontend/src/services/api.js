import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// 

// --- MOCK UPLOAD FUNCTION ---
export const uploadFile = async (file) => {
    console.log("Mocking upload for:", file.name);

    // Simulate a 1.5-second network delay for your loading spinners
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({ success: true, message: "Dataset uploaded successfully." });
        }, 1500);
    });
};

// export const runQuery = async (question, language) => {
//     try {
//         const response = await api.post('/query', { question, language });

//         // Validate response structure before returning
//         const { sql, data } = response.data;

//         if (typeof sql === 'undefined' || !Array.isArray(data)) {
//             throw new Error("Invalid response format received from backend.");
//         }

//         return response.data;
//     } catch (error) {
//         console.error("Query error:", error);
//         throw new Error(error.response?.data?.message || 'Failed to analyze data. Ensure the query is valid and the backend is reachable.');
//     }
// };

// export default api;
export const runQuery = async (question, language) => {
    console.log(`Mocking AI query: "${question}" in language: ${language}`);

    // Simulate a 1.5-second AI processing delay so you can see your loading spinners
    return new Promise((resolve) => {
        setTimeout(() => {
            const lowerQ = question.toLowerCase();
            let mockResponse = {};

            // TEST 1: REVENUE BY REGION (Triggers Bar Chart)
            if (lowerQ.includes("revenue by region")) {
                mockResponse = {
                    sql: "SELECT region, SUM(revenue) as total_revenue FROM sales_data GROUP BY region;",
                    data: [
                        { region: 'Karnataka', total_revenue: 106000 },
                        { region: 'Maharashtra', total_revenue: 74000 },
                        { region: 'Delhi', total_revenue: 39500 },
                        { region: 'Tamil Nadu', total_revenue: 25000 }
                    ],
                    insight: "Karnataka is your top-performing region, driving the majority of total revenue, followed closely by Maharashtra."
                };
            }
            // TEST 2: DAILY PROFIT TREND (Triggers Line Chart)
            else if (lowerQ.includes("profit trend") || lowerQ.includes("daily")) {
                mockResponse = {
                    sql: "SELECT transaction_date, SUM(profit) as daily_profit FROM sales_data GROUP BY transaction_date ORDER BY transaction_date;",
                    data: [
                        { transaction_date: '2026-01-01', daily_profit: 9995 },
                        { transaction_date: '2026-01-02', daily_profit: 8750 },
                        { transaction_date: '2026-01-03', daily_profit: 12500 },
                        { transaction_date: '2026-01-04', daily_profit: 10500 },
                        { transaction_date: '2026-01-05', daily_profit: 14200 }
                    ],
                    insight: "Daily profits have shown a steady upward trend over the first five days of January, peaking on the 5th."
                };
            }
            // TEST 3: QUANTITY BY CATEGORY (Triggers Pie Chart)
            else if (lowerQ.includes("category") || lowerQ.includes("quantity")) {
                mockResponse = {
                    sql: "SELECT category, SUM(quantity) as total_quantity FROM sales_data GROUP BY category;",
                    data: [
                        { category: 'Stationery', total_quantity: 505 },
                        { category: 'Electronics', total_quantity: 122 },
                        { category: 'Furniture', total_quantity: 45 }
                    ],
                    insight: "Stationery drives the highest volume of sales, accounting for over 70% of total items moved."
                };
            }
            // FALLBACK: Default response for any other question
            else {
                mockResponse = {
                    sql: "SELECT TOP 5 transaction_date, product, revenue, profit FROM sales_data ORDER BY revenue DESC;",
                    data: [
                        { transaction_date: '2026-01-28', product: 'Standing Desk', revenue: 54000, profit: 18000 },
                        { transaction_date: '2026-01-01', product: 'Office Chair', revenue: 35000, profit: 9995 },
                        { transaction_date: '2026-01-04', product: 'Ergonomic Keyboard', revenue: 33000, profit: 10500 }
                    ],
                    insight: "Here are your top transactions by revenue. High-ticket furniture items are driving significant profit margins."
                };
            }

            resolve(mockResponse);
        }, 1500);
    });
};
