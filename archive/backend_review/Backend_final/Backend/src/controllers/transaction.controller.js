import { logTransaction } from "../services/sales.service.js";

export const handleTransaction = async (req, res) => {
  try {
    const { product, quantity } = req.body;

    const result = await logTransaction(product, quantity);

    res.status(200).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};