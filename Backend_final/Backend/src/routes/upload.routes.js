import express from "express";
import multer from "multer";
import { handleUpload } from "../controllers/upload.controller.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

router.post("/", upload.single("file"), handleUpload);

export default router;