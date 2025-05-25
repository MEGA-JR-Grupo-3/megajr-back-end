// src/controllers/user.controller.ts

import { dbPromise } from "../db/connection.js";
import { Request, Response } from "express";
import { QueryResult } from "pg";
import bcrypt from "bcryptjs"; // Importar bcryptjs
import { unlink, writeFile } from "fs/promises"; // Para salvar/deletar arquivos localmente
import path from "path";
import { fileURLToPath } from "url";

// Helper para __dirname em módulos ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Defina o diretório de uploads. Crie esta pasta na raiz do seu backend.
const UPLOADS_DIR = path.join(
  __dirname,
  "..",
  "..",
  "uploads",
  "profile-photos"
);
// Certifique-se de que a pasta 'uploads/profile-photos' existe na raiz do seu projeto backend.
// Se não existir, você pode criá-la manualmente ou usar um script de inicialização.

// --- Funções Existentes (mantidas como estão, ou com pequenas melhorias) ---

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
    // Adicionando validação de tipo
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

// Função para cadastrar um novo usuário (com hashing de senha)
export const createUser = async (req: Request, res: Response) => {
  const { name, email, senha } = req.body;

  if (!name || !email || !senha) {
    // 'senha' agora é obrigatória para cadastro tradicional
    return res
      .status(400)
      .json({ message: "Nome, email e senha são obrigatórios." });
  }

  const db = await dbPromise;
  const checkEmailQuery = "SELECT * FROM usuario WHERE email = $1";
  try {
    const userExistsResult: QueryResult = await db.query(checkEmailQuery, [
      email,
    ]);
    if (userExistsResult.rows.length > 0) {
      return res.status(409).json({ message: "Email já cadastrado." });
    }

    const salt = await bcrypt.genSalt(10); // Gera um salt
    const hashedPassword = await bcrypt.hash(senha, salt); // Hashea a senha

    const insertQuery =
      "INSERT INTO usuario (name, email, senha, creation_date) VALUES ($1, $2, $3, NOW()) RETURNING id_usuario, name, email, creation_date, profile_photo_url"; // Retornando mais dados
    const insertResult: QueryResult = await db.query(insertQuery, [
      name,
      email,
      hashedPassword,
    ]);

    const insertedUser = insertResult.rows[0];

    return res.status(201).json({
      message: "Usuário cadastrado com sucesso!",
      user: {
        id_usuario: insertedUser.id_usuario,
        name: insertedUser.name,
        email: insertedUser.email,
        creationDate: insertedUser.creation_date,
        profilePhotoUrl: insertedUser.profile_photo_url,
      },
    });
  } catch (err) {
    console.error("Erro ao cadastrar usuário:", err);
    return res
      .status(500)
      .json({ message: "Erro ao cadastrar usuário", error: err });
  }
};

// Função para lidar com o login/cadastro via Google (melhorias)
export const handleGoogleLogin = async (req: Request, res: Response) => {
  const { name, email, profilePhotoUrl } = req.body; // Adicionando profilePhotoUrl do Google

  if (!email) {
    return res.status(400).json({ message: "Email é obrigatório." });
  }

  const db = await dbPromise;
  try {
    const userExistsResult: QueryResult = await db.query(
      "SELECT id_usuario, name, email, profile_photo_url, creation_date FROM usuario WHERE email = $1", // Selecionando mais campos
      [email]
    );

    if (userExistsResult.rows.length === 0) {
      const googlePlaceholderPassword = `google_user_${Date.now()}_${Math.random()
        .toString(36)
        .substring(2, 15)}`;
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(googlePlaceholderPassword, salt);

      const insertQuery =
        "INSERT INTO usuario (name, email, senha, profile_photo_url, creation_date) VALUES ($1, $2, $3, $4, NOW()) RETURNING id_usuario, name, email, profile_photo_url, creation_date";
      const insertResult: QueryResult = await db.query(insertQuery, [
        name,
        email,
        hashedPassword,
        profilePhotoUrl || "/path/to/default-avatar.png", // Usar a URL da foto do Google ou padrão
      ]);

      const insertedUser = insertResult.rows[0];
      return res.status(201).json({
        message: "Usuário Google registrado com sucesso!",
        user: {
          id_usuario: insertedUser.id_usuario,
          name: insertedUser.name,
          email: insertedUser.email,
          profilePhotoUrl: insertedUser.profile_photo_url,
          creationDate: insertedUser.creation_date,
        },
      });
    } else {
      const existingUser = userExistsResult.rows[0];
      // Opcional: Se o usuário já existe mas a foto do Google é nova, você pode atualizar aqui
      if (
        profilePhotoUrl &&
        existingUser.profile_photo_url !== profilePhotoUrl
      ) {
        await db.query(
          "UPDATE usuario SET profile_photo_url = $1 WHERE id_usuario = $2",
          [profilePhotoUrl, existingUser.id_usuario]
        );
        existingUser.profile_photo_url = profilePhotoUrl; // Atualiza o objeto para o retorno
      }

      return res.status(200).json({
        message: "Usuário Google encontrado",
        user: {
          id_usuario: existingUser.id_usuario,
          name: existingUser.name,
          email: existingUser.email,
          profilePhotoUrl: existingUser.profile_photo_url,
          creationDate: existingUser.creation_date,
        },
      });
    }
  } catch (err: any) {
    console.error("ERRO CRÍTICO no handleGoogleLogin:", err);
    return res.status(500).json({
      message: "Erro ao lidar com login do Google.",
      error: err.message || "Erro desconhecido",
    });
  }
};

// --- Funções Novas (ou significativamente alteradas) ---

// Função para buscar dados do usuário (AGORA RETORNA TUDO O NECESSÁRIO)
export const getUserData = async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email || typeof email !== "string") {
    return res
      .status(400)
      .json({ message: "Email é obrigatório e deve ser uma string." });
  }

  try {
    const db = await dbPromise;
    const query =
      "SELECT id_usuario, name, email, profile_photo_url, creation_date FROM usuario WHERE email = $1";
    const result: QueryResult = await db.query(query, [email]);
    const user = result.rows[0];

    if (user) {
      return res.status(200).json({
        id_usuario: user.id_usuario,
        name: user.name,
        email: user.email,
        profilePhotoUrl: user.profile_photo_url,
        creationDate: user.creation_date,
      });
    } else {
      return res.status(404).json({ message: "Usuário não encontrado." });
    }
  } catch (err) {
    console.error("Erro ao buscar dados do usuário:", err);
    return res
      .status(500)
      .json({ message: "Erro ao buscar dados do usuário.", error: err });
  }
};

// Função para atualizar a foto de perfil
export const updateProfilePhoto = async (req: Request, res: Response) => {
  const { email } = req.body;
  const file = req.file;

  if (!email || typeof email !== "string") {
    return res.status(400).json({ message: "Email do usuário é obrigatório." });
  }
  if (!file) {
    return res
      .status(400)
      .json({ message: "Nenhum arquivo de imagem fornecido." });
  }

  const db = await dbPromise;

  try {
    const oldPhotoQuery =
      "SELECT profile_photo_url FROM usuario WHERE email = $1";
    const oldPhotoResult: QueryResult = await db.query(oldPhotoQuery, [email]);
    const oldPhotoUrl = oldPhotoResult.rows[0]?.profile_photo_url;

    const fileExtension = path.extname(file.originalname);
    const fileName = `${email.replace(
      /[^a-zA-Z0-9]/g,
      "_"
    )}_${Date.now()}${fileExtension}`;
    const filePath = path.join(UPLOADS_DIR, fileName);

    try {
      await import("fs").then((fs) =>
        fs.promises.mkdir(UPLOADS_DIR, { recursive: true })
      );
    } catch (mkdirErr) {
      console.error("Erro ao criar diretório de uploads:", mkdirErr);
      return res.status(500).json({ message: "Erro interno no servidor." });
    }

    await writeFile(filePath, file.buffer);
    const newPhotoUrl = `/uploads/profile-photos/${fileName}`;

    const updateQuery =
      "UPDATE usuario SET profile_photo_url = $1 WHERE email = $2 RETURNING profile_photo_url";
    const updateResult: QueryResult = await db.query(updateQuery, [
      newPhotoUrl,
      email,
    ]);

    if (updateResult.rows.length === 0) {
      await unlink(filePath).catch((err) =>
        console.error("Erro ao deletar arquivo de foto não salvo:", err)
      );
      return res
        .status(404)
        .json({ message: "Usuário não encontrado para atualizar a foto." });
    }

    if (
      oldPhotoUrl &&
      !oldPhotoUrl.includes("/path/to/default-avatar.png") &&
      oldPhotoUrl.startsWith("/uploads/")
    ) {
      const oldPhotoPath = path.join(__dirname, "..", "..", oldPhotoUrl);
      await unlink(oldPhotoPath).catch((err) =>
        console.error("Erro ao deletar foto antiga:", err)
      );
    }

    return res
      .status(200)
      .json({ message: "Foto de perfil atualizada com sucesso!", newPhotoUrl });
  } catch (err) {
    console.error("Erro ao atualizar foto de perfil:", err);
    if (file) {
      const fileName = `${email.replace(
        /[^a-zA-Z0-9]/g,
        "_"
      )}_${Date.now()}${path.extname(file.originalname)}`;
      const filePath = path.join(UPLOADS_DIR, fileName);
      await unlink(filePath).catch((deleteErr) =>
        console.error("Erro ao deletar foto após falha:", deleteErr)
      );
    }
    return res
      .status(500)
      .json({ message: "Erro ao atualizar foto de perfil.", error: err });
  }
};

// Função para atualizar o email
export const updateEmail = async (req: Request, res: Response) => {
  const { oldEmail, newEmail } = req.body;

  if (
    !oldEmail ||
    typeof oldEmail !== "string" ||
    !newEmail ||
    typeof newEmail !== "string"
  ) {
    return res
      .status(400)
      .json({ message: "Email antigo e novo email são obrigatórios." });
  }
  if (oldEmail === newEmail) {
    return res
      .status(400)
      .json({ message: "O novo email não pode ser igual ao email atual." });
  }

  const db = await dbPromise;
  try {
    const checkNewEmailQuery =
      "SELECT id_usuario FROM usuario WHERE email = $1 AND email <> $2";
    const checkNewEmailResult: QueryResult = await db.query(
      checkNewEmailQuery,
      [newEmail, oldEmail]
    );
    if (checkNewEmailResult.rows.length > 0) {
      return res.status(409).json({ message: "O novo email já está em uso." });
    }

    const updateQuery =
      "UPDATE usuario SET email = $1 WHERE email = $2 RETURNING email";
    const updateResult: QueryResult = await db.query(updateQuery, [
      newEmail,
      oldEmail,
    ]);

    if (updateResult.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "Usuário não encontrado para atualizar o email." });
    }

    return res.status(200).json({
      message: "Email atualizado com sucesso!",
      newEmail: updateResult.rows[0].email,
    });
  } catch (err) {
    console.error("Erro ao atualizar email:", err);
    return res
      .status(500)
      .json({ message: "Erro ao atualizar email.", error: err });
  }
};

// Função para mudar a senha
export const changePassword = async (req: Request, res: Response) => {
  const { email, currentPassword, newPassword } = req.body;

  if (!email || typeof email !== "string" || !currentPassword || !newPassword) {
    return res
      .status(400)
      .json({ message: "Email, senha atual e nova senha são obrigatórios." });
  }
  if (newPassword.length < 6) {
    return res
      .status(400)
      .json({ message: "A nova senha deve ter pelo menos 6 caracteres." });
  }

  const db = await dbPromise;
  try {
    const userQuery = "SELECT senha FROM usuario WHERE email = $1";
    const userResult: QueryResult = await db.query(userQuery, [email]);
    const user = userResult.rows[0];

    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado." });
    }

    const isPasswordCorrect = await bcrypt.compare(currentPassword, user.senha);
    if (!isPasswordCorrect) {
      return res.status(401).json({ message: "Senha atual incorreta." });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedNewPassword = await bcrypt.hash(newPassword, salt);

    const updateQuery = "UPDATE usuario SET senha = $1 WHERE email = $2";
    await db.query(updateQuery, [hashedNewPassword, email]);

    return res.status(200).json({ message: "Senha alterada com sucesso!" });
  } catch (err) {
    console.error("Erro ao alterar senha:", err);
    return res
      .status(500)
      .json({ message: "Erro ao alterar senha.", error: err });
  }
};

// Função para deletar a conta
export const deleteAccount = async (req: Request, res: Response) => {
  const { email } = req.query; // Recebendo email via query param

  if (!email || typeof email !== "string") {
    return res.status(400).json({ message: "Email do usuário é obrigatório." });
  }

  const db = await dbPromise;
  try {
    const photoQuery = "SELECT profile_photo_url FROM usuario WHERE email = $1";
    const photoResult: QueryResult = await db.query(photoQuery, [email]);
    const userPhotoUrl = photoResult.rows[0]?.profile_photo_url;

    if (
      userPhotoUrl &&
      !userPhotoUrl.includes("/path/to/default-avatar.png") &&
      userPhotoUrl.startsWith("/uploads/")
    ) {
      const photoPath = path.join(__dirname, "..", "..", userPhotoUrl);
      await unlink(photoPath).catch((err) =>
        console.error("Erro ao deletar foto de perfil do usuário:", err)
      );
    }

    // Deletar o usuário
    const deleteUserQuery =
      "DELETE FROM usuario WHERE email = $1 RETURNING id_usuario";
    const deleteResult: QueryResult = await db.query(deleteUserQuery, [email]);

    if (deleteResult.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "Usuário não encontrado para deletar." });
    }

    return res.status(200).json({ message: "Conta deletada com sucesso!" });
  } catch (err) {
    console.error("Erro ao deletar conta:", err);
    return res
      .status(500)
      .json({ message: "Erro ao deletar conta.", error: err });
  }
};
