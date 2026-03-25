import { z } from "zod";

const nlQuerySchema = z.object({
  question: z
    .string()
    .min(1, "Question cannot be empty")
});

export const validateNLQueryBody = (req, res, next) => {
  try {
    nlQuerySchema.parse(req.body);
    next();
  } catch (err) {
    return res.status(400).json({
     error: err.issues?.[0]?.message || "Invalid request body"
    });
  }
};