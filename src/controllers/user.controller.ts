// src/controllers/user.controller.ts

import { dbPromise } from "../db/connection.js";
import { Request, Response } from "express";
import { QueryResult } from "pg";

// Função para buscar usuários ------------------------------------------------------------------------------------------------------------
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

// Função para verificar se o usuário já existe ------------------------------------------------------------------------------------------------------------
export const checkUserExists = async (req: Request, res: Response) => {
  const { email } = req.query;

  if (!email) {
    return res.status(400).json({ message: "Email é obrigatório" });
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

// Função para cadastrar um novo usuário ------------------------------------------------------------------------------------------------------------
export const createUser = async (req: Request, res: Response) => {
  const { name, email, senha } = req.body;

  const userPassword = senha || "senhaGeradaPeloSistema";

  if (!name || !email || !userPassword) {
    return res
      .status(400)
      .json({ message: "Todos os campos são obrigatórios" });
  }

  const db = await dbPromise;
  const checkEmailQuery = "SELECT * FROM usuario WHERE email = $1";
  try {
    const userExistsResult: QueryResult = await db.query(checkEmailQuery, [
      email,
    ]);
    const userExists: any[] = userExistsResult.rows;

    if (userExists.length > 0) {
      return res.status(409).json({ message: "Email já cadastrado" });
    }

    const insertQuery =
      "INSERT INTO usuario (name, email, senha) VALUES ($1, $2, $3) RETURNING id_usuario";
    const insertResult: QueryResult = await db.query(insertQuery, [
      name,
      email,
      userPassword,
    ]);

    const insertedUserId =
      insertResult.rows && insertResult.rows.length > 0
        ? insertResult.rows[0].id_usuario
        : null;

    return res.status(201).json({
      message: "Usuário cadastrado com sucesso!",
      id_usuario: insertedUserId,
    });
  } catch (err) {
    console.error("Erro ao cadastrar usuário:", err);
    return res
      .status(500)
      .json({ message: "Erro ao cadastrar usuário", error: err });
  }
};

// Função para lidar com o login/cadastro via Google ----------------------------------------------------------------------------------------------------
export const handleGoogleLogin = async (req: Request, res: Response) => {
  const { name, email } = req.body;
  console.log(
    "-> handleGoogleLogin: Tentativa de login/cadastro Google para email:",
    email
  );
  console.log("-> handleGoogleLogin: Nome recebido no body:", name);

  if (!email) {
    console.log("-> handleGoogleLogin: Erro - Email não fornecido.");
    return res.status(400).json({ message: "Email é obrigatório." });
  }

  const db = await dbPromise;
  try {
    const userExistsResult: QueryResult = await db.query(
      "SELECT id_usuario, name, email FROM usuario WHERE email = $1",
      [email]
    );
    const userExists: any[] = userExistsResult.rows;

    if (userExists.length === 0) {
      console.log("-> handleGoogleLogin: Usuário não existe, criando novo...");
      const googlePlaceholderPassword = `google_user_${Date.now()}_${Math.random()
        .toString(36)
        .substring(2, 15)}`;

      const insertQuery =
        "INSERT INTO usuario (name, email, senha) VALUES ($1, $2, $3) RETURNING id_usuario, name, email";
      const insertResult: QueryResult = await db.query(insertQuery, [
        name,
        email,
        googlePlaceholderPassword,
      ]);

      const insertedUser =
        insertResult.rows && insertResult.rows.length > 0
          ? insertResult.rows[0]
          : null;

      console.log(
        "-> handleGoogleLogin: Usuário criado com sucesso! ID:",
        insertedUser?.id_usuario
      );
      return res.status(201).json({
        message: "Usuário Google registrado com sucesso!",
        user: insertedUser
          ? {
              id_usuario: insertedUser.id_usuario,
              name: insertedUser.name,
              email: insertedUser.email,
            }
          : null,
      });
    } else {
      console.log("-> handleGoogleLogin: Usuário já existe, logando.");
      return res.status(200).json({
        message: "Usuário Google encontrado",
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

// Função para buscar dados do usuário ------------------------------------------------------------------------------------------------------------

export const getUserData = async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email é obrigatório" });
  }

  try {
    const db = await dbPromise;
    const query = "SELECT name FROM usuario WHERE email = $1";
    const result: QueryResult = await db.query(query, [email]);
    const results: any[] = result.rows;

    if (results.length > 0) {
      return res.status(200).json({ name: results[0].name });
    } else {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }
  } catch (err) {
    console.error("Erro ao buscar dados do usuário:", err);
    return res
      .status(500)
      .json({ message: "Erro ao buscar dados do usuário", error: err });
  }
};
