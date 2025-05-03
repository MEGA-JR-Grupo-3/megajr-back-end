import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

async function createDatabaseConnection() {
  const db = await mysql.createConnection(process.env.DATABASE_URL as string);
  return db;
}

export const dbPromise = createDatabaseConnection();
