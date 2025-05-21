// src/db/connection.ts
import dotenv from "dotenv";

dotenv.config();

// async function createDatabaseConnectionPool() {
  // const pool = psql.createPool({
  //   uri: process.env.DATABASE_URL as string,
  //   waitForConnections: true,
  //   connectionLimit: 10,
  //   queueLimit: 0,
  // });

//   try {
//     await pool.getConnection();
//     console.log("Pool de conexão MySQL criado e conectado com sucesso!");
//   } catch (error) {
//     console.error("Erro ao conectar ao banco de dados usando o pool:", error);
//     process.exit(1);
//   }

//   return pool;
// }

// export const dbPromise = createDatabaseConnectionPool();
