import { getPool } from "../config/db.js";

export const findBestSupplier = async (product, quantity) => {
  const pool = getPool();

  const result = await pool.request()
    .input("product", product)
    .query(`
      SELECT supplier_name, product, wholesale_price, phone_number
      FROM suppliers
      WHERE product = @product
      ORDER BY wholesale_price ASC
    `);

  if (result.recordset.length === 0) {
    throw new Error(`No supplier found for ${product}`);
  }

  const primarySupplier = result.recordset[0];
  const fallbackSupplier = result.recordset.length > 1 ? result.recordset[1] : null;

  const totalCost = quantity * primarySupplier.wholesale_price;

  const message = encodeURIComponent(`Hi, I need ${quantity} ${product}`);
  const link = `https://wa.me/${primarySupplier.phone_number}?text=${message}`;

  return {
    primarySupplier,
    fallbackSupplier,
    totalCost,
    link
  };
};
