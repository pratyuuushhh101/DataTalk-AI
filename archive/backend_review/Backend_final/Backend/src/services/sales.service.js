import { getPool } from "../config/db.js";

export const logTransaction = async (product, quantity) => {
  const pool = getPool();

  const transaction = pool.transaction();

  // 1. Wait for begin() BEFORE entering the try block.
  // If connection fails here, it throws safely without triggering a dummy rollback.
  await transaction.begin();

  try {
    const request = transaction.request();

    // 1. Fetch product from inventory
    const result = await request
      .input("product", product)
      .query(`SELECT * FROM inventory WHERE product = @product`);

    if (result.recordset.length === 0) {
      throw new Error("Product not found in inventory");
    }

    const item = result.recordset[0];

    const { selling_price, unit_cost, current_stock, reorder_threshold } = item;

    // 2. Check stock
    if (quantity > current_stock) {
      throw new Error("Insufficient stock");
    }

    // 3. Compute values
    const revenue = quantity * selling_price;
    const total_cost = quantity * unit_cost;
    const profit = revenue - total_cost;

    // 4. Insert into sales_data
    await request
      .input("quantity", quantity)
      .input("revenue", revenue)
      .input("total_cost", total_cost)
      .input("profit", profit)
      .query(`
        INSERT INTO sales_data (product, quantity, revenue, total_cost, profit)
        VALUES (@product, @quantity, @revenue, @total_cost, @profit)
      `);

    const new_stock = current_stock - quantity;

    // 5. Update inventory
    await request
      .input("new_stock", new_stock)
      .query(`
        UPDATE inventory
        SET current_stock = @new_stock
        WHERE product = @product
      `);

    await transaction.commit();

    let alert;
    if (new_stock < reorder_threshold) {
      alert = `⚠️ ${product} stock low (${new_stock} left)`;
    }

    return {
      message: "Transaction logged",
      product,
      quantity,
      profit,
      ...(alert && { alert })
    };

  } catch (err) {
    // 6. Rollback safely. Ignore rollback error if transaction is already dead/aborted.
    try {
      await transaction.rollback();
    } catch (rollbackErr) {
      console.error("Rollback failed (likely due to disconnected/aborted transaction):", rollbackErr.message);
    }
    throw err;
  }
};