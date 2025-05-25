var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// src/db/connection.ts
import { Pool } from "pg";
import dotenv from "dotenv";
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
var dbPromise;
var init_connection = __esm({
  "src/db/connection.ts"() {
    "use strict";
    dotenv.config();
    dbPromise = createDatabaseConnectionPool();
  }
});

// src/controllers/user.controller.ts
import bcrypt from "bcryptjs";
import { unlink, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
var __filename, __dirname, UPLOADS_DIR, getUsers, checkUserExists, createUser, handleGoogleLogin, getUserData, updateProfilePhoto, updateEmail, changePassword, deleteAccount;
var init_user_controller = __esm({
  "src/controllers/user.controller.ts"() {
    "use strict";
    init_connection();
    __filename = fileURLToPath(import.meta.url);
    __dirname = path.dirname(__filename);
    UPLOADS_DIR = path.join(
      __dirname,
      "..",
      "..",
      "uploads",
      "profile-photos"
    );
    getUsers = async (_, res) => {
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
    checkUserExists = async (req, res) => {
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
    createUser = async (req, res) => {
      const { name, email, senha } = req.body;
      if (!name || !email || !senha) {
        return res.status(400).json({ message: "Nome, email e senha s\xE3o obrigat\xF3rios." });
      }
      const db = await dbPromise;
      const checkEmailQuery = "SELECT * FROM usuario WHERE email = $1";
      try {
        const userExistsResult = await db.query(checkEmailQuery, [
          email
        ]);
        if (userExistsResult.rows.length > 0) {
          return res.status(409).json({ message: "Email j\xE1 cadastrado." });
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(senha, salt);
        const insertQuery = "INSERT INTO usuario (name, email, senha, creation_date) VALUES ($1, $2, $3, NOW()) RETURNING id_usuario, name, email, creation_date, profile_photo_url";
        const insertResult = await db.query(insertQuery, [
          name,
          email,
          hashedPassword
        ]);
        const insertedUser = insertResult.rows[0];
        return res.status(201).json({
          message: "Usu\xE1rio cadastrado com sucesso!",
          user: {
            id_usuario: insertedUser.id_usuario,
            name: insertedUser.name,
            email: insertedUser.email,
            creationDate: insertedUser.creation_date,
            profilePhotoUrl: insertedUser.profile_photo_url
          }
        });
      } catch (err) {
        console.error("Erro ao cadastrar usu\xE1rio:", err);
        return res.status(500).json({ message: "Erro ao cadastrar usu\xE1rio", error: err });
      }
    };
    handleGoogleLogin = async (req, res) => {
      const { name, email, profilePhotoUrl } = req.body;
      if (!email) {
        return res.status(400).json({ message: "Email \xE9 obrigat\xF3rio." });
      }
      const db = await dbPromise;
      try {
        const userExistsResult = await db.query(
          "SELECT id_usuario, name, email, profile_photo_url, creation_date FROM usuario WHERE email = $1",
          // Selecionando mais campos
          [email]
        );
        if (userExistsResult.rows.length === 0) {
          const googlePlaceholderPassword = `google_user_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
          const salt = await bcrypt.genSalt(10);
          const hashedPassword = await bcrypt.hash(googlePlaceholderPassword, salt);
          const insertQuery = "INSERT INTO usuario (name, email, senha, profile_photo_url, creation_date) VALUES ($1, $2, $3, $4, NOW()) RETURNING id_usuario, name, email, profile_photo_url, creation_date";
          const insertResult = await db.query(insertQuery, [
            name,
            email,
            hashedPassword,
            profilePhotoUrl || "/path/to/default-avatar.png"
            // Usar a URL da foto do Google ou padrão
          ]);
          const insertedUser = insertResult.rows[0];
          return res.status(201).json({
            message: "Usu\xE1rio Google registrado com sucesso!",
            user: {
              id_usuario: insertedUser.id_usuario,
              name: insertedUser.name,
              email: insertedUser.email,
              profilePhotoUrl: insertedUser.profile_photo_url,
              creationDate: insertedUser.creation_date
            }
          });
        } else {
          const existingUser = userExistsResult.rows[0];
          if (profilePhotoUrl && existingUser.profile_photo_url !== profilePhotoUrl) {
            await db.query(
              "UPDATE usuario SET profile_photo_url = $1 WHERE id_usuario = $2",
              [profilePhotoUrl, existingUser.id_usuario]
            );
            existingUser.profile_photo_url = profilePhotoUrl;
          }
          return res.status(200).json({
            message: "Usu\xE1rio Google encontrado",
            user: {
              id_usuario: existingUser.id_usuario,
              name: existingUser.name,
              email: existingUser.email,
              profilePhotoUrl: existingUser.profile_photo_url,
              creationDate: existingUser.creation_date
            }
          });
        }
      } catch (err) {
        console.error("ERRO CR\xCDTICO no handleGoogleLogin:", err);
        return res.status(500).json({
          message: "Erro ao lidar com login do Google.",
          error: err.message || "Erro desconhecido"
        });
      }
    };
    getUserData = async (req, res) => {
      const { email } = req.body;
      if (!email || typeof email !== "string") {
        return res.status(400).json({ message: "Email \xE9 obrigat\xF3rio e deve ser uma string." });
      }
      try {
        const db = await dbPromise;
        const query = "SELECT id_usuario, name, email, profile_photo_url, creation_date FROM usuario WHERE email = $1";
        const result = await db.query(query, [email]);
        const user = result.rows[0];
        if (user) {
          return res.status(200).json({
            id_usuario: user.id_usuario,
            name: user.name,
            email: user.email,
            profilePhotoUrl: user.profile_photo_url,
            creationDate: user.creation_date
          });
        } else {
          return res.status(404).json({ message: "Usu\xE1rio n\xE3o encontrado." });
        }
      } catch (err) {
        console.error("Erro ao buscar dados do usu\xE1rio:", err);
        return res.status(500).json({ message: "Erro ao buscar dados do usu\xE1rio.", error: err });
      }
    };
    updateProfilePhoto = async (req, res) => {
      const { email } = req.body;
      const file = req.file;
      if (!email || typeof email !== "string") {
        return res.status(400).json({ message: "Email do usu\xE1rio \xE9 obrigat\xF3rio." });
      }
      if (!file) {
        return res.status(400).json({ message: "Nenhum arquivo de imagem fornecido." });
      }
      const db = await dbPromise;
      try {
        const oldPhotoQuery = "SELECT profile_photo_url FROM usuario WHERE email = $1";
        const oldPhotoResult = await db.query(oldPhotoQuery, [email]);
        const oldPhotoUrl = oldPhotoResult.rows[0]?.profile_photo_url;
        const fileExtension = path.extname(file.originalname);
        const fileName = `${email.replace(
          /[^a-zA-Z0-9]/g,
          "_"
        )}_${Date.now()}${fileExtension}`;
        const filePath = path.join(UPLOADS_DIR, fileName);
        try {
          await import("fs").then(
            (fs) => fs.promises.mkdir(UPLOADS_DIR, { recursive: true })
          );
        } catch (mkdirErr) {
          console.error("Erro ao criar diret\xF3rio de uploads:", mkdirErr);
          return res.status(500).json({ message: "Erro interno no servidor." });
        }
        await writeFile(filePath, file.buffer);
        const newPhotoUrl = `/uploads/profile-photos/${fileName}`;
        const updateQuery = "UPDATE usuario SET profile_photo_url = $1 WHERE email = $2 RETURNING profile_photo_url";
        const updateResult = await db.query(updateQuery, [
          newPhotoUrl,
          email
        ]);
        if (updateResult.rows.length === 0) {
          await unlink(filePath).catch(
            (err) => console.error("Erro ao deletar arquivo de foto n\xE3o salvo:", err)
          );
          return res.status(404).json({ message: "Usu\xE1rio n\xE3o encontrado para atualizar a foto." });
        }
        if (oldPhotoUrl && !oldPhotoUrl.includes("/path/to/default-avatar.png") && oldPhotoUrl.startsWith("/uploads/")) {
          const oldPhotoPath = path.join(__dirname, "..", "..", oldPhotoUrl);
          await unlink(oldPhotoPath).catch(
            (err) => console.error("Erro ao deletar foto antiga:", err)
          );
        }
        return res.status(200).json({ message: "Foto de perfil atualizada com sucesso!", newPhotoUrl });
      } catch (err) {
        console.error("Erro ao atualizar foto de perfil:", err);
        if (file) {
          const fileName = `${email.replace(
            /[^a-zA-Z0-9]/g,
            "_"
          )}_${Date.now()}${path.extname(file.originalname)}`;
          const filePath = path.join(UPLOADS_DIR, fileName);
          await unlink(filePath).catch(
            (deleteErr) => console.error("Erro ao deletar foto ap\xF3s falha:", deleteErr)
          );
        }
        return res.status(500).json({ message: "Erro ao atualizar foto de perfil.", error: err });
      }
    };
    updateEmail = async (req, res) => {
      const { oldEmail, newEmail } = req.body;
      if (!oldEmail || typeof oldEmail !== "string" || !newEmail || typeof newEmail !== "string") {
        return res.status(400).json({ message: "Email antigo e novo email s\xE3o obrigat\xF3rios." });
      }
      if (oldEmail === newEmail) {
        return res.status(400).json({ message: "O novo email n\xE3o pode ser igual ao email atual." });
      }
      const db = await dbPromise;
      try {
        const checkNewEmailQuery = "SELECT id_usuario FROM usuario WHERE email = $1 AND email <> $2";
        const checkNewEmailResult = await db.query(
          checkNewEmailQuery,
          [newEmail, oldEmail]
        );
        if (checkNewEmailResult.rows.length > 0) {
          return res.status(409).json({ message: "O novo email j\xE1 est\xE1 em uso." });
        }
        const updateQuery = "UPDATE usuario SET email = $1 WHERE email = $2 RETURNING email";
        const updateResult = await db.query(updateQuery, [
          newEmail,
          oldEmail
        ]);
        if (updateResult.rows.length === 0) {
          return res.status(404).json({ message: "Usu\xE1rio n\xE3o encontrado para atualizar o email." });
        }
        return res.status(200).json({
          message: "Email atualizado com sucesso!",
          newEmail: updateResult.rows[0].email
        });
      } catch (err) {
        console.error("Erro ao atualizar email:", err);
        return res.status(500).json({ message: "Erro ao atualizar email.", error: err });
      }
    };
    changePassword = async (req, res) => {
      const { email, currentPassword, newPassword } = req.body;
      if (!email || typeof email !== "string" || !currentPassword || !newPassword) {
        return res.status(400).json({ message: "Email, senha atual e nova senha s\xE3o obrigat\xF3rios." });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ message: "A nova senha deve ter pelo menos 6 caracteres." });
      }
      const db = await dbPromise;
      try {
        const userQuery = "SELECT senha FROM usuario WHERE email = $1";
        const userResult = await db.query(userQuery, [email]);
        const user = userResult.rows[0];
        if (!user) {
          return res.status(404).json({ message: "Usu\xE1rio n\xE3o encontrado." });
        }
        const isPasswordCorrect = await bcrypt.compare(currentPassword, user.senha);
        if (!isPasswordCorrect) {
          return res.status(401).json({ message: "Senha atual incorreta." });
        }
        const salt = await bcrypt.genSalt(10);
        const hashedNewPassword = await bcrypt.hash(newPassword, salt);
        const updateQuery = "UPDATE usuario SET senha = $1 WHERE email = $2";
        await db.query(updateQuery, [hashedNewPassword, email]);
        return res.status(200).json({ message: "Senha alterada com sucesso!" });
      } catch (err) {
        console.error("Erro ao alterar senha:", err);
        return res.status(500).json({ message: "Erro ao alterar senha.", error: err });
      }
    };
    deleteAccount = async (req, res) => {
      const { email } = req.query;
      if (!email || typeof email !== "string") {
        return res.status(400).json({ message: "Email do usu\xE1rio \xE9 obrigat\xF3rio." });
      }
      const db = await dbPromise;
      try {
        const photoQuery = "SELECT profile_photo_url FROM usuario WHERE email = $1";
        const photoResult = await db.query(photoQuery, [email]);
        const userPhotoUrl = photoResult.rows[0]?.profile_photo_url;
        if (userPhotoUrl && !userPhotoUrl.includes("/path/to/default-avatar.png") && userPhotoUrl.startsWith("/uploads/")) {
          const photoPath = path.join(__dirname, "..", "..", userPhotoUrl);
          await unlink(photoPath).catch(
            (err) => console.error("Erro ao deletar foto de perfil do usu\xE1rio:", err)
          );
        }
        const deleteUserQuery = "DELETE FROM usuario WHERE email = $1 RETURNING id_usuario";
        const deleteResult = await db.query(deleteUserQuery, [email]);
        if (deleteResult.rows.length === 0) {
          return res.status(404).json({ message: "Usu\xE1rio n\xE3o encontrado para deletar." });
        }
        return res.status(200).json({ message: "Conta deletada com sucesso!" });
      } catch (err) {
        console.error("Erro ao deletar conta:", err);
        return res.status(500).json({ message: "Erro ao deletar conta.", error: err });
      }
    };
  }
});

// src/controllers/task.controller.ts
var searchTasks, getTasksByUser, addTask, deleteTask, updateTaskStatus, updateTask, reorderTasks, deleteAllCompletedTasks;
var init_task_controller = __esm({
  "src/controllers/task.controller.ts"() {
    "use strict";
    init_connection();
    searchTasks = async (req, res) => {
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
    getTasksByUser = async (req, res) => {
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
    addTask = async (req, res) => {
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
    deleteTask = async (req, res) => {
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
    updateTaskStatus = async (req, res) => {
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
    updateTask = async (req, res) => {
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
    reorderTasks = async (req, res) => {
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
    deleteAllCompletedTasks = async (req, res) => {
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
  }
});

// src/routes/user.routes.ts
import express from "express";
import multer from "multer";
var storage, upload, router, user_routes_default;
var init_user_routes = __esm({
  "src/routes/user.routes.ts"() {
    "use strict";
    init_user_controller();
    init_task_controller();
    storage = multer.memoryStorage();
    upload = multer({ storage });
    router = express.Router();
    router.get("/check-user", checkUserExists);
    router.get("/users", getUsers);
    router.post("/cadastro", createUser);
    router.post("/cadastro-google", handleGoogleLogin);
    router.post("/user-data", getUserData);
    router.put(
      "/users/update-profile-photo",
      upload.single("profilePhoto"),
      updateProfilePhoto
    );
    router.put("/users/update-email", updateEmail);
    router.put("/users/change-password", changePassword);
    router.delete("/users/delete-account", deleteAccount);
    router.post("/tasks/search", searchTasks);
    router.post("/tasks/add", addTask);
    router.post("/tasks", getTasksByUser);
    router.put("/tasks/reorder", reorderTasks);
    router.delete("/tasks/delete-completed", deleteAllCompletedTasks);
    router.put("/tasks/:id_tarefa/status", updateTaskStatus);
    router.put("/tasks/:id_tarefa", updateTask);
    router.delete("/tasks/:id_tarefa", deleteTask);
    user_routes_default = router;
  }
});

// src/app.ts
import express2 from "express";
import cors from "cors";
import path2 from "path";
import { fileURLToPath as fileURLToPath2 } from "url";
var app, __filename2, __dirname2, app_default;
var init_app = __esm({
  "src/app.ts"() {
    "use strict";
    init_user_routes();
    app = express2();
    __filename2 = fileURLToPath2(import.meta.url);
    __dirname2 = path2.dirname(__filename2);
    app.use(
      cors({
        origin: "*",
        //"https://megajr-front.netlify.app",
        methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"],
        credentials: true
      })
    );
    console.log("CORS configurado");
    app.use(express2.json());
    app.use("/uploads", express2.static(path2.join(__dirname2, "..", "uploads")));
    console.log("Servindo arquivos est\xE1ticos de /uploads.");
    app.use("/", user_routes_default);
    console.log("Rotas de usu\xE1rio adicionadas.");
    app_default = app;
  }
});

// src/server.ts
import dotenv2 from "dotenv";
var require_server = __commonJS({
  "src/server.ts"() {
    init_app();
    dotenv2.config();
    var PORT = process.env.PORT || 8800;
    app_default.listen(PORT, () => {
      console.log(`Servidor rodando na porta ${PORT}`);
    });
  }
});
export default require_server();
