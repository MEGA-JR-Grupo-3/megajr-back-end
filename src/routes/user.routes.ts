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
  deleteTask,
  updateTaskStatus,
  updateTask,
  reorderTasks,
  deleteAllCompletedTasks,
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

// ROTAS DAS TAREFAS --------------------------------------------------------------------------------------------

// Rota para buscar tarefas com filtro por título
router.post("/tasks/search", searchTasks);

// Rota para adicionar uma nova tarefa
router.post("/tasks/add", addTask);

// Rota para pegar todas as tarefas de um usuário (existente)
router.post("/tasks", getTasksByUser);

// Rota para reordenar tarefas
router.put("/tasks/reorder", reorderTasks);

// Rota existente para atualização de status, tornando-a mais específica
router.put("/tasks/:id_tarefa/status", updateTaskStatus);

// Rota para ATUALIZAÇÃO COMPLETA da tarefa
router.put("/tasks/:id_tarefa", updateTask);

// Rota para deletar uma tarefa pelo ID
router.delete("/tasks/:id_tarefa", deleteTask);

// Rota para deletar todas as tarefas concluídas
router.delete("/tasks/delete-completed", deleteAllCompletedTasks);
