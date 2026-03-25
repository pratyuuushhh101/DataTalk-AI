export const validateSQL = (req, res, next) => {
  const { sql } = req.body;

  if (!sql) {
    return res.status(400).json({ error: "SQL query required" });
  }

  const trimmed = sql.trim();
  const upper = trimmed.toUpperCase();

  // Must start with SELECT
  if (!upper.startsWith("SELECT")) {
    return res.status(400).json({ error: "Only SELECT queries allowed" });
  }

  // Block multiple statements
  if (upper.includes(";")) {
    return res.status(400).json({ error: "Multiple statements not allowed" });
  }

  // Block dangerous keywords
  const forbidden = [
    "DROP",
    "DELETE",
    "UPDATE",
    "ALTER",
    "INSERT",
    "TRUNCATE",
    "EXEC",
    "MERGE",
    "CREATE"
  ];

  for (const keyword of forbidden) {
    if (upper.includes(keyword)) {
      return res.status(400).json({
        error: `Forbidden keyword detected: ${keyword}`
      });
    }
  }

  // Block SQL comments
  if (upper.includes("--") || upper.includes("/*")) {
    return res.status(400).json({
      error: "SQL comments are not allowed"
    });
  }

  next();
};