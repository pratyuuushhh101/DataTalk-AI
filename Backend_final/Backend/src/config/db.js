import sql from "mssql";
import dotenv from "dotenv";

dotenv.config();

const baseConfig = {
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: {
    encrypt: true,
    trustServerCertificate: false
  }
};

let adminPool;
let readPool;

export const connectDB = async () => {
  try {
    adminPool = await sql.connect(baseConfig);
    console.log("Admin DB Connected");

    readPool = await new sql.ConnectionPool(baseConfig).connect();
    console.log("Read-only DB Connected");

  } catch (err) {
    console.error("DB Connection Failed:", err);
    throw err;
  }
};

export const getAdminPool = () => adminPool;
export const getReadPool = () => readPool;
