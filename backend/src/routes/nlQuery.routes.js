import express from "express";
import { handleNLQuery } from "../controllers/nlQuery.controller.js";
import { validateNLQueryBody } from "../middleware/nlQueryValidation.middleware.js";
import { validateSQL } from "../middleware/sqlValidation.middleware.js";


const router = express.Router();

router.post(
  "/",
  validateNLQueryBody,
  handleNLQuery
);

export default router;