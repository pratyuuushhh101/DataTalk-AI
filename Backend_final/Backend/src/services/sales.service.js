import { getPool } from "../config/db.js";

export const logTransaction = async (product, quantity, customPrice = null) => {
  const pool = getPool();

  const transaction = pool.transaction();

  // 1. Wait for begin() BEFORE entering the try block.
  // If connection fails here, it throws safely without triggering a dummy rollback.
  await transaction.begin();

  try {
    const request = transaction.request();

    // 1. Fetch product from inventory (using deterministic normalized ID)
    const result = await request
      .input("norm", product)
      .query(`SELECT * FROM inventory WHERE product_normalized = @norm`);

    if (result.recordset.length === 0) {
      throw new Error(`Product "${product}" not found in inventory`);
    }

    const item = result.recordset[0];
    const actualProductName = item.product; // The exact name from DB

    // Added support for dynamic price overrides securely via the AI Validation Shield
    const { selling_price, unit_cost, current_stock, reorder_threshold, category } = item;
    const final_price = customPrice !== null ? customPrice : selling_price;

    // 2. Check stock
    if (quantity > current_stock) {
      throw new Error("Insufficient stock");
    }

    // 3. Compute values
    const revenue = quantity * final_price;
    const total_cost = quantity * unit_cost;
    const profit = revenue - total_cost;
    const region = 'Local'; // Defaulting to Local for a kirana store

    // 4. Insert into sales_data
    await request
      .input("product_name", actualProductName)
      .input("quantity", quantity)
      .input("revenue", revenue)
      .input("total_cost", total_cost)
      .input("profit", profit)
      .input("category", category)
      .input("region", region)
      .query(`
        INSERT INTO sales_data (product, quantity, revenue, total_cost, profit, category, region, transaction_date)
        VALUES (@product_name, @quantity, @revenue, @total_cost, @profit, @category, @region, GETDATE())
      `);

    const new_stock = current_stock - quantity;

    // 5. Update inventory
    await request
      .input("new_stock", new_stock)
      .input("norm_update", product)
      .query(`
        UPDATE inventory
        SET current_stock = @new_stock
        WHERE product_normalized = @norm_update
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