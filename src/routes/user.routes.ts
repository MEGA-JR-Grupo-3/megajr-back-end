import express from "express";
import {
  getUsers,
  createUser,
  checkUserExists,
} from "../controllers/user.controller.js";

const router = express.Router();

// Rota para verificar se o usuário existe com base no email
router.get("/check-user", checkUserExists);

// Rota para pegar todos os usuários (caso necessário)
router.get("/users", getUsers);

// Rota para criar um novo usuário
router.post("/cadastro", createUser);

export default router;
