import express from "express";
import { handleAnalyzeQuery } from "../controllers/analyze.controller.js";

const router = express.Router();

router.post("/", handleAnalyzeQuery);

export default router;
