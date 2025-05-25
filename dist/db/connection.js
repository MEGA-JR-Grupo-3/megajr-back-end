// src/db/connection.ts
import { Pool } from "pg";
import dotenv from "dotenv";
dotenv.config();
async function createDatabaseConnectionPool() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("Vari\xE1vel de ambiente DATABASE_URL n\xE3o est\xE1 definida!");
    process.exit(1);
  }
  const pool = new Pool({
    connectionString: databaseUrl,
    max: 10,
    idleTimeoutMillis: 3e4,
    connectionTimeoutMillis: 2e3
  });
  try {
    await pool.query("SELECT 1");
    console.log("Pool de conex\xE3o PostgreSQL criado e conectado com sucesso!");
  } catch (error) {
    console.error(
      "Erro ao conectar ao banco de dados PostgreSQL usando o pool:",
      error
    );
    process.exit(1);
  }
  return pool;
}
var dbPromise = createDatabaseConnectionPool();
export {
  dbPromise
};
