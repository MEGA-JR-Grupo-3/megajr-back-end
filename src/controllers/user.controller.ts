// src/controllers/user.controller.ts

import { dbPromise } from "../db/connection.js";
import { Request, Response } from "express";
import { QueryResult } from "pg";
import { AuthRequest } from "../middlewares/auth.middleware.js";

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
    return res.status(400).json({
      message: "Dados do usuário incompletos para cadastro/sincronização.",
    });
  }

  const db = await dbPromise;
  const checkUserQuery = "SELECT * FROM usuario WHERE email = $1";
  try {
    const userExistsResult: QueryResult = await db.query(checkUserQuery, [
      email,
    ]);
    if (userExistsResult.rows.length > 0) {
      return res.status(200).json({
        message: "Usuário já cadastrado no seu banco de dados.",
        user: userExistsResult.rows[0],
      });
    }

    const insertQuery =
      "INSERT INTO usuario (name, email, firebase_uid) VALUES ($1, $2, $3) RETURNING id_usuario, name, email, firebase_uid";
    const insertResult: QueryResult = await db.query(insertQuery, [
      name,
      email,
      firebaseUid,
    ]);

    const insertedUser = insertResult.rows[0];

    return res.status(201).json({
      message: "Usuário cadastrado com sucesso no seu banco de dados!",
      user: insertedUser,
    });
  } catch (err) {
    console.error("Erro ao cadastrar/sincronizar usuário:", err);
    return res
      .status(500)
      .json({ message: "Erro ao cadastrar/sincronizar usuário", error: err });
  }
};

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
    const userExistsResult: QueryResult = await db.query(
      "SELECT id_usuario, name, email, firebase_uid FROM usuario WHERE email = $1",
      [email]
    );
    const userExists: any[] = userExistsResult.rows;

    if (userExists.length === 0) {
      console.log(
        "-> handleGoogleLogin: Usuário não existe no DB, criando novo..."
      );
      const insertQuery =
        "INSERT INTO usuario (name, email, firebase_uid) VALUES ($1, $2, $3) RETURNING id_usuario, name, email, firebase_uid";
      const insertResult: QueryResult = await db.query(insertQuery, [
        name,
        email,
        firebaseUid,
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
      if (!userExists[0].firebase_uid) {
        await db.query(
          "UPDATE usuario SET firebase_uid = $1 WHERE email = $2",
          [firebaseUid, email]
        );
        console.log(
          "-> handleGoogleLogin: firebase_uid atualizado para o usuário existente."
        );
      }

      return res.status(200).json({
        message: "Usuário Google encontrado no DB",
        user: userExists[0],
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

// Função para buscar dados do usuário
export const getUserData = async (req: AuthRequest, res: Response) => {
  const email = req.userEmail;

  if (!email) {
    return res
      .status(401)
      .json({ message: "Email do usuário não disponível no token." });
  }

  try {
    const db = await dbPromise;
    const query =
      "SELECT id_usuario, name, email, foto_perfil, data_criacao, firebase_uid FROM usuario WHERE email = $1";
    const result: QueryResult = await db.query(query, [email]);
    const user = result.rows[0];

    if (user) {
      return res.status(200).json({
        id_usuario: user.id_usuario,
        name: user.name,
        email: user.email,
        foto_perfil: user.foto_perfil,
        data_criacao: user.data_criacao,
        firebase_uid: user.firebase_uid,
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

// Atualizar foto de perfil no DB
export const updateUserProfilePhoto = async (req: AuthRequest, res: Response) =>{
  const {newPhoto} = req.body;
  const userEmail = req.userEmail;

  if (!newPhoto){
    return res.status(400).json({
      message: "Nova foto do perfil não fornecida.",
    });
  }

  try {
    const db = await dbPromise;
    const query = `
      UPDATE usuario
      SET foto_perfil = $1
      WHERE email = $2
      RETURNING *
    `;
    const result: QueryResult = await db.query(query, [newPhoto,userEmail]);

    if (result.rowCount && result.rowCount > 0) {
      return res.status(200).json({
        message: "Foto atualizada com sucesso no DB.",
        user: result.rows[0],
      });
    } else {
      return res
        .status(404)
        .json({ message: "Usuário não encontrado para atualizar a foto de perfil." });
    }
  } catch (err) {
    console.error("Erro ao atualizar foto do perfil no DB:", err);
    return res.status(500).json({
      message: "Erro ao atualizar foto do perfil no banco de dados",
      error: err,
    });
  }

};

// Atualizar email no DB
export const updateUserEmail = async (req: AuthRequest, res: Response) => {
  const oldEmail = req.userEmail;
  const { newEmail } = req.body;

  if (!oldEmail || !newEmail) {
    return res.status(400).json({
      message: "Email antigo ou novo email não fornecidos.",
    });
  }

  try {
    const db = await dbPromise;
    const checkDuplicateQuery = "SELECT email FROM usuario WHERE email = $1";
    const duplicateResult: QueryResult = await db.query(checkDuplicateQuery, [
      newEmail,
    ]);
    if (duplicateResult.rows.length > 0) {
      return res
        .status(409)
        .json({ message: "Este novo email já está em uso por outra conta." });
    }

    const query = "UPDATE usuario SET email = $1 WHERE email = $2 RETURNING *";
    const result: QueryResult = await db.query(query, [newEmail, oldEmail]);

    if (result.rowCount && result.rowCount > 0) {
      return res.status(200).json({
        message: "Email atualizado com sucesso no DB.",
        user: result.rows[0],
      });
    } else {
      return res
        .status(404)
        .json({ message: "Usuário não encontrado para atualizar o email." });
    }
  } catch (err) {
    console.error("Erro ao atualizar email no DB:", err);
    return res.status(500).json({
      message: "Erro ao atualizar email no banco de dados",
      error: err,
    });
  }
};

// Deletar dados do usuário no DB
export const deleteUserData = async (req: AuthRequest, res: Response) => {
  const firebaseUid = req.userId;
  const userEmail = req.userEmail;

  if (!firebaseUid && !userEmail) {
    return res
      .status(401)
      .json({ message: "UID ou Email do usuário não disponível no token." });
  }

  try {
    const db = await dbPromise;
    let query = "";
    let params: string[] = [];

    if (firebaseUid) {
      query = "DELETE FROM usuario WHERE firebase_uid = $1";
      params = [firebaseUid];
    } else if (userEmail) {
      query = "DELETE FROM usuario WHERE email = $1";
      params = [userEmail];
      console.warn(
        "Deletando usuário por email. Considere adicionar 'firebase_uid' à sua tabela 'usuario' para exclusão mais robusta."
      );
    } else {
      return res.status(400).json({
        message: "Não foi possível identificar o usuário para exclusão.",
      });
    }

    const result: QueryResult = await db.query(query, params);

    if (result.rowCount && result.rowCount > 0) {
      return res
        .status(200)
        .json({ message: "Dados do usuário deletados do banco de dados." });
    } else {
      return res.status(404).json({
        message: "Dados do usuário não encontrados no banco de dados.",
      });
    }
  } catch (err) {
    console.error("Erro ao deletar dados do usuário no DB:", err);
    return res.status(500).json({
      message: "Erro ao deletar dados do usuário no banco de dados",
      error: err,
    });
  }
};
