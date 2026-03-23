import { getPool } from "../config/db.js";

export const findBestSupplier = async (product, quantity) => {
  const pool = getPool();

  const safeQty = (isNaN(parseInt(quantity)) || quantity === null) ? 1 : parseInt(quantity);

  const result = await pool.request()
    .input("norm", product)
    .query(`
      SELECT TOP 2 supplier_name, product, wholesale_price, phone_number, ISNULL(credit_days, 0) as credit_days, delivery_days
      FROM suppliers
      WHERE product_normalized = @norm
      ORDER BY 
        CASE WHEN ISNULL(credit_days, 0) > 0 THEN 0 ELSE 1 END ASC, 
        wholesale_price ASC
    `);

  if (result.recordset.length === 0) {
    throw new Error(`No supplier found for "${product}"`);
  }

  const primarySupplier = result.recordset[0];
  const exactProductName = primarySupplier.product;

  const totalCost = safeQty * primarySupplier.wholesale_price;

  const message = encodeURIComponent(`Hi, I need ${safeQty} ${exactProductName}`);
  const link = `https://wa.me/${primarySupplier.phone_number}?text=${message}`;

  return {
    primarySupplier,
    totalCost,
    link
  };
};
