import { dbPromise } from "../db/connection.js";
import { Request, Response } from "express";
import { RowDataPacket, ResultSetHeader } from "mysql2";

export const searchTasks = async (req: Request, res: Response) => {
  const { query } = req.query;

  if (!query) {
    return res
      .status(400)
      .json({ message: "O termo de pesquisa é obrigatório." });
  }

  const db = await dbPromise;
  const sql = "SELECT * FROM tarefa WHERE titulo LIKE ?";
  const searchTerm = `%${query}%`; // Adiciona curingas para busca "contém"

  try {
    const [results] = await db.query<RowDataPacket[]>(sql, [searchTerm]);
    return res.status(200).json(results);
  } catch (err) {
    console.error("Erro ao buscar tarefas:", err);
    return res
      .status(500)
      .json({ message: "Erro ao buscar tarefas", error: err });
  }
};

export const getTasksByUser = async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email do usuário é obrigatório." });
  }

  const db = await dbPromise;
  const sql =
    "SELECT t.* FROM tarefa t JOIN usuario u ON t.id_usuario = u.id_usuario WHERE u.email = ?";

  try {
    const [results] = await db.query<RowDataPacket[]>(sql, [email]);
    return res.status(200).json(results);
  } catch (err) {
    console.error("Erro ao buscar tarefas do usuário:", err);
    return res
      .status(500)
      .json({ message: "Erro ao buscar tarefas do usuário", error: err });
  }
};

export const addTask = async (req: Request, res: Response) => {
  const { titulo, descricao, data_prazo, prioridade, estado_tarefa, email } =
    req.body;

  if (!titulo || !prioridade || !estado_tarefa || !email) {
    return res.status(400).json({
      message:
        "Título, prioridade, estado e email do usuário são obrigatórios.",
    });
  }

  try {
    const db = await dbPromise;

    // Primeiro, precisamos obter o id_usuario com base no email
    const [userRows] = await db.query<RowDataPacket[]>(
      "SELECT id_usuario FROM usuario WHERE email = ?",
      [email]
    );

    if (!userRows || userRows.length === 0) {
      return res.status(404).json({ message: "Usuário não encontrado." });
    }

    const id_usuario = userRows[0].id_usuario;

    const sql = `
      INSERT INTO tarefa (titulo, descricao, data_prazo, prioridade, estado_tarefa, id_usuario)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    const [result] = await db.query<ResultSetHeader>(sql, [
      titulo,
      descricao,
      data_prazo || null,
      prioridade,
      estado_tarefa,
      id_usuario,
    ]);

    return res.status(201).json({
      message: "Tarefa adicionada com sucesso!",
      insertId: result.insertId,
    });
  } catch (err) {
    console.error("Erro ao adicionar tarefa:", err);
    return res
      .status(500)
      .json({ message: "Erro ao adicionar tarefa", error: err });
  }
};
