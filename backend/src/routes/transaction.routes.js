import express from "express";
import { handleTransaction } from "../controllers/transaction.controller.js";

const router = express.Router();

router.post("/transaction", handleTransaction);

export default router;