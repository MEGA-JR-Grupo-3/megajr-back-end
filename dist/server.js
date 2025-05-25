// src/app.ts
import express from "express";

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
    return res.status(400).json({ message: "Dados do usu\xE1rio incompletos para cadastro/sincroniza\xE7\xE3o." });
  }
  const db = await dbPromise;
  const checkEmailQuery = "SELECT * FROM usuario WHERE email = $1";
  try {
    const userExistsResult = await db.query(checkEmailQuery, [email]);
    if (userExistsResult.rows.length > 0) {
      return res.status(200).json({
        message: "Usu\xE1rio j\xE1 cadastrado no seu banco de dados.",
        user: {
          id_usuario: userExistsResult.rows[0].id_usuario,
          name: userExistsResult.rows[0].name,
          email: userExistsResult.rows[0].email
        }
      });
    }
    const insertQuery = "INSERT INTO usuario (name, email) VALUES ($1, $2) RETURNING id_usuario, name, email";
    const insertResult = await db.query(insertQuery, [
      name,
      email
    ]);
    const insertedUser = insertResult.rows[0];
    return res.status(201).json({
      message: "Usu\xE1rio cadastrado com sucesso no seu banco de dados!",
      user: {
        id_usuario: insertedUser.id_usuario,
        name: insertedUser.name,
        email: insertedUser.email
      }
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
  console.log("-> handleGoogleLogin: Sincronizando dados Google para email:", email);
  if (!email || !firebaseUid) {
    return res.status(400).json({ message: "Email e UID do Firebase s\xE3o obrigat\xF3rios." });
  }
  const db = await dbPromise;
  try {
    const userExistsResult = await db.query(
      "SELECT id_usuario, name, email FROM usuario WHERE email = $1",
      [email]
    );
    const userExists = userExistsResult.rows;
    if (userExists.length === 0) {
      console.log("-> handleGoogleLogin: Usu\xE1rio n\xE3o existe no DB, criando novo...");
      const insertQuery = "INSERT INTO usuario (name, email) VALUES ($1, $2) RETURNING id_usuario, name, email";
      const insertResult = await db.query(insertQuery, [
        name,
        email
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
      console.log("-> handleGoogleLogin: Usu\xE1rio j\xE1 existe no DB, retornando dados.");
      return res.status(200).json({
        message: "Usu\xE1rio Google encontrado no DB",
        user: {
          id_usuario: userExists[0].id_usuario,
          name: userExists[0].name,
          email: userExists[0].email
        }
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
    const query = "SELECT id_usuario, name, email, foto_perfil AS profilePhotoUrl, data_criacao AS creationDate FROM usuario WHERE email = $1";
    const result = await db.query(query, [email]);
    const user = result.rows[0];
    if (user) {
      return res.status(200).json({
        id_usuario: user.id_usuario,
        name: user.name,
        email: user.email,
        profilePhotoUrl: user.profilePhotoUrl,
        creationDate: user.creationDate
      });
    } else {
      return res.status(404).json({ message: "Usu\xE1rio n\xE3o encontrado no banco de dados." });
    }
  } catch (err) {
    console.error("Erro ao buscar dados do usu\xE1rio:", err);
    return res.status(500).json({ message: "Erro ao buscar dados do usu\xE1rio", error: err });
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
  const { titulo, descricao, data_prazo, prioridade, estado_tarefa } = req.body;
  const email = req.userEmail;
  if (!titulo || !prioridade || !estado_tarefa || !email) {
    return res.status(400).json({
      message: "T\xEDtulo, prioridade, estado s\xE3o obrigat\xF3rios. Email do usu\xE1rio n\xE3o encontrado no token."
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

// src/routes/user.routes.ts
import { Router } from "express";

// src/firebaseAdminConfig.ts
import * as admin from "firebase-admin";
var serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (!serviceAccountJson) {
  console.error("FIREBASE_SERVICE_ACCOUNT_KEY n\xE3o est\xE1 definida!");
  process.exit(1);
}
try {
  const serviceAccount = JSON.parse(serviceAccountJson);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log("Firebase Admin SDK inicializado com sucesso.");
} catch (error) {
  console.error("Erro ao inicializar Firebase Admin SDK:", error);
  process.exit(1);
}

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

// src/routes/user.routes.ts
var router = Router();
router.get("/users", authenticateFirebaseToken, getUsers);
router.get("/check-user-exists", checkUserExists);
router.post("/register", authenticateFirebaseToken, createUser);
router.post("/google-login", authenticateFirebaseToken, handleGoogleLogin);
router.post("/user-data", authenticateFirebaseToken, getUserData);
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
var user_routes_default = router;

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
    //"https://megajr-front.netlify.app",
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"],
    credentials: true
  })
);
console.log("CORS configurado");
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));
console.log("Servindo arquivos est\xE1ticos de /uploads.");
app.use("/", user_routes_default);
console.log("Rotas de usu\xE1rio adicionadas.");
var app_default = app;

// src/server.ts
import dotenv2 from "dotenv";
dotenv2.config();
var PORT = process.env.PORT || 8800;
app_default.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
