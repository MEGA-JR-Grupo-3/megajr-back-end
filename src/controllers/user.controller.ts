// src/controllers/user.controller.ts

import { dbPromise } from "../db/connection.js";
import { Request, Response } from "express";
import { QueryResult } from "pg";
import { AuthRequest } from "../middlewares/auth.middleware";
const JWT_SECRET =
  process.env.JWT_SECRET || "super_secreta_chave_padrao_muito_forte";

// Função para buscar usuários
export const getUsers = async (_: Request, res: Response) => {
  const db = await dbPromise;
  const q = "SELECT * FROM usuario";
  try {
    const result: QueryResult = await db.query(q);
    const data: any[] = result.rows;
    return res.status(200).json(data);
  } catch (err) {
    console.error("Erro ao buscar usuários:", err);
    return res
      .status(500)
      .json({ message: "Erro ao buscar usuários", error: err });
  }
};

// Função para verificar se o usuário já existe
// Função para verificar se o usuário já existe
export const checkUserExists = async (req: Request, res: Response) => {
  const { email } = req.query;

  if (!email || typeof email !== "string") {
    return res
      .status(400)
      .json({ message: "Email é obrigatório e deve ser uma string." });
  }
  const db = await dbPromise;
  const q = "SELECT * FROM usuario WHERE email = $1";
  try {
    const result: QueryResult = await db.query(q, [email]);
    const data: any[] = result.rows;
    if (data.length > 0) {
      return res
        .status(200)
        .json({ exists: true, message: "Usuário já existe" });
    } else {
      return res
        .status(200)
        .json({ exists: false, message: "Usuário não encontrado" });
    }
  } catch (err) {
    console.error("Erro ao verificar usuário:", err);
    return res
      .status(500)
      .json({ message: "Erro ao verificar usuário", error: err });
  }
};

// Função para cadastrar um novo usuário
export const createUser = async (req: AuthRequest, res: Response) => {
  const firebaseUid = req.userId;
  const email = req.userEmail;
  const { name } = req.body;

  if (!firebaseUid || !email || !name) {
    return res
      .status(400)
      .json({
        message: "Dados do usuário incompletos para cadastro/sincronização.",
      });
  }

  const db = await dbPromise;
  const checkEmailQuery = "SELECT * FROM usuario WHERE email = $1";
  try {
    const userExistsResult: QueryResult = await db.query(checkEmailQuery, [
      email,
    ]);
    if (userExistsResult.rows.length > 0) {
      // Usuário já existe no seu DB, apenas retorne os dados
      return res.status(200).json({
        message: "Usuário já cadastrado no seu banco de dados.",
        user: {
          id_usuario: userExistsResult.rows[0].id_usuario,
          name: userExistsResult.rows[0].name,
          email: userExistsResult.rows[0].email,
        },
      });
    }

    // Insere o usuário no seu DB - SEM A SENHA
    const insertQuery =
      "INSERT INTO usuario (name, email) VALUES ($1, $2) RETURNING id_usuario, name, email";
    const insertResult: QueryResult = await db.query(insertQuery, [
      name,
      email,
    ]);

    const insertedUser = insertResult.rows[0];

    return res.status(201).json({
      message: "Usuário cadastrado com sucesso no seu banco de dados!",
      user: {
        id_usuario: insertedUser.id_usuario,
        name: insertedUser.name,
        email: insertedUser.email,
      },
    });
  } catch (err) {
    console.error("Erro ao cadastrar/sincronizar usuário:", err);
    return res
      .status(500)
      .json({ message: "Erro ao cadastrar/sincronizar usuário", error: err });
  }
};

// Função para lidar com o login/cadastro via Google
export const handleGoogleLogin = async (req: AuthRequest, res: Response) => {
  const email = req.userEmail;
  const firebaseUid = req.userId;
  const { name } = req.body;

  console.log(
    "-> handleGoogleLogin: Sincronizando dados Google para email:",
    email
  );

  if (!email || !firebaseUid) {
    return res
      .status(400)
      .json({ message: "Email e UID do Firebase são obrigatórios." });
  }

  const db = await dbPromise;
  try {
    // A query não precisa mais buscar 'senha'
    const userExistsResult: QueryResult = await db.query(
      "SELECT id_usuario, name, email FROM usuario WHERE email = $1",
      [email]
    );
    const userExists: any[] = userExistsResult.rows;

    if (userExists.length === 0) {
      console.log(
        "-> handleGoogleLogin: Usuário não existe no DB, criando novo..."
      );
      // Insert sem a senha
      const insertQuery =
        "INSERT INTO usuario (name, email) VALUES ($1, $2) RETURNING id_usuario, name, email";
      const insertResult: QueryResult = await db.query(insertQuery, [
        name,
        email,
      ]);

      const insertedUser = insertResult.rows[0];

      console.log(
        "-> handleGoogleLogin: Usuário criado com sucesso! ID:",
        insertedUser?.id_usuario
      );
      return res.status(201).json({
        message: "Usuário Google registrado com sucesso no DB!",
        user: insertedUser,
      });
    } else {
      console.log(
        "-> handleGoogleLogin: Usuário já existe no DB, retornando dados."
      );
      return res.status(200).json({
        message: "Usuário Google encontrado no DB",
        user: {
          id_usuario: userExists[0].id_usuario,
          name: userExists[0].name,
          email: userExists[0].email,
        },
      });
    }
  } catch (err: any) {
    console.error(
      "-> handleGoogleLogin: ERRO CRÍTICO no bloco try-catch:",
      err
    );
    console.error("-> handleGoogleLogin: Mensagem de erro EXATA:", err.message);
    return res.status(500).json({
      message: "Erro ao lidar com login do Google.",
      error: err.message || "Erro desconhecido",
    });
  }
};

export const getUserData = async (req: AuthRequest, res: Response) => {
  const email = req.userEmail;

  if (!email) {
    return res
      .status(401)
      .json({ message: "Email do usuário não disponível no token." });
  }

  try {
    const db = await dbPromise;
    // A query não busca 'senha'
    const query =
      "SELECT id_usuario, name, email, foto_perfil AS profilePhotoUrl, data_criacao AS creationDate FROM usuario WHERE email = $1"; // Ajustei para corresponder ao DB e frontend
    const result: QueryResult = await db.query(query, [email]);
    const user = result.rows[0];

    if (user) {
      return res.status(200).json({
        id_usuario: user.id_usuario,
        name: user.name,
        email: user.email,
        foto_perfil: user.foto_perfil,
        data_criacao: user.data_criacao,
      });
    } else {
      return res
        .status(404)
        .json({ message: "Usuário não encontrado no banco de dados." });
    }
  } catch (err) {
    console.error("Erro ao buscar dados do usuário:", err);
    return res
      .status(500)
      .json({ message: "Erro ao buscar dados do usuário", error: err });
  }
};
