import mysql from "mysql2/promise";

async function createDatabaseConnection() {
  const db = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "98468831Ee@",
    database: "dbjubitasks",
  });
  return db;
}

export const dbPromise = createDatabaseConnection();
