import { z } from "zod";

const querySchema = z.object({
  sql: z
    .string()
    .min(1, "SQL query cannot be empty")
});

export const validateQueryBody = (req, res, next) => {
  try {
    querySchema.parse(req.body);
    next();
  } catch (err) {
    return res.status(400).json({
      error: err.issues?.[0]?.message || "Invalid request body"
    });
  }
};