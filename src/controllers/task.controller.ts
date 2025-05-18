// src/controllers/task.controller.ts

import { dbPromise } from "../db/connection.js";
import { Request, Response } from "express";
import { RowDataPacket, ResultSetHeader } from "mysql2";

// BUSCAR TAREFAS POR TITULO-----------------------------------------------------------------------------------------------------
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

// BUSCAR TAREFAS POR USUARIO-----------------------------------------------------------------------------------------------------
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

// ADICIONAR TAREFA---------------------------------------------------------------------------------------------------------------
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
      data_prazo || null, // Garante que data_prazo seja null se vazio
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

//DELETAR TAREFA-----------------------------------------------------------------------------------------------------------------
export const deleteTask = async (req: Request, res: Response) => {
  const { id_tarefa } = req.params;

  if (!id_tarefa) {
    return res
      .status(400)
      .json({ message: "ID da tarefa é obrigatório para deletar." });
  }

  try {
    const db = await dbPromise;
    const [result] = await db.query<ResultSetHeader>(
      "DELETE FROM tarefa WHERE id_tarefa = ?",
      [id_tarefa]
    );

    if (result.affectedRows > 0) {
      return res.status(200).json({ message: "Tarefa deletada com sucesso!" });
    } else {
      return res.status(404).json({ message: "Tarefa não encontrada." });
    }
  } catch (err) {
    console.error("Erro ao deletar tarefa:", err);
    return res
      .status(500)
      .json({ message: "Erro ao deletar tarefa", error: err });
  }
};

// ATUALIZAR APENAS O ESTADO DA TAREFA (EXISTENTE)-----------------------------------------------------------------------------------------------------
export const updateTaskStatus = async (req: Request, res: Response) => {
  const { id_tarefa } = req.params;
  const { estado_tarefa } = req.body;

  if (!id_tarefa || !estado_tarefa) {
    return res
      .status(400)
      .json({ message: "ID da tarefa e novo estado são obrigatórios." });
  }

  if (estado_tarefa !== "Pendente" && estado_tarefa !== "Finalizada") {
    return res.status(400).json({
      message: "Estado da tarefa deve ser 'Pendente' ou 'Finalizada'.",
    });
  }

  try {
    const db = await dbPromise;
    const [result] = await db.query<ResultSetHeader>(
      "UPDATE tarefa SET estado_tarefa = ? WHERE id_tarefa = ?",
      [estado_tarefa, id_tarefa]
    );

    if (result.affectedRows > 0) {
      return res
        .status(200)
        .json({ message: "Estado da tarefa atualizado com sucesso!" });
    } else {
      return res.status(404).json({ message: "Tarefa não encontrada." });
    }
  } catch (err) {
    console.error("Erro ao atualizar estado da tarefa:", err);
    return res
      .status(500)
      .json({ message: "Erro ao atualizar estado da tarefa", error: err });
  }
};

// ATUALIZAR TAREFA COMPLETA-----------------------------------------------------------------------------------------------------
export const updateTask = async (req: Request, res: Response) => {
  // O ID da tarefa virá dos parâmetros da URL
  const { id_tarefa } = req.params;
  // Os dados atualizados virão do corpo da requisição
  const { titulo, descricao, data_prazo, prioridade, estado_tarefa } = req.body;

  if (!id_tarefa || !titulo || !prioridade || !estado_tarefa) {
    return res.status(400).json({
      message:
        "ID da tarefa, título, prioridade e estado da tarefa são obrigatórios.",
    });
  }

  try {
    const db = await dbPromise;

    const formattedDataPrazo = data_prazo
      ? new Date(data_prazo).toISOString().split("T")[0]
      : null;

    // 2. Consulta ao Banco de Dados para Atualizar a Tarefa
    const sql = `
            UPDATE tarefa
            SET
                titulo = ?,
                descricao = ?,
                data_prazo = ?,
                prioridade = ?,
                estado_tarefa = ?
            WHERE
                id_tarefa = ?;
        `;
    const values = [
      titulo,
      descricao,
      formattedDataPrazo,
      prioridade,
      estado_tarefa,
      id_tarefa,
    ];

    const [result] = await db.query<ResultSetHeader>(sql, values);

    if (result.affectedRows > 0) {
      return res
        .status(200)
        .json({ message: "Tarefa atualizada com sucesso!" });
    } else {
      return res.status(404).json({ message: "Tarefa não encontrada." });
    }
  } catch (err) {
    console.error("Erro ao atualizar tarefa completa:", err);
    return res
      .status(500)
      .json({ message: "Erro ao atualizar tarefa completa", error: err });
  }
};
