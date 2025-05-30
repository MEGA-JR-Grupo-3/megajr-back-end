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
export const updateUserProfilePhoto = async (
  req: AuthRequest,
  res: Response
) => {
  const { photoURL } = req.body;
  const userEmail = req.userEmail;

  if (!photoURL) {
    return res.status(400).json({
      message: "URL da nova foto de perfil não fornecido!",
    });
  }

  if (!userEmail) {
    return res.status(401).json({
      message: "Usuário não autenticado corretamente.",
    });
  }

  try {
    const db = await dbPromise;
    const query = `UPDATE usuario SET foto_perfil = $1 WHERE email = $2 RETURNING name, email, foto_perfil`;

    const result: QueryResult = await db.query(query, [photoURL, userEmail]);

    if (result.rowCount && result.rowCount > 0) {
      return res.status(200).json({
        message: "Foto atualizada com sucesso.",
        user: result.rows[0],
      });
    } else {
      return res.status(404).json({ message: "Usuário não encontrado." });
    }
  } catch (err) {
    console.error("Erro no DB:", err);
    return res.status(500).json({
      message: "Erro ao atualizar foto.",
      error: err,
    });
  }
};

// Atualizar o nome da conta no DB
export const updateAccountName = async (req: AuthRequest, res: Response) => {
  const { newAccountName } = req.body;
  const userEmail = req.userEmail;

  if (!newAccountName) {
    return res.status(400).json({
      message: "Nome da conta não fornecido!",
    });
  }

  if (!userEmail) {
    return res.status(401).json({
      message: "Usuário não autenticado corretamente.",
    });
  }

  try {
    const db = await dbPromise;
    const query = `UPDATE usuario SET name = $1 WHERE email = $2 RETURNING id_usuario, name, email, foto_perfil`;

    const result: QueryResult = await db.query(query, [
      newAccountName,
      userEmail,
    ]);

    if (result.rowCount && result.rowCount > 0) {
      return res.status(200).json({
        message: "Nome da conta atualizado com sucesso.",
        user: result.rows[0],
      });
    } else {
      return res.status(404).json({ message: "Usuário não encontrado." });
    }
  } catch (err) {
    console.error("Erro no DB ao atualizar nome da conta:", err);
    return res.status(500).json({
      message: "Erro ao atualizar nome da conta.",
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

  const pool = await dbPromise;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    let userIdFromDb: string | null = null;
    if (firebaseUid) {
      const userQueryResult = await client.query(
        "SELECT id_usuario FROM usuario WHERE firebase_uid = $1",
        [firebaseUid]
      );
      if (userQueryResult.rows.length > 0) {
        userIdFromDb = userQueryResult.rows[0].id_usuario;
      }
    } else if (userEmail) {
      const userQueryResult = await client.query(
        "SELECT id_usuario FROM usuario WHERE email = $1",
        [userEmail]
      );
      if (userQueryResult.rows.length > 0) {
        userIdFromDb = userQueryResult.rows[0].id_usuario;
      }
    }

    if (!userIdFromDb) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        message:
          "Dados do usuário não encontrados no banco de dados para deleção.",
      });
    }
    await client.query("DELETE FROM tarefa WHERE id_usuario = $1", [
      userIdFromDb,
    ]);
    console.log(`Tarefas do usuário ${userIdFromDb} deletadas.`);

    const result: QueryResult = await client.query(
      "DELETE FROM usuario WHERE id_usuario = $1",
      [userIdFromDb]
    );
    console.log(`Usuário ${userIdFromDb} deletado da tabela usuario.`);

    if (result.rowCount && result.rowCount > 0) {
      await client.query("COMMIT");
      return res.status(200).json({
        message: "Dados do usuário e relacionados deletados do banco de dados.",
      });
    } else {
      await client.query("ROLLBACK");
      return res.status(404).json({
        message:
          "Usuário principal não encontrado após deleção de dados relacionados.",
      });
    }
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Erro ao deletar dados do usuário no DB:", err);
    return res.status(500).json({
      message:
        "Erro ao deletar dados do usuário no banco de dados. Transação revertida.",
      error: err,
    });
  } finally {
    client.release();
  }
};
