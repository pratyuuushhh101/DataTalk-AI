import sql from "mssql";
import dotenv from "dotenv";
dotenv.config();

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    options: {
        encrypt: true,
        trustServerCertificate: false
    }
};

let pool;

export const connectDB = async () => {
    if (pool) return pool;

    try {
        pool = await sql.connect(config);
        console.log("✅ Azure SQL Connected");
        return pool;
    } catch (err) {
        console.error("❌ DB Connection Failed", err);
        throw err;
    }
};

export const getPool = () => {
    if (!pool) throw new Error("DB Pool not initialized");
    return pool;
};
