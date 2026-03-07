import { getReadPool } from "../config/db.js";

export const handleQuery = async (req, res) => {
  const { sql } = req.body;

  try {
    const pool = getReadPool();

    const request = pool.request();
    request.timeout = 5000;

    const result = await request.query(`
      SELECT TOP 100 * FROM (
        ${sql}
      ) AS safe_query
    `);

    return res.json({
      rowsReturned: result.recordset.length,
      data: result.recordset
    });

  } catch (err) {
    return res.status(400).json({
      error: err.message
    });
  }
};