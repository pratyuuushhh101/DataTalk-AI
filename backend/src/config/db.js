import sql from "mssql";
import dotenv from "dotenv";

dotenv.config();

const config = {
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: {
    encrypt: true,
    trustServerCertificate: false
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

let pool;

export const connectDB = async () => {
  try {
    pool = await sql.connect(config);
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