import { dbPromise } from "../db/connection.js";
import { Request, Response } from "express";
import { RowDataPacket } from "mysql2";

// Função para buscar usuários
export const getUsers = async (_: Request, res: Response) => {
  const db = await dbPromise;
  const q = "SELECT * FROM usuarios";
  try {
    const [data] = await db.query<RowDataPacket[]>(q);
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
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email é obrigatório" });
  }

  const db = await dbPromise;
  const q = "SELECT * FROM usuarios WHERE email = ?";
  try {
    const [data] = await db.query<RowDataPacket[]>(q, [email]);

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
export const createUser = async (req: Request, res: Response) => {
  const { name, email, senha } = req.body;

  const userPassword = senha || "senhaGeradaPeloSistema";

  // Validação básica de campos
  if (!name || !email || !userPassword) {
    return res
      .status(400)
      .json({ message: "Todos os campos são obrigatórios" });
  }

  const db = await dbPromise;
  // Verificar se o e-mail já está registrado
  const checkEmailQuery = "SELECT * FROM usuarios WHERE email = ?";
  try {
    const [userExists] = await db.query<RowDataPacket[]>(checkEmailQuery, [
      email,
    ]);

    if (userExists.length > 0) {
      return res.status(409).json({ message: "Email já cadastrado" });
    }

    // Inserir novo usuário no banco de dados
    const insertQuery =
      "INSERT INTO usuarios (name, email, senha) VALUES (?, ?, ?)";
    const [result] = await db.query(insertQuery, [name, email, userPassword]);

    return res
      .status(201)
      .json({ message: "Usuário cadastrado com sucesso!", result });
  } catch (err) {
    console.error("Erro ao cadastrar usuário:", err);
    return res
      .status(500)
      .json({ message: "Erro ao cadastrar usuário", error: err });
  }
};
