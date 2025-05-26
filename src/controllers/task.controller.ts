// src/controllers/task.controller.ts

import { Pool, QueryResult } from "pg";
import { dbPromise } from "../db/connection.js";
import { Request, Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware.js";

// BUSCAR TAREFAS POR TITULO-----------------------------------------------------------------------------------------------------
export const searchTasks = async (req: AuthRequest, res: Response) => {
  // Use AuthRequest
  try {
    const email = req.userEmail;
    const { query } = req.body;

    if (!email || !query || typeof query !== "string") {
      return res.status(400).json({
        message:
          "Email do usuário (do token) e termo de pesquisa (query) são obrigatórios e devem ser strings.",
      });
    }

    const db = await dbPromise;
    const userResult = await db.query(
      "SELECT id_usuario FROM usuario WHERE email = $1",
      [email]
    );

    const userRows: any[] = userResult.rows;

    if (userRows.length === 0) {
      return res
        .status(404)
        .json({ message: "Usuário do token não encontrado no DB." });
    }
    const userId = userRows[0].id_usuario;

    const sql =
      "SELECT * FROM tarefa WHERE id_usuario = $1 AND titulo ILIKE $2";
    const searchTerm = `%${query}%`;

    const tasksResult = await db.query(sql, [userId, searchTerm]);
    const results: any[] = tasksResult.rows;

    if (results.length > 0) {
      return res.status(200).json(results);
    } else {
      return res.status(200).json([]);
    }
  } catch (err) {
    console.error("Erro ao buscar tarefas:", err);
    return res.status(500).json({
      message: "Erro interno do servidor ao pesquisar tarefas.",
      error: err,
    });
  }
};

// BUSCAR TAREFAS POR USUARIO-----------------------------------------------------------------------------------------------------
export const getTasksByUser = async (req: AuthRequest, res: Response) => {
  // Use AuthRequest
  const email = req.userEmail;
  console.log("-> getTasksByUser: Requisição recebida para o email:", email);

  if (!email) {
    console.log(
      "-> getTasksByUser: Erro - Email não fornecido no token de autenticação."
    );
    return res.status(400).json({
      message: "Email do usuário é obrigatório no token de autenticação.",
    });
  }

  const db = await dbPromise;
  console.log("-> getTasksByUser: Pool de conexão obtido com sucesso.");

  const sql = `SELECT t.* FROM tarefa t JOIN usuario u ON t.id_usuario = u.id_usuario WHERE u.email = $1 ORDER BY t.ordem ASC`;
  console.log("-> getTasksByUser: SQL da consulta preparado.");

  try {
    console.log("-> getTasksByUser: Tentando executar a consulta SQL...");
    const tasksResult = await db.query(sql, [email]);
    const results: any[] = tasksResult.rows;

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
export const addTask = async (req: AuthRequest, res: Response) => {
  // Use AuthRequest
  const { titulo, descricao, data_prazo, prioridade } = req.body;
  const email = req.userEmail;

  const estado_tarefa = "Pendente";

  if (!titulo || !prioridade || !email) {
    return res.status(400).json({
      message:
        "Título e prioridade são obrigatórios. Email do usuário não encontrado no token.",
    });
  }

  try {
    const db = await dbPromise;

    const userResult = await db.query(
      "SELECT id_usuario FROM usuario WHERE email = $1",
      [email]
    );
    const userRows: any[] = userResult.rows;

    if (!userRows || userRows.length === 0) {
      return res.status(404).json({
        message: "Usuário não encontrado no DB para o email do token.",
      });
    }

    const id_usuario = userRows[0].id_usuario;

    const sql = `
             INSERT INTO tarefa (titulo, descricao, data_prazo, prioridade, estado_tarefa, id_usuario)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id_tarefa;
         `;

    const taskInsertResult = await db.query(sql, [
      titulo,
      descricao,
      data_prazo || null,
      prioridade,
      estado_tarefa,
      id_usuario,
    ]);

    const insertedTaskId =
      taskInsertResult.rows && taskInsertResult.rows.length > 0
        ? taskInsertResult.rows[0].id_tarefa
        : null;

    return res.status(201).json({
      message: "Tarefa adicionada com sucesso!",
      insertId: insertedTaskId,
    });
  } catch (err) {
    console.error("Erro ao adicionar tarefa:", err);
    return res
      .status(500)
      .json({ message: "Erro ao adicionar tarefa", error: err });
  }
};

//DELETAR TAREFA-----------------------------------------------------------------------------------------------------------------
export const deleteTask = async (req: AuthRequest, res: Response) => {
  // Use AuthRequest
  const { id_tarefa } = req.params;
  const email = req.userEmail;

  const taskIdNum = parseInt(id_tarefa as string);
  if (isNaN(taskIdNum) || !email) {
    return res
      .status(400)
      .json({ message: "ID da tarefa inválido ou email do usuário ausente." });
  }

  try {
    const db = await dbPromise;
    const userResult = await db.query(
      "SELECT id_usuario FROM usuario WHERE email = $1",
      [email]
    );
    const userRows: any[] = userResult.rows;

    if (!userRows || userRows.length === 0) {
      return res.status(404).json({ message: "Usuário não encontrado." });
    }
    const id_usuario = userRows[0].id_usuario;

    const deleteResult = await db.query(
      "DELETE FROM tarefa WHERE id_tarefa = $1 AND id_usuario = $2",
      [taskIdNum, id_usuario]
    );

    if (deleteResult.rowCount! > 0) {
      return res.status(200).json({ message: "Tarefa deletada com sucesso!" });
    } else {
      const taskCheck = await db.query(
        "SELECT id_tarefa FROM tarefa WHERE id_tarefa = $1",
        [taskIdNum]
      );
      if (taskCheck.rows.length === 0) {
        return res.status(404).json({ message: "Tarefa não encontrada." });
      } else {
        return res.status(403).json({
          message: "Você não tem permissão para deletar esta tarefa.",
        });
      }
    }
  } catch (err) {
    console.error("Erro ao deletar tarefa:", err);
    return res
      .status(500)
      .json({ message: "Erro ao deletar tarefa", error: err });
  }
};

// ATUALIZAR APENAS O ESTADO DA TAREFA (EXISTENTE)-----------------------------------------------------------------------------------------------------
export const updateTaskStatus = async (req: AuthRequest, res: Response) => {
  // Use AuthRequest
  const { id_tarefa } = req.params;
  const { estado_tarefa } = req.body;
  const email = req.userEmail;

  const taskIdNum = parseInt(id_tarefa as string);
  if (isNaN(taskIdNum) || !estado_tarefa || !email) {
    return res.status(400).json({
      message:
        "ID da tarefa e novo estado são obrigatórios e válidos. Email do usuário ausente.",
    });
  }

  if (estado_tarefa !== "Pendente" && estado_tarefa !== "Finalizada") {
    return res.status(400).json({
      message: "Estado da tarefa deve ser 'Pendente' ou 'Finalizada'.",
    });
  }

  try {
    const db = await dbPromise;
    const userResult = await db.query(
      "SELECT id_usuario FROM usuario WHERE email = $1",
      [email]
    );
    const userRows: any[] = userResult.rows;

    if (!userRows || userRows.length === 0) {
      return res.status(404).json({ message: "Usuário não encontrado." });
    }
    const id_usuario = userRows[0].id_usuario;

    const updateResult = await db.query(
      "UPDATE tarefa SET estado_tarefa = $1 WHERE id_tarefa = $2 AND id_usuario = $3",
      [estado_tarefa, taskIdNum, id_usuario]
    );

    if (updateResult.rowCount! > 0) {
      return res
        .status(200)
        .json({ message: "Estado da tarefa atualizado com sucesso!" });
    } else {
      const taskCheck = await db.query(
        "SELECT id_tarefa FROM tarefa WHERE id_tarefa = $1",
        [taskIdNum]
      );
      if (taskCheck.rows.length === 0) {
        return res.status(404).json({ message: "Tarefa não encontrada." });
      } else {
        return res.status(403).json({
          message: "Você não tem permissão para atualizar esta tarefa.",
        });
      }
    }
  } catch (err) {
    console.error("Erro ao atualizar estado da tarefa:", err);
    return res
      .status(500)
      .json({ message: "Erro ao atualizar estado da tarefa", error: err });
  }
};

// ATUALIZAR TAREFA COMPLETA-----------------------------------------------------------------------------------------------------
export const updateTask = async (req: AuthRequest, res: Response) => {
  // Use AuthRequest
  const { id_tarefa } = req.params;
  const { titulo, descricao, data_prazo, prioridade, estado_tarefa } = req.body;
  const email = req.userEmail;

  const taskIdNum = parseInt(id_tarefa as string);
  if (isNaN(taskIdNum) || !titulo || !prioridade || !estado_tarefa || !email) {
    return res.status(400).json({
      message:
        "ID da tarefa, título, prioridade, estado da tarefa são obrigatórios e válidos. Email do usuário ausente.",
    });
  }

  try {
    const db = await dbPromise;
    const userResult = await db.query(
      "SELECT id_usuario FROM usuario WHERE email = $1",
      [email]
    );
    const userRows: any[] = userResult.rows;

    if (!userRows || userRows.length === 0) {
      return res.status(404).json({ message: "Usuário não encontrado." });
    }
    const id_usuario = userRows[0].id_usuario;

    const formattedDataPrazo = data_prazo
      ? new Date(data_prazo).toISOString().split("T")[0]
      : null;

    const sql = `
             UPDATE tarefa
             SET
               titulo = $1,
               descricao = $2,
               data_prazo = $3,
               prioridade = $4,
               estado_tarefa = $5
             WHERE
               id_tarefa = $6 AND id_usuario = $7; -- Garanta que seja do usuário logado
         `;
    const values = [
      titulo,
      descricao,
      formattedDataPrazo,
      prioridade,
      estado_tarefa,
      taskIdNum,
      id_usuario,
    ];

    const updateResult = await db.query(sql, values);

    if (updateResult.rowCount! > 0) {
      return res
        .status(200)
        .json({ message: "Tarefa atualizada com sucesso!" });
    } else {
      const taskCheck = await db.query(
        "SELECT id_tarefa FROM tarefa WHERE id_tarefa = $1",
        [taskIdNum]
      );
      if (taskCheck.rows.length === 0) {
        return res.status(404).json({ message: "Tarefa não encontrada." });
      } else {
        return res.status(403).json({
          message: "Você não tem permissão para atualizar esta tarefa.",
        });
      }
    }
  } catch (err) {
    console.error("Erro ao atualizar tarefa completa:", err);
    return res
      .status(500)
      .json({ message: "Erro ao atualizar tarefa completa", error: err });
  }
};

// REORDENAR TAREFAS-----------------------------------------------------------------------------------------------------
export const reorderTasks = async (req: AuthRequest, res: Response) => {
  const { tasks } = req.body;
  const email = req.userEmail;

  if (!email || !Array.isArray(tasks) || tasks.length === 0) {
    return res.status(400).json({
      message:
        "Dados inválidos para reordenar tarefas. Email do usuário ausente ou array de tarefas vazio.",
    });
  }

  const pool = await dbPromise;
  let client: import("pg").PoolClient | undefined;

  try {
    client = await pool.connect();
    await client.query("BEGIN");

    const userResult = await client.query(
      "SELECT id_usuario FROM usuario WHERE email = $1",
      [email]
    );
    const userRows: any[] = userResult.rows;

    if (!userRows || userRows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Usuário não encontrado." });
    }

    const id_usuario = userRows[0].id_usuario;

    for (const task of tasks) {
      const { id_tarefa, ordem } = task;

      const taskIdNum = parseInt(id_tarefa as string);
      if (
        isNaN(taskIdNum) ||
        typeof ordem === "undefined" ||
        typeof ordem !== "number"
      ) {
        throw new Error(
          `Dados de tarefa inválidos: { id_tarefa: ${id_tarefa}, ordem: ${ordem} }. Ordem deve ser um número válido.`
        );
      }

      const updateOrderResult = await client.query(
        `UPDATE tarefa
           SET ordem = $1
           WHERE id_tarefa = $2 AND id_usuario = $3;`,
        [ordem, taskIdNum, id_usuario]
      );
    }

    await client.query("COMMIT");
    res
      .status(200)
      .json({ message: "Ordem das tarefas atualizada com sucesso!" });
  } catch (err: any) {
    if (client) {
      await client.query("ROLLBACK");
    }
    console.error("Erro ao reordenar tarefas:", err);
    return res.status(500).json({
      message: `Erro ao reordenar tarefas: ${
        err.message || "Erro desconhecido."
      }`,
      error: err,
    });
  } finally {
    if (client) {
      client.release();
    }
  }
};

// DELETAR TODAS AS TAREFAS CONCLUÍDAS --------------------------------------------------------------------------------------------
export const deleteAllCompletedTasks = async (
  req: AuthRequest,
  res: Response
) => {
  const email = req.userEmail;

  if (!email) {
    return res
      .status(400)
      .json({ message: "Email do usuário ausente no token de autenticação." });
  }

  const db = await dbPromise;
  let client: import("pg").PoolClient | undefined;

  try {
    client = await db.connect();
    await client.query("BEGIN");

    const userResult = await client.query(
      "SELECT id_usuario FROM usuario WHERE email = $1",
      [email]
    );
    const userRows: any[] = userResult.rows;

    if (!userRows || userRows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Usuário não encontrado." });
    }
    const id_usuario = userRows[0].id_usuario;

    const deleteResult = await client.query(
      `DELETE FROM tarefa
       WHERE id_usuario = $1
       AND estado_tarefa = 'Finalizada'`,
      [id_usuario]
    );
    if (deleteResult.rowCount === 0) {
      await client.query("COMMIT");
      return res
        .status(200)
        .json({ message: "Nenhuma tarefa concluída para deletar." });
    } else {
      await client.query("COMMIT");
      return res.status(200).json({
        message: `Foram deletadas ${deleteResult.rowCount} tarefas concluídas com sucesso!`,
      });
    }
  } catch (err: any) {
    if (client) {
      await client.query("ROLLBACK");
    }
    console.error("Erro ao deletar tarefas concluídas:", err);
    return res.status(500).json({
      message: `Erro ao deletar tarefas concluídas: ${
        err.message || "Erro desconhecido."
      }`,
      error: err,
    });
  } finally {
    if (client) {
      client.release();
    }
  }
};
