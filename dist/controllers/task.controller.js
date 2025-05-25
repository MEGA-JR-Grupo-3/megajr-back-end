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

// src/controllers/task.controller.ts
var searchTasks = async (req, res) => {
  try {
    const { email, query } = req.body;
    if (!email || typeof email !== "string" || !query || typeof query !== "string") {
      return res.status(400).json({
        message: "Email do usu\xE1rio e termo de pesquisa (query) s\xE3o obrigat\xF3rios e devem ser strings."
      });
    }
    const db = await dbPromise;
    const userResult = await db.query(
      "SELECT id_usuario FROM usuario WHERE email = $1",
      [email]
    );
    const userRows = userResult.rows;
    if (userRows.length === 0) {
      return res.status(404).json({ message: "Usu\xE1rio n\xE3o encontrado." });
    }
    const userId = userRows[0].id_usuario;
    const sql = "SELECT * FROM tarefa WHERE id_usuario = $1 AND titulo ILIKE $2";
    const searchTerm = `%${query}%`;
    const tasksResult = await db.query(sql, [userId, searchTerm]);
    const results = tasksResult.rows;
    if (results.length > 0) {
      return res.status(200).json(results);
    } else {
      return res.status(200).json([]);
    }
  } catch (err) {
    console.error("Erro ao buscar tarefas:", err);
    return res.status(500).json({
      message: "Erro interno do servidor ao pesquisar tarefas.",
      error: err
    });
  }
};
var getTasksByUser = async (req, res) => {
  const { email } = req.body;
  console.log("-> getTasksByUser: Requisi\xE7\xE3o recebida para o email:", email);
  if (!email) {
    console.log(
      "-> getTasksByUser: Erro - Email n\xE3o fornecido no corpo da requisi\xE7\xE3o."
    );
    return res.status(400).json({ message: "Email do usu\xE1rio \xE9 obrigat\xF3rio." });
  }
  const db = await dbPromise;
  console.log("-> getTasksByUser: Pool de conex\xE3o obtido com sucesso.");
  const sql = `SELECT t.* FROM tarefa t JOIN usuario u ON t.id_usuario = u.id_usuario WHERE u.email = $1 ORDER BY t.ordem ASC`;
  console.log("-> getTasksByUser: SQL da consulta preparado.");
  try {
    console.log("-> getTasksByUser: Tentando executar a consulta SQL...");
    const tasksResult = await db.query(sql, [email]);
    const results = tasksResult.rows;
    console.log(
      "-> getTasksByUser: Consulta SQL executada com sucesso. Resultados:",
      results.length
    );
    return res.status(200).json(results);
  } catch (err) {
    console.error("-> getTasksByUser: ERRO CR\xCDTICO no bloco try-catch:", err);
    console.error("-> getTasksByUser: Mensagem de erro:", err.message);
    return res.status(500).json({
      message: "Erro ao buscar tarefas do usu\xE1rio",
      error: err.message || "Erro desconhecido"
    });
  }
};
var addTask = async (req, res) => {
  const { titulo, descricao, data_prazo, prioridade, estado_tarefa, email } = req.body;
  if (!titulo || !prioridade || !estado_tarefa || !email) {
    return res.status(400).json({
      message: "T\xEDtulo, prioridade, estado e email do usu\xE1rio s\xE3o obrigat\xF3rios."
    });
  }
  try {
    const db = await dbPromise;
    const userResult = await db.query(
      "SELECT id_usuario FROM usuario WHERE email = $1",
      [email]
    );
    const userRows = userResult.rows;
    if (!userRows || userRows.length === 0) {
      return res.status(404).json({ message: "Usu\xE1rio n\xE3o encontrado." });
    }
    const id_usuario = userRows[0].id_usuario;
    const sql = `
             INSERT INTO tarefa (titulo, descricao, data_prazo, prioridade, estado_tarefa, id_usuario)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id_tarefa;
         `;
    const taskInsertResult = await db.query(sql, [
      titulo,
      descricao,
      data_prazo || null,
      prioridade,
      estado_tarefa,
      id_usuario
    ]);
    const insertedTaskId = taskInsertResult.rows && taskInsertResult.rows.length > 0 ? taskInsertResult.rows[0].id_tarefa : null;
    return res.status(201).json({
      message: "Tarefa adicionada com sucesso!",
      insertId: insertedTaskId
    });
  } catch (err) {
    console.error("Erro ao adicionar tarefa:", err);
    return res.status(500).json({ message: "Erro ao adicionar tarefa", error: err });
  }
};
var deleteTask = async (req, res) => {
  const { id_tarefa } = req.params;
  const taskIdNum = parseInt(id_tarefa);
  if (isNaN(taskIdNum)) {
    return res.status(400).json({ message: "ID da tarefa inv\xE1lido." });
  }
  try {
    const db = await dbPromise;
    const deleteResult = await db.query(
      "DELETE FROM tarefa WHERE id_tarefa = $1",
      [taskIdNum]
    );
    if (deleteResult.rowCount > 0) {
      return res.status(200).json({ message: "Tarefa deletada com sucesso!" });
    } else {
      return res.status(404).json({ message: "Tarefa n\xE3o encontrada." });
    }
  } catch (err) {
    console.error("Erro ao deletar tarefa:", err);
    return res.status(500).json({ message: "Erro ao deletar tarefa", error: err });
  }
};
var updateTaskStatus = async (req, res) => {
  const { id_tarefa } = req.params;
  const { estado_tarefa } = req.body;
  const taskIdNum = parseInt(id_tarefa);
  if (isNaN(taskIdNum) || !estado_tarefa) {
    return res.status(400).json({
      message: "ID da tarefa e novo estado s\xE3o obrigat\xF3rios e v\xE1lidos."
    });
  }
  if (estado_tarefa !== "Pendente" && estado_tarefa !== "Finalizada") {
    return res.status(400).json({
      message: "Estado da tarefa deve ser 'Pendente' ou 'Finalizada'."
    });
  }
  try {
    const db = await dbPromise;
    const updateResult = await db.query(
      "UPDATE tarefa SET estado_tarefa = $1 WHERE id_tarefa = $2",
      [estado_tarefa, taskIdNum]
    );
    if (updateResult.rowCount > 0) {
      return res.status(200).json({ message: "Estado da tarefa atualizado com sucesso!" });
    } else {
      return res.status(404).json({ message: "Tarefa n\xE3o encontrada." });
    }
  } catch (err) {
    console.error("Erro ao atualizar estado da tarefa:", err);
    return res.status(500).json({ message: "Erro ao atualizar estado da tarefa", error: err });
  }
};
var updateTask = async (req, res) => {
  const { id_tarefa } = req.params;
  const { titulo, descricao, data_prazo, prioridade, estado_tarefa } = req.body;
  const taskIdNum = parseInt(id_tarefa);
  if (isNaN(taskIdNum) || !titulo || !prioridade || !estado_tarefa) {
    return res.status(400).json({
      message: "ID da tarefa, t\xEDtulo, prioridade e estado da tarefa s\xE3o obrigat\xF3rios e v\xE1lidos."
    });
  }
  try {
    const db = await dbPromise;
    const formattedDataPrazo = data_prazo ? new Date(data_prazo).toISOString().split("T")[0] : null;
    const sql = `
             UPDATE tarefa
             SET
               titulo = $1,
               descricao = $2,
               data_prazo = $3,
               prioridade = $4,
               estado_tarefa = $5
             WHERE
               id_tarefa = $6;
         `;
    const values = [
      titulo,
      descricao,
      formattedDataPrazo,
      prioridade,
      estado_tarefa,
      taskIdNum
    ];
    const updateResult = await db.query(sql, values);
    if (updateResult.rowCount > 0) {
      return res.status(200).json({ message: "Tarefa atualizada com sucesso!" });
    } else {
      return res.status(404).json({ message: "Tarefa n\xE3o encontrada." });
    }
  } catch (err) {
    console.error("Erro ao atualizar tarefa completa:", err);
    return res.status(500).json({ message: "Erro ao atualizar tarefa completa", error: err });
  }
};
var reorderTasks = async (req, res) => {
  const { email, tasks } = req.body;
  if (!email || !Array.isArray(tasks) || tasks.length === 0) {
    return res.status(400).json({
      message: "Dados inv\xE1lidos para reordenar tarefas. Email e array de tarefas s\xE3o obrigat\xF3rios."
    });
  }
  const pool = await dbPromise;
  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN");
    const userResult = await client.query(
      "SELECT id_usuario FROM usuario WHERE email = $1",
      [email]
    );
    const userRows = userResult.rows;
    if (!userRows || userRows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Usu\xE1rio n\xE3o encontrado." });
    }
    const id_usuario = userRows[0].id_usuario;
    for (const task of tasks) {
      const { id_tarefa, ordem } = task;
      const taskIdNum = parseInt(id_tarefa);
      if (isNaN(taskIdNum) || typeof ordem === "undefined" || typeof ordem !== "number") {
        throw new Error(
          `Dados de tarefa inv\xE1lidos: { id_tarefa: ${id_tarefa}, ordem: ${ordem} }`
        );
      }
      const updateOrderResult = await client.query(
        `UPDATE tarefa
           SET ordem = $1
           WHERE id_tarefa = $2 AND id_usuario = $3;`,
        [ordem, taskIdNum, id_usuario]
      );
    }
    await client.query("COMMIT");
    res.status(200).json({ message: "Ordem das tarefas atualizada com sucesso!" });
  } catch (err) {
    if (client) {
      await client.query("ROLLBACK");
    }
    console.error("Erro ao reordenar tarefas:", err);
    return res.status(500).json({
      message: `Erro ao reordenar tarefas: ${err.message || "Erro desconhecido."}`,
      error: err
    });
  } finally {
    if (client) {
      client.release();
    }
  }
};
var deleteAllCompletedTasks = async (req, res) => {
  const { email } = req.query;
  if (!email || typeof email !== "string") {
    return res.status(400).json({ message: "Email do usu\xE1rio \xE9 obrigat\xF3rio." });
  }
  const db = await dbPromise;
  let client;
  try {
    client = await db.connect();
    await client.query("BEGIN");
    const deleteResult = await client.query(
      `DELETE FROM tarefa
       WHERE id_usuario = (SELECT id_usuario FROM usuario WHERE email = $1)
       AND estado_tarefa = 'Finalizada'`,
      [email]
    );
    if (deleteResult.rowCount === 0) {
      const userCheckResult = await client.query(
        "SELECT id_usuario FROM usuario WHERE email = $1",
        [email]
      );
      if (userCheckResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ message: "Usu\xE1rio n\xE3o encontrado." });
      } else {
        await client.query("COMMIT");
        return res.status(200).json({ message: "Nenhuma tarefa conclu\xEDda para deletar." });
      }
    } else {
      await client.query("COMMIT");
      return res.status(200).json({
        message: `Foram deletadas ${deleteResult.rowCount} tarefas conclu\xEDdas com sucesso!`
      });
    }
  } catch (err) {
    if (client) {
      await client.query("ROLLBACK");
    }
    console.error("Erro ao deletar tarefas conclu\xEDdas:", err);
    return res.status(500).json({
      message: `Erro ao deletar tarefas conclu\xEDdas: ${err.message || "Erro desconhecido."}`,
      error: err
    });
  } finally {
    if (client) {
      client.release();
    }
  }
};
export {
  addTask,
  deleteAllCompletedTasks,
  deleteTask,
  getTasksByUser,
  reorderTasks,
  searchTasks,
  updateTask,
  updateTaskStatus
};
