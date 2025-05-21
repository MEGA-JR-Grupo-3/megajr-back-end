import app from "./app";
import dotenv from "dotenv";

dotenv.config();

const PORT = process.env.PORT || 8800;

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

import { Pool } from 'pg';

// Configuração da conexão (similar ao mysql2)
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'meu_banco',
  password: 'senha',
  port: 5432,
});

// Consulta com async/await
async function getUsers() {
  const { rows } = await pool.query('SELECT * FROM users');
  return rows;
}

// Transação
async function transferFunds(fromId: any, toId: any, amount: any) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE accounts SET balance = balance - $1 WHERE id = $2', [amount, fromId]);
    await client.query('UPDATE accounts SET balance = balance + $1 WHERE id = $2', [amount, toId]);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}