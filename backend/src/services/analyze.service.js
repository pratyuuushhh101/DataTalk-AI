import { getPool } from "../config/db.js";

const FORBIDDEN_KEYWORDS = [
  "DROP",
  "DELETE",
  "UPDATE",
  "ALTER",
  "INSERT",
  "TRUNCATE",
  "EXEC",
  "CREATE"
];

export const validateSQL = (sql) => {
  if (!sql) throw new Error("SQL cannot be empty");
  
  const formattedSql = sql.trim();
  const upperSql = formattedSql.toUpperCase();

  if (!upperSql.startsWith("SELECT")) {
    throw new Error("Only SELECT queries are allowed");
  }

  for (const keyword of FORBIDDEN_KEYWORDS) {
    // Boundary check to prevent blocking valid column names like 'DROP_DATE'
    const regex = new RegExp(`\\b${keyword}\\b`, "i");
    if (regex.test(formattedSql)) {
      throw new Error(`Unsafe query detected. Keyword not allowed: ${keyword}`);
    }
  }

  return formattedSql;
};

export const executeValidatedSQL = async (sql) => {
  const pool = getPool();
  const request = pool.request();
  request.timeout = 5000;

  try {
    const result = await request.query(sql);
    return result.recordset || [];
  } catch (err) {
    throw new Error(`Database Error: ${err.message}`);
  }
};
