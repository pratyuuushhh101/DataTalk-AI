require("dotenv").config();
const express = require("express");
const cors = require("cors");

const speechRoutes = require("./src/routes/speechRoutes");
const aiRoutes = require("./src/routes/aiRoutes");
const festivalRoutes = require("./src/routes/festivalRoutes");

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use("/api", speechRoutes);
app.use("/api/festival", festivalRoutes);

// AI Core endpoints
app.use("/", aiRoutes);

const PORT = 8000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});