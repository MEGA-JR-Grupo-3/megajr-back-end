// src/controllers/task.controller.ts

import { dbPromise } from "../db/connection.js";
import { Request, Response } from "express";
import { RowDataPacket, ResultSetHeader, PoolConnection } from "mysql2/promise";

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
// src/controllers/task.controller.ts

export const getTasksByUser = async (req: Request, res: Response) => {
  const { email } = req.body;
  console.log("-> getTasksByUser: Requisição recebida para o email:", email);

  if (!email) {
    console.log(
      "-> getTasksByUser: Erro - Email não fornecido no corpo da requisição."
    );
    return res.status(400).json({ message: "Email do usuário é obrigatório." });
  }

  const db = await dbPromise;
  console.log("-> getTasksByUser: Pool de conexão obtido com sucesso.");

  const sql = `SELECT t.* FROM tarefa t JOIN usuario u ON t.id_usuario = u.id_usuario WHERE u.email = ? ORDER BY t.ordem ASC`;
  console.log("-> getTasksByUser: SQL da consulta preparado.");

  try {
    console.log("-> getTasksByUser: Tentando executar a consulta SQL...");
    const [results] = await db.query<RowDataPacket[]>(sql, [email]);
    console.log(
      "-> getTasksByUser: Consulta SQL executada com sucesso. Resultados:",
      results.length
    );
    return res.status(200).json(results);
  } catch (err: any) {
    console.error("-> getTasksByUser: ERRO CRÍTICO no bloco try-catch:", err);
    console.error("-> getTasksByUser: Mensagem de erro:", err.message);

    return res.status(500).json({
      message: "Erro ao buscar tarefas do usuário",
      error: err.message || "Erro desconhecido",
    });
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

// REORDENAR TAREFAS-----------------------------------------------------------------------------------------------------
export const reorderTasks = async (req: Request, res: Response) => {
  const { email, tasks } = req.body;

  if (!email || !Array.isArray(tasks) || tasks.length === 0) {
    return res.status(400).json({
      message:
        "Dados inválidos para reordenar tarefas. Email e array de tarefas são obrigatórios.",
    });
  }

  // Agora 'db' (que renomeei para 'pool' para clareza) é um Pool
  const pool = await dbPromise; // Você pode manter 'db' se preferir, mas 'pool' é mais descritivo
  let connection: PoolConnection | undefined; // <-- AQUI ESTÁ O AJUSTE PRINCIPAL NA TIPAGEM

  try {
    connection = await pool.getConnection(); // Obtém uma conexão do pool
    await connection.beginTransaction(); // Inicia a transação nesta conexão

    const [userRows] = await connection.query<RowDataPacket[]>(
      "SELECT id_usuario FROM usuario WHERE email = ?",
      [email]
    );

    if (!userRows || userRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: "Usuário não encontrado." });
    }

    const id_usuario = userRows[0].id_usuario;

    for (const task of tasks) {
      const { id_tarefa, ordem } = task;

      if (
        typeof id_tarefa === "undefined" ||
        typeof ordem === "undefined" ||
        typeof ordem !== "number"
      ) {
        throw new Error(
          `Dados de tarefa inválidos: { id_tarefa: ${id_tarefa}, ordem: ${ordem} }`
        );
      }

      await connection.query<ResultSetHeader>(
        `UPDATE tarefa
         SET ordem = ?
         WHERE id_tarefa = ? AND id_usuario = ?;`,
        [ordem, id_tarefa, id_usuario]
      );
    }

    await connection.commit();
    res
      .status(200)
      .json({ message: "Ordem das tarefas atualizada com sucesso!" });
  } catch (err: any) {
    if (connection) {
      await connection.rollback();
    }
    console.error("Erro ao reordenar tarefas:", err);
    return res.status(500).json({
      message: `Erro ao reordenar tarefas: ${
        err.message || "Erro desconhecido."
      }`,
      error: err,
    });
  } finally {
    if (connection) {
      connection.release(); // Libera a conexão de volta para o pool
    }
  }
};
