// src/app.ts
import express from "express";

// src/db/connection.ts
import pkg from "pg";
import dotenv from "dotenv";
var { Pool } = pkg;
dotenv.config();
async function createDatabaseConnectionPool() {
  const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : void 0
  });
  try {
    await pool.connect();
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

// src/controllers/user.controller.ts
var JWT_SECRET = process.env.JWT_SECRET || "super_secreta_chave_padrao_muito_forte";
var getUsers = async (_, res) => {
  const db = await dbPromise;
  const q = "SELECT * FROM usuario";
  try {
    const result = await db.query(q);
    const data = result.rows;
    return res.status(200).json(data);
  } catch (err) {
    console.error("Erro ao buscar usu\xE1rios:", err);
    return res.status(500).json({ message: "Erro ao buscar usu\xE1rios", error: err });
  }
};
var checkUserExists = async (req, res) => {
  const { email } = req.query;
  if (!email || typeof email !== "string") {
    return res.status(400).json({ message: "Email \xE9 obrigat\xF3rio e deve ser uma string." });
  }
  const db = await dbPromise;
  const q = "SELECT * FROM usuario WHERE email = $1";
  try {
    const result = await db.query(q, [email]);
    const data = result.rows;
    if (data.length > 0) {
      return res.status(200).json({ exists: true, message: "Usu\xE1rio j\xE1 existe" });
    } else {
      return res.status(200).json({ exists: false, message: "Usu\xE1rio n\xE3o encontrado" });
    }
  } catch (err) {
    console.error("Erro ao verificar usu\xE1rio:", err);
    return res.status(500).json({ message: "Erro ao verificar usu\xE1rio", error: err });
  }
};
var createUser = async (req, res) => {
  const firebaseUid = req.userId;
  const email = req.userEmail;
  const { name } = req.body;
  if (!firebaseUid || !email || !name) {
    return res.status(400).json({
      message: "Dados do usu\xE1rio incompletos para cadastro/sincroniza\xE7\xE3o."
    });
  }
  const db = await dbPromise;
  const checkUserQuery = "SELECT * FROM usuario WHERE email = $1";
  try {
    const userExistsResult = await db.query(checkUserQuery, [
      email
    ]);
    if (userExistsResult.rows.length > 0) {
      return res.status(200).json({
        message: "Usu\xE1rio j\xE1 cadastrado no seu banco de dados.",
        user: userExistsResult.rows[0]
      });
    }
    const insertQuery = "INSERT INTO usuario (name, email, firebase_uid) VALUES ($1, $2, $3) RETURNING id_usuario, name, email, firebase_uid";
    const insertResult = await db.query(insertQuery, [
      name,
      email,
      firebaseUid
    ]);
    const insertedUser = insertResult.rows[0];
    return res.status(201).json({
      message: "Usu\xE1rio cadastrado com sucesso no seu banco de dados!",
      user: insertedUser
    });
  } catch (err) {
    console.error("Erro ao cadastrar/sincronizar usu\xE1rio:", err);
    return res.status(500).json({ message: "Erro ao cadastrar/sincronizar usu\xE1rio", error: err });
  }
};
var handleGoogleLogin = async (req, res) => {
  const email = req.userEmail;
  const firebaseUid = req.userId;
  const { name } = req.body;
  console.log(
    "-> handleGoogleLogin: Sincronizando dados Google para email:",
    email
  );
  if (!email || !firebaseUid) {
    return res.status(400).json({ message: "Email e UID do Firebase s\xE3o obrigat\xF3rios." });
  }
  const db = await dbPromise;
  try {
    const userExistsResult = await db.query(
      "SELECT id_usuario, name, email, firebase_uid FROM usuario WHERE email = $1",
      [email]
    );
    const userExists = userExistsResult.rows;
    if (userExists.length === 0) {
      console.log(
        "-> handleGoogleLogin: Usu\xE1rio n\xE3o existe no DB, criando novo..."
      );
      const insertQuery = "INSERT INTO usuario (name, email, firebase_uid) VALUES ($1, $2, $3) RETURNING id_usuario, name, email, firebase_uid";
      const insertResult = await db.query(insertQuery, [
        name,
        email,
        firebaseUid
      ]);
      const insertedUser = insertResult.rows[0];
      console.log(
        "-> handleGoogleLogin: Usu\xE1rio criado com sucesso! ID:",
        insertedUser?.id_usuario
      );
      return res.status(201).json({
        message: "Usu\xE1rio Google registrado com sucesso no DB!",
        user: insertedUser
      });
    } else {
      console.log(
        "-> handleGoogleLogin: Usu\xE1rio j\xE1 existe no DB, retornando dados."
      );
      if (!userExists[0].firebase_uid) {
        await db.query(
          "UPDATE usuario SET firebase_uid = $1 WHERE email = $2",
          [firebaseUid, email]
        );
        console.log(
          "-> handleGoogleLogin: firebase_uid atualizado para o usu\xE1rio existente."
        );
      }
      return res.status(200).json({
        message: "Usu\xE1rio Google encontrado no DB",
        user: userExists[0]
      });
    }
  } catch (err) {
    console.error(
      "-> handleGoogleLogin: ERRO CR\xCDTICO no bloco try-catch:",
      err
    );
    console.error("-> handleGoogleLogin: Mensagem de erro EXATA:", err.message);
    return res.status(500).json({
      message: "Erro ao lidar com login do Google.",
      error: err.message || "Erro desconhecido"
    });
  }
};
var getUserData = async (req, res) => {
  const email = req.userEmail;
  if (!email) {
    return res.status(401).json({ message: "Email do usu\xE1rio n\xE3o dispon\xEDvel no token." });
  }
  try {
    const db = await dbPromise;
    const query = "SELECT id_usuario, name, email, foto_perfil, data_criacao, firebase_uid FROM usuario WHERE email = $1";
    const result = await db.query(query, [email]);
    const user = result.rows[0];
    if (user) {
      return res.status(200).json({
        id_usuario: user.id_usuario,
        name: user.name,
        email: user.email,
        foto_perfil: user.foto_perfil,
        data_criacao: user.data_criacao,
        firebase_uid: user.firebase_uid
      });
    } else {
      return res.status(404).json({ message: "Usu\xE1rio n\xE3o encontrado no banco de dados." });
    }
  } catch (err) {
    console.error("Erro ao buscar dados do usu\xE1rio:", err);
    return res.status(500).json({ message: "Erro ao buscar dados do usu\xE1rio", error: err });
  }
};
var updateUserProfilePhoto = async (req, res) => {
  const { photoURL } = req.body;
  const userEmail = req.userEmail;
  if (!photoURL) {
    return res.status(400).json({
      message: "URL da nova foto de perfil n\xE3o fornecido!"
    });
  }
  if (!userEmail) {
    return res.status(401).json({
      message: "Usu\xE1rio n\xE3o autenticado corretamente."
    });
  }
  try {
    const db = await dbPromise;
    const query = `UPDATE usuario SET foto_perfil = $1 WHERE email = $2 RETURNING name, email, foto_perfil`;
    const result = await db.query(query, [photoURL, userEmail]);
    if (result.rowCount && result.rowCount > 0) {
      return res.status(200).json({
        message: "Foto atualizada com sucesso.",
        user: result.rows[0]
      });
    } else {
      return res.status(404).json({ message: "Usu\xE1rio n\xE3o encontrado." });
    }
  } catch (err) {
    console.error("Erro no DB:", err);
    return res.status(500).json({
      message: "Erro ao atualizar foto.",
      error: err
    });
  }
};
var updateAccountName = async (req, res) => {
  const { newAccountName } = req.body;
  const userEmail = req.userEmail;
  if (!newAccountName) {
    return res.status(400).json({
      message: "Nome da conta n\xE3o fornecido!"
    });
  }
  if (!userEmail) {
    return res.status(401).json({
      message: "Usu\xE1rio n\xE3o autenticado corretamente."
    });
  }
  try {
    const db = await dbPromise;
    const query = `UPDATE usuario SET name = $1 WHERE email = $2 RETURNING id_usuario, name, email, foto_perfil`;
    const result = await db.query(query, [
      newAccountName,
      userEmail
    ]);
    if (result.rowCount && result.rowCount > 0) {
      return res.status(200).json({
        message: "Nome da conta atualizado com sucesso.",
        user: result.rows[0]
      });
    } else {
      return res.status(404).json({ message: "Usu\xE1rio n\xE3o encontrado." });
    }
  } catch (err) {
    console.error("Erro no DB ao atualizar nome da conta:", err);
    return res.status(500).json({
      message: "Erro ao atualizar nome da conta.",
      error: err
    });
  }
};
var deleteUserData = async (req, res) => {
  const firebaseUid = req.userId;
  const userEmail = req.userEmail;
  if (!firebaseUid && !userEmail) {
    return res.status(401).json({ message: "UID ou Email do usu\xE1rio n\xE3o dispon\xEDvel no token." });
  }
  const pool = await dbPromise;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    let userIdFromDb = null;
    if (firebaseUid) {
      const userQueryResult = await client.query(
        "SELECT id_usuario FROM usuario WHERE firebase_uid = $1",
        [firebaseUid]
      );
      if (userQueryResult.rows.length > 0) {
        userIdFromDb = userQueryResult.rows[0].id_usuario;
      }
    } else if (userEmail) {
      const userQueryResult = await client.query(
        "SELECT id_usuario FROM usuario WHERE email = $1",
        [userEmail]
      );
      if (userQueryResult.rows.length > 0) {
        userIdFromDb = userQueryResult.rows[0].id_usuario;
      }
    }
    if (!userIdFromDb) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        message: "Dados do usu\xE1rio n\xE3o encontrados no banco de dados para dele\xE7\xE3o."
      });
    }
    await client.query("DELETE FROM tarefa WHERE id_usuario = $1", [
      userIdFromDb
    ]);
    console.log(`Tarefas do usu\xE1rio ${userIdFromDb} deletadas.`);
    const result = await client.query(
      "DELETE FROM usuario WHERE id_usuario = $1",
      [userIdFromDb]
    );
    console.log(`Usu\xE1rio ${userIdFromDb} deletado da tabela usuario.`);
    if (result.rowCount && result.rowCount > 0) {
      await client.query("COMMIT");
      return res.status(200).json({
        message: "Dados do usu\xE1rio e relacionados deletados do banco de dados."
      });
    } else {
      await client.query("ROLLBACK");
      return res.status(404).json({
        message: "Usu\xE1rio principal n\xE3o encontrado ap\xF3s dele\xE7\xE3o de dados relacionados."
      });
    }
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Erro ao deletar dados do usu\xE1rio no DB:", err);
    return res.status(500).json({
      message: "Erro ao deletar dados do usu\xE1rio no banco de dados. Transa\xE7\xE3o revertida.",
      error: err
    });
  } finally {
    client.release();
  }
};

// src/controllers/task.controller.ts
var searchTasks = async (req, res) => {
  try {
    const email = req.userEmail;
    const { query } = req.body;
    if (!email || !query || typeof query !== "string") {
      return res.status(400).json({
        message: "Email do usu\xE1rio (do token) e termo de pesquisa (query) s\xE3o obrigat\xF3rios e devem ser strings."
      });
    }
    const db = await dbPromise;
    const userResult = await db.query(
      "SELECT id_usuario FROM usuario WHERE email = $1",
      [email]
    );
    const userRows = userResult.rows;
    if (userRows.length === 0) {
      return res.status(404).json({ message: "Usu\xE1rio do token n\xE3o encontrado no DB." });
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
  const email = req.userEmail;
  console.log("-> getTasksByUser: Requisi\xE7\xE3o recebida para o email:", email);
  if (!email) {
    console.log(
      "-> getTasksByUser: Erro - Email n\xE3o fornecido no token de autentica\xE7\xE3o."
    );
    return res.status(400).json({
      message: "Email do usu\xE1rio \xE9 obrigat\xF3rio no token de autentica\xE7\xE3o."
    });
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
  const { titulo, descricao, data_prazo, prioridade } = req.body;
  const email = req.userEmail;
  const estado_tarefa = "Pendente";
  if (!titulo || !prioridade || !email) {
    return res.status(400).json({
      message: "T\xEDtulo e prioridade s\xE3o obrigat\xF3rios. Email do usu\xE1rio n\xE3o encontrado no token."
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
      return res.status(404).json({
        message: "Usu\xE1rio n\xE3o encontrado no DB para o email do token."
      });
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
  const email = req.userEmail;
  const taskIdNum = parseInt(id_tarefa);
  if (isNaN(taskIdNum) || !email) {
    return res.status(400).json({ message: "ID da tarefa inv\xE1lido ou email do usu\xE1rio ausente." });
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
    const deleteResult = await db.query(
      "DELETE FROM tarefa WHERE id_tarefa = $1 AND id_usuario = $2",
      [taskIdNum, id_usuario]
    );
    if (deleteResult.rowCount > 0) {
      return res.status(200).json({ message: "Tarefa deletada com sucesso!" });
    } else {
      const taskCheck = await db.query(
        "SELECT id_tarefa FROM tarefa WHERE id_tarefa = $1",
        [taskIdNum]
      );
      if (taskCheck.rows.length === 0) {
        return res.status(404).json({ message: "Tarefa n\xE3o encontrada." });
      } else {
        return res.status(403).json({
          message: "Voc\xEA n\xE3o tem permiss\xE3o para deletar esta tarefa."
        });
      }
    }
  } catch (err) {
    console.error("Erro ao deletar tarefa:", err);
    return res.status(500).json({ message: "Erro ao deletar tarefa", error: err });
  }
};
var updateTaskStatus = async (req, res) => {
  const { id_tarefa } = req.params;
  const { estado_tarefa } = req.body;
  const email = req.userEmail;
  const taskIdNum = parseInt(id_tarefa);
  if (isNaN(taskIdNum) || !estado_tarefa || !email) {
    return res.status(400).json({
      message: "ID da tarefa e novo estado s\xE3o obrigat\xF3rios e v\xE1lidos. Email do usu\xE1rio ausente."
    });
  }
  if (estado_tarefa !== "Pendente" && estado_tarefa !== "Finalizada") {
    return res.status(400).json({
      message: "Estado da tarefa deve ser 'Pendente' ou 'Finalizada'."
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
    const updateResult = await db.query(
      "UPDATE tarefa SET estado_tarefa = $1 WHERE id_tarefa = $2 AND id_usuario = $3",
      [estado_tarefa, taskIdNum, id_usuario]
    );
    if (updateResult.rowCount > 0) {
      return res.status(200).json({ message: "Estado da tarefa atualizado com sucesso!" });
    } else {
      const taskCheck = await db.query(
        "SELECT id_tarefa FROM tarefa WHERE id_tarefa = $1",
        [taskIdNum]
      );
      if (taskCheck.rows.length === 0) {
        return res.status(404).json({ message: "Tarefa n\xE3o encontrada." });
      } else {
        return res.status(403).json({
          message: "Voc\xEA n\xE3o tem permiss\xE3o para atualizar esta tarefa."
        });
      }
    }
  } catch (err) {
    console.error("Erro ao atualizar estado da tarefa:", err);
    return res.status(500).json({ message: "Erro ao atualizar estado da tarefa", error: err });
  }
};
var updateTask = async (req, res) => {
  const { id_tarefa } = req.params;
  const { titulo, descricao, data_prazo, prioridade, estado_tarefa } = req.body;
  const email = req.userEmail;
  const taskIdNum = parseInt(id_tarefa);
  if (isNaN(taskIdNum) || !titulo || !prioridade || !estado_tarefa || !email) {
    return res.status(400).json({
      message: "ID da tarefa, t\xEDtulo, prioridade, estado da tarefa s\xE3o obrigat\xF3rios e v\xE1lidos. Email do usu\xE1rio ausente."
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
               id_tarefa = $6 AND id_usuario = $7; -- Garanta que seja do usu\xE1rio logado
         `;
    const values = [
      titulo,
      descricao,
      formattedDataPrazo,
      prioridade,
      estado_tarefa,
      taskIdNum,
      id_usuario
    ];
    const updateResult = await db.query(sql, values);
    if (updateResult.rowCount > 0) {
      return res.status(200).json({ message: "Tarefa atualizada com sucesso!" });
    } else {
      const taskCheck = await db.query(
        "SELECT id_tarefa FROM tarefa WHERE id_tarefa = $1",
        [taskIdNum]
      );
      if (taskCheck.rows.length === 0) {
        return res.status(404).json({ message: "Tarefa n\xE3o encontrada." });
      } else {
        return res.status(403).json({
          message: "Voc\xEA n\xE3o tem permiss\xE3o para atualizar esta tarefa."
        });
      }
    }
  } catch (err) {
    console.error("Erro ao atualizar tarefa completa:", err);
    return res.status(500).json({ message: "Erro ao atualizar tarefa completa", error: err });
  }
};
var reorderTasks = async (req, res) => {
  const { tasks } = req.body;
  const email = req.userEmail;
  if (!email || !Array.isArray(tasks) || tasks.length === 0) {
    return res.status(400).json({
      message: "Dados inv\xE1lidos para reordenar tarefas. Email do usu\xE1rio ausente ou array de tarefas vazio."
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
          `Dados de tarefa inv\xE1lidos: { id_tarefa: ${id_tarefa}, ordem: ${ordem} }. Ordem deve ser um n\xFAmero v\xE1lido.`
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
  const email = req.userEmail;
  if (!email) {
    return res.status(400).json({ message: "Email do usu\xE1rio ausente no token de autentica\xE7\xE3o." });
  }
  const db = await dbPromise;
  let client;
  try {
    client = await db.connect();
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
    const deleteResult = await client.query(
      `DELETE FROM tarefa
       WHERE id_usuario = $1
       AND estado_tarefa = 'Finalizada'`,
      [id_usuario]
    );
    if (deleteResult.rowCount === 0) {
      await client.query("COMMIT");
      return res.status(200).json({ message: "Nenhuma tarefa conclu\xEDda para deletar." });
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

// src/routes/routes.ts
import { Router } from "express";

// src/firebaseAdminConfig.ts
import * as dotenv2 from "dotenv";
import admin from "firebase-admin";
dotenv2.config();
console.log("--- DEBUG Firebase Admin SDK Initialization ---");
try {
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    throw new Error(
      "Vari\xE1vel de ambiente GOOGLE_APPLICATION_CREDENTIALS n\xE3o definida."
    );
  }
  const serviceAccountConfig = JSON.parse(
    process.env.GOOGLE_APPLICATION_CREDENTIALS
  );
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccountConfig)
  });
  console.log("Firebase Admin SDK inicializado com sucesso.");
} catch (error) {
  console.error("ERRO CR\xCDTICO ao inicializar Firebase Admin SDK:", error);
  if (error instanceof Error) {
    console.error("Mensagem de erro espec\xEDfica:", error.message);
    console.error(
      "Dica: Certifique-se de que GOOGLE_APPLICATION_CREDENTIALS cont\xE9m o JSON COMPLETO da sua chave de servi\xE7o."
    );
  }
  process.exit(1);
}
console.log("--- FIM DEBUG Firebase Admin SDK Initialization ---");

// src/middlewares/auth.middleware.ts
var authenticateFirebaseToken = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (token == null) {
    return res.status(401).json({ message: "Acesso negado: Token n\xE3o fornecido." });
  }
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.userId = decodedToken.uid;
    req.userEmail = decodedToken.email;
    next();
  } catch (error) {
    console.error("Erro na verifica\xE7\xE3o do Firebase ID Token:", error);
    return res.status(403).json({ message: "Token de autentica\xE7\xE3o inv\xE1lido ou expirado." });
  }
};

// src/routes/routes.ts
var router = Router();
router.get("/users", authenticateFirebaseToken, getUsers);
router.get("/check-user-exists", checkUserExists);
router.post("/register", authenticateFirebaseToken, createUser);
router.post("/google-login", authenticateFirebaseToken, handleGoogleLogin);
router.post("/user-data", authenticateFirebaseToken, getUserData);
router.post(
  "/update-profile-photo",
  authenticateFirebaseToken,
  updateUserProfilePhoto
);
router.post(
  "/update-account-name",
  authenticateFirebaseToken,
  updateAccountName
);
router.delete("/delete-user-data", authenticateFirebaseToken, deleteUserData);
router.post("/tasks/search", authenticateFirebaseToken, searchTasks);
router.post("/tasks/add", authenticateFirebaseToken, addTask);
router.get("/tasks", authenticateFirebaseToken, getTasksByUser);
router.put("/tasks/reorder", authenticateFirebaseToken, reorderTasks);
router.delete(
  "/tasks/delete-completed",
  authenticateFirebaseToken,
  deleteAllCompletedTasks
);
router.put(
  "/tasks/:id_tarefa/status",
  authenticateFirebaseToken,
  updateTaskStatus
);
router.put("/tasks/:id_tarefa", authenticateFirebaseToken, updateTask);
router.delete("/tasks/:id_tarefa", authenticateFirebaseToken, deleteTask);
var routes_default = router;

// src/app.ts
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
var app = express();
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
app.use(
  cors({
    origin: "*",
    // ou "https://megajr-front.netlify.app",
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"],
    credentials: true
  })
);
console.log("CORS configurado");
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));
console.log("Servindo arquivos est\xE1ticos de /uploads.");
app.use("/api", routes_default);
console.log("Rotas de usu\xE1rio adicionadas sob o prefixo /api.");
app.use((req, res) => {
  res.status(404).json({ message: "Rota n\xE3o encontrada. Verifique a URL." });
});
var app_default = app;

// src/server.ts
import dotenv3 from "dotenv";
dotenv3.config();
var PORT = process.env.DB_PORT || 8800;
app_default.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
