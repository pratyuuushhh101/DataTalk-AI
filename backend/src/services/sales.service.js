import { getPool } from "../config/db.js";

/**
 * Logs a sales transaction into sales_data and updates inventory atomically.
 *
 * Accepts EITHER an object or positional args (backward compatible).
 *
 * Object form (preferred):
 *   logTransaction({ product, quantity, customPrice, bill_id })
 *
 * Positional form (legacy, still works):
 *   logTransaction(product, quantity, customPrice, billId)
 *
 * @param {object|string} argsOrProduct
 * @param {number} [quantity]
 * @param {number|null} [customPrice]
 * @param {string|null} [billId]
 * @returns {Promise<{ message: string, product: string, quantity: number, profit: number, alert?: string }>}
 */
export const logTransaction = async (argsOrProduct, quantity, customPrice = null, billId = null) => {
  // ── Backward Compatible Argument Parsing ──
  let product, qty, price, bill_id;

  if (typeof argsOrProduct === "object" && argsOrProduct !== null && !Array.isArray(argsOrProduct)) {
    // New object-based call: logTransaction({ product, quantity, bill_id })
    product = argsOrProduct.product;
    qty = argsOrProduct.quantity;
    price = argsOrProduct.customPrice ?? null;
    bill_id = argsOrProduct.bill_id ?? null;
  } else {
    // Legacy positional call: logTransaction(product, qty, customPrice, billId)
    product = argsOrProduct;
    qty = quantity;
    price = customPrice;
    bill_id = billId;
  }

  if (!product || !qty) {
    throw new Error("logTransaction requires 'product' and 'quantity'.");
  }

  const pool = getPool();
  const transaction = pool.transaction();

  // Wait for begin() BEFORE entering the try block.
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

    const { selling_price, unit_cost, current_stock, reorder_threshold, category } = item;
    const final_price = price !== null ? price : selling_price;

    // 2. Check stock
    if (qty > current_stock) {
      throw new Error("Insufficient stock");
    }

    // 3. Compute values
    const revenue = qty * final_price;
    const total_cost = qty * unit_cost;
    const profit = revenue - total_cost;
    const region = 'Local'; // Defaulting to Local for a kirana store

    // 4. Insert into sales_data
    await request
      .input("product_name", actualProductName)
      .input("quantity", qty)
      .input("revenue", revenue)
      .input("total_cost", total_cost)
      .input("profit", profit)
      .input("category", category)
      .input("region", region)
      .input("bill_id", bill_id)
      .query(`
        INSERT INTO sales_data (product, quantity, revenue, total_cost, profit, category, region, transaction_date, bill_id)
        VALUES (@product_name, @quantity, @revenue, @total_cost, @profit, @category, @region, GETDATE(), @bill_id)
      `);

    const new_stock = current_stock - qty;

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
      quantity: qty,
      profit,
      new_stock,
      ...(alert && { alert })
    };

  } catch (err) {
    // Rollback safely. Ignore rollback error if transaction is already dead/aborted.
    try {
      await transaction.rollback();
    } catch (rollbackErr) {
      console.error("Rollback failed (likely due to disconnected/aborted transaction):", rollbackErr.message);
    }
    throw err;
  }
};

/**
 * Fetches all items associated with a bill_id from sales_data.
 *
 * @param {string} billId - The bill_id to look up
 * @returns {Promise<Array<{ product: string, quantity: number }>>}
 */
export const getItemsByBillId = async (billId) => {
  const pool = getPool();

  const result = await pool.request()
    .input("bill_id", billId)
    .query(`
      SELECT product, quantity
      FROM sales_data
      WHERE bill_id = @bill_id
    `);

  return result.recordset || [];
};