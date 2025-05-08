import express from "express";
import {
  searchTasks,
  getTasksByUser,
  addTask,
} from "../controllers/task.controller.js";

const router = express.Router();

// Rota para buscar tarefas com filtro por título
router.get("/tasks/search", searchTasks);

// Rota para pegar todas as tarefas de um usuário (existente)
router.post("/tasks", getTasksByUser);

// Rota para adicionar uma nova tarefa
router.post("/tasks/add", addTask);
