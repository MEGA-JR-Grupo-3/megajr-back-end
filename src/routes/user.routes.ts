import express from "express";
import {
  getUsers,
  createUser,
  checkUserExists,
  handleGoogleLogin,
  getUserData,
  // --- Novas funções que precisam ser importadas ---
  updateProfilePhoto,
  updateEmail,
  changePassword,
  deleteAccount,
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

import multer from "multer";

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const router = express.Router();

// --- ROTAS DE USUÁRIO ------------------------------------------------------------------------------------------

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

// Rota para atualizar a foto de perfil
router.put(
  "/users/update-profile-photo",
  upload.single("profilePhoto"),
  updateProfilePhoto
);

// Rota para atualizar o email
router.put("/users/update-email", updateEmail);

// Rota para mudar a senha
router.put("/users/change-password", changePassword);

// Rota para deletar a conta
// A rota de exclusão de conta espera o email como query parameter.
router.delete("/users/delete-account", deleteAccount);

// --- ROTAS DAS TAREFAS --------------------------------------------------------------------------------------------

// Rota para buscar tarefas com filtro por título
router.post("/tasks/search", searchTasks);

// Rota para adicionar uma nova tarefa
router.post("/tasks/add", addTask);

// Rota para pegar todas as tarefas de um usuário (existente)
router.post("/tasks", getTasksByUser);

// Rota para reordenar tarefas
router.put("/tasks/reorder", reorderTasks);

// Rota para deletar todas as tarefas concluídas
router.delete("/tasks/delete-completed", deleteAllCompletedTasks);

// Rota existente para atualização de status, tornando-a mais específica
router.put("/tasks/:id_tarefa/status", updateTaskStatus);

// Rota para ATUALIZAÇÃO COMPLETA da tarefa
router.put("/tasks/:id_tarefa", updateTask);

// Rota para deletar uma tarefa pelo ID
router.delete("/tasks/:id_tarefa", deleteTask);

export default router;
