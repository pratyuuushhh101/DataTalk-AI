import sql from "mssql";
import dotenv from "dotenv";

dotenv.config();

const baseConfig = {
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  port: parseInt(process.env.DB_PORT),
  options: {
    encrypt: true,
    trustServerCertificate: false
  }
};

let adminPool;
let readPool;

export const connectDB = async () => {
  try {
    adminPool = await sql.connect({
      ...baseConfig,
      user: process.env.ADMIN_DB_USER,
      password: process.env.ADMIN_DB_PASSWORD
    });

    console.log("Admin DB Connected");

    readPool = await new sql.ConnectionPool({
      ...baseConfig,
      user: process.env.READ_DB_USER,
      password: process.env.READ_DB_PASSWORD
    }).connect();

    console.log("Read-only DB Connected");

  } catch (err) {
    console.error("DB Connection Failed:", err);
  }
};

export const getAdminPool = () => adminPool;
export const getReadPool = () => readPool;