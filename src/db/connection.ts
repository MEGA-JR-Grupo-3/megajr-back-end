// src/db/connection.ts
import pkg from "pg";
const { Pool } = pkg;
import dotenv from "dotenv";

dotenv.config();

async function createDatabaseConnectionPool() {
  const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : undefined,
  });

  try {
    await pool.connect();
    console.log("Pool de conexão PostgreSQL criado e conectado com sucesso!");
  } catch (error) {
    console.error(
      "Erro ao conectar ao banco de dados PostgreSQL usando o pool:",
      error
    );
    process.exit(1);
  }

  return pool;
}

export const dbPromise = createDatabaseConnectionPool();
