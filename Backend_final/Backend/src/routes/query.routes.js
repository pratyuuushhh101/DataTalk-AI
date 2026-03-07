import express from "express";
import { handleQuery } from "../controllers/query.controller.js";
import { validateQueryBody } from "../middleware/queryValidation.middleware.js";
import { validateSQL } from "../middleware/sqlValidation.middleware.js";


const router = express.Router();

router.post(
  "/",
  validateQueryBody,
  validateSQL,
  handleQuery
);

export default router;