require("dotenv").config();
const express = require("express");
const cors = require("cors");

const speechRoutes = require("./src/routes/speechRoutes");
const aiRoutes = require("./src/routes/aiRoutes");

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api", speechRoutes);

// AI Core endpoints
app.use("/", aiRoutes);

const PORT = 8000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});