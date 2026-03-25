import express from "express";

const app = express();
app.use(express.json());

app.post("/generate-sql", (req, res) => {
  res.json({
    sql: "SELECT product, SUM(profit) as total_profit FROM sales_data GROUP BY product"
  });
});

app.post("/generate-insight", (req, res) => {
  res.json({
    insight: "### Insight\nProduct A is generating the highest profit."
  });
});

app.listen(8000, () => {
  console.log("Mock AI Core running on port 8000");
});