import sql from "mssql";
import dotenv from "dotenv";
dotenv.config();

const baseConfig = {
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    options: { encrypt: true, trustServerCertificate: false }
};

sql.connect(baseConfig).then(() => {
    console.log("SUCCESS");
    process.exit(0);
}).catch(err => {
    console.error("FAIL:", err);
    process.exit(1);
});
