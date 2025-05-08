import express from "express";
import {
  getUsers,
  createUser,
  checkUserExists,
  handleGoogleLogin,
  getUserData,
} from "../controllers/user.controller.js";

import {
  searchTasks,
  getTasksByUser,
  addTask,
} from "../controllers/task.controller.js";

const router = express.Router();

// Rota para verificar se o usuário existe com base no email
router.get("/check-user", checkUserExists);

// Rota para pegar todos os usuários (caso necessário)
router.get("/users", getUsers);

// Rota para criar um novo usuário (cadastro tradicional)
router.post("/cadastro", createUser);

// Nova rota para lidar com o login/cadastro via Google
router.post("/cadastro-google", handleGoogleLogin);

// Nova rota para pegar os dados do usuário logado
router.post("/user-data", getUserData);

export default router;

//ROTAS DAS TAREFAS --------------------------------------------------------------------------------------------

// Rota para buscar tarefas com filtro por título
router.get("/tasks/search", searchTasks);

// Rota para pegar todas as tarefas de um usuário (existente)
router.post("/tasks", getTasksByUser);

// Rota para adicionar uma nova tarefa
router.post("/tasks/add", addTask);
