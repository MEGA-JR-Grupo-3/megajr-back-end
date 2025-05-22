// src/db/connection.ts
import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

async function createDatabaseConnectionPool() {
  const databaseUrl = process.env.DATABASE_URL as string;

  if (!databaseUrl) {
    console.error("Variável de ambiente DATABASE_URL não definida!");
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  try {
    await pool.query("SELECT 1");
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
