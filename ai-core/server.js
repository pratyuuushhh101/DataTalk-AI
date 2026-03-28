require("dotenv").config();
const express = require("express");
const cors = require("cors");

const speechRoutes = require("./src/routes/speechRoutes");
const aiRoutes = require("./src/routes/aiRoutes");
const { processEvent } = require('./src/services/pipeline.service.js');

// Global Exception Handlers to prevent server exit
process.on("uncaughtException", console.error);
process.on("unhandledRejection", console.error);

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use("/api", speechRoutes);

// AI Core endpoints
app.use("/", aiRoutes);

// Intelligence Core Pipeline
app.post("/event", (req, res) => {
    const output = processEvent(req.body);
    res.json(output);
});

console.log("Booting AI-Core...");
const PORT = process.env.PORT || 8000;

const server = app.listen(PORT, () => {
  console.log(`AI-Core running on port ${PORT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.warn(`[WARNING] Port ${PORT} is already occupied.`);
  } else {
    console.error(err);
  }
});