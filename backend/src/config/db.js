import sql from "mssql";
import dotenv from "dotenv";

dotenv.config();

const dbConfig = {
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT) || 1433,
  options: {
    encrypt: true,
    trustServerCertificate: false
  }
};

let pool;

export const connectDB = async () => {
  console.log("DB CONFIG:", {
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME
  });

  if (!process.env.DB_SERVER) {
    console.error("Missing DB_SERVER environment variable");
    throw new Error("The config.server property is required");
  }
  if (!process.env.DB_NAME) {
    console.error("Missing DB_NAME environment variable");
    throw new Error("Missing DB_NAME environment variable");
  }
  if (!process.env.DB_USER) {
    console.error("Missing DB_USER environment variable");
    throw new Error("Missing DB_USER environment variable");
  }
  if (!process.env.DB_PASSWORD) {
    console.error("Missing DB_PASSWORD environment variable");
    throw new Error("Missing DB_PASSWORD environment variable");
  }

  try {
    pool = await sql.connect(dbConfig);
    console.log("✅ Connected to Azure SQL");
  } catch (err) {
    console.error("❌ DB Connection Failed:", err.message);
    throw err;
  }
};

// Guarantee the pool is valid before anything uses it
export const getPool = () => {
  if (!pool) {
    throw new Error("❌ Database Connection Pool is not initialized!");
  }
  return pool;
};