import express from "express";
import { handleWhatsapp } from "../controllers/whatsapp.controller.js";

const router = express.Router();

router.post("/", handleWhatsapp);

export default router;