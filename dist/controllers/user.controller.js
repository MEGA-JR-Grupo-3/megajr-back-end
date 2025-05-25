// src/db/connection.ts
import { Pool } from "pg";
import dotenv from "dotenv";
dotenv.config();
async function createDatabaseConnectionPool() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("Vari\xE1vel de ambiente DATABASE_URL n\xE3o est\xE1 definida!");
    process.exit(1);
  }
  const pool = new Pool({
    connectionString: databaseUrl,
    max: 10,
    idleTimeoutMillis: 3e4,
    connectionTimeoutMillis: 2e3
  });
  try {
    await pool.query("SELECT 1");
    console.log("Pool de conex\xE3o PostgreSQL criado e conectado com sucesso!");
  } catch (error) {
    console.error(
      "Erro ao conectar ao banco de dados PostgreSQL usando o pool:",
      error
    );
    process.exit(1);
  }
  return pool;
}
var dbPromise = createDatabaseConnectionPool();

// src/controllers/user.controller.ts
import bcrypt from "bcryptjs";
import { unlink, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var UPLOADS_DIR = path.join(
  __dirname,
  "..",
  "..",
  "uploads",
  "profile-photos"
);
var getUsers = async (_, res) => {
  const db = await dbPromise;
  const q = "SELECT * FROM usuario";
  try {
    const result = await db.query(q);
    const data = result.rows;
    return res.status(200).json(data);
  } catch (err) {
    console.error("Erro ao buscar usu\xE1rios:", err);
    return res.status(500).json({ message: "Erro ao buscar usu\xE1rios", error: err });
  }
};
var checkUserExists = async (req, res) => {
  const { email } = req.query;
  if (!email || typeof email !== "string") {
    return res.status(400).json({ message: "Email \xE9 obrigat\xF3rio e deve ser uma string." });
  }
  const db = await dbPromise;
  const q = "SELECT * FROM usuario WHERE email = $1";
  try {
    const result = await db.query(q, [email]);
    const data = result.rows;
    if (data.length > 0) {
      return res.status(200).json({ exists: true, message: "Usu\xE1rio j\xE1 existe" });
    } else {
      return res.status(200).json({ exists: false, message: "Usu\xE1rio n\xE3o encontrado" });
    }
  } catch (err) {
    console.error("Erro ao verificar usu\xE1rio:", err);
    return res.status(500).json({ message: "Erro ao verificar usu\xE1rio", error: err });
  }
};
var createUser = async (req, res) => {
  const { name, email, senha } = req.body;
  if (!name || !email || !senha) {
    return res.status(400).json({ message: "Nome, email e senha s\xE3o obrigat\xF3rios." });
  }
  const db = await dbPromise;
  const checkEmailQuery = "SELECT * FROM usuario WHERE email = $1";
  try {
    const userExistsResult = await db.query(checkEmailQuery, [
      email
    ]);
    if (userExistsResult.rows.length > 0) {
      return res.status(409).json({ message: "Email j\xE1 cadastrado." });
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(senha, salt);
    const insertQuery = "INSERT INTO usuario (name, email, senha, creation_date) VALUES ($1, $2, $3, NOW()) RETURNING id_usuario, name, email, creation_date, profile_photo_url";
    const insertResult = await db.query(insertQuery, [
      name,
      email,
      hashedPassword
    ]);
    const insertedUser = insertResult.rows[0];
    return res.status(201).json({
      message: "Usu\xE1rio cadastrado com sucesso!",
      user: {
        id_usuario: insertedUser.id_usuario,
        name: insertedUser.name,
        email: insertedUser.email,
        creationDate: insertedUser.creation_date,
        profilePhotoUrl: insertedUser.profile_photo_url
      }
    });
  } catch (err) {
    console.error("Erro ao cadastrar usu\xE1rio:", err);
    return res.status(500).json({ message: "Erro ao cadastrar usu\xE1rio", error: err });
  }
};
var handleGoogleLogin = async (req, res) => {
  const { name, email, profilePhotoUrl } = req.body;
  if (!email) {
    return res.status(400).json({ message: "Email \xE9 obrigat\xF3rio." });
  }
  const db = await dbPromise;
  try {
    const userExistsResult = await db.query(
      "SELECT id_usuario, name, email, profile_photo_url, creation_date FROM usuario WHERE email = $1",
      // Selecionando mais campos
      [email]
    );
    if (userExistsResult.rows.length === 0) {
      const googlePlaceholderPassword = `google_user_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(googlePlaceholderPassword, salt);
      const insertQuery = "INSERT INTO usuario (name, email, senha, profile_photo_url, creation_date) VALUES ($1, $2, $3, $4, NOW()) RETURNING id_usuario, name, email, profile_photo_url, creation_date";
      const insertResult = await db.query(insertQuery, [
        name,
        email,
        hashedPassword,
        profilePhotoUrl || "/path/to/default-avatar.png"
        // Usar a URL da foto do Google ou padrão
      ]);
      const insertedUser = insertResult.rows[0];
      return res.status(201).json({
        message: "Usu\xE1rio Google registrado com sucesso!",
        user: {
          id_usuario: insertedUser.id_usuario,
          name: insertedUser.name,
          email: insertedUser.email,
          profilePhotoUrl: insertedUser.profile_photo_url,
          creationDate: insertedUser.creation_date
        }
      });
    } else {
      const existingUser = userExistsResult.rows[0];
      if (profilePhotoUrl && existingUser.profile_photo_url !== profilePhotoUrl) {
        await db.query(
          "UPDATE usuario SET profile_photo_url = $1 WHERE id_usuario = $2",
          [profilePhotoUrl, existingUser.id_usuario]
        );
        existingUser.profile_photo_url = profilePhotoUrl;
      }
      return res.status(200).json({
        message: "Usu\xE1rio Google encontrado",
        user: {
          id_usuario: existingUser.id_usuario,
          name: existingUser.name,
          email: existingUser.email,
          profilePhotoUrl: existingUser.profile_photo_url,
          creationDate: existingUser.creation_date
        }
      });
    }
  } catch (err) {
    console.error("ERRO CR\xCDTICO no handleGoogleLogin:", err);
    return res.status(500).json({
      message: "Erro ao lidar com login do Google.",
      error: err.message || "Erro desconhecido"
    });
  }
};
var getUserData = async (req, res) => {
  const { email } = req.body;
  if (!email || typeof email !== "string") {
    return res.status(400).json({ message: "Email \xE9 obrigat\xF3rio e deve ser uma string." });
  }
  try {
    const db = await dbPromise;
    const query = "SELECT id_usuario, name, email, profile_photo_url, creation_date FROM usuario WHERE email = $1";
    const result = await db.query(query, [email]);
    const user = result.rows[0];
    if (user) {
      return res.status(200).json({
        id_usuario: user.id_usuario,
        name: user.name,
        email: user.email,
        profilePhotoUrl: user.profile_photo_url,
        creationDate: user.creation_date
      });
    } else {
      return res.status(404).json({ message: "Usu\xE1rio n\xE3o encontrado." });
    }
  } catch (err) {
    console.error("Erro ao buscar dados do usu\xE1rio:", err);
    return res.status(500).json({ message: "Erro ao buscar dados do usu\xE1rio.", error: err });
  }
};
var updateProfilePhoto = async (req, res) => {
  const { email } = req.body;
  const file = req.file;
  if (!email || typeof email !== "string") {
    return res.status(400).json({ message: "Email do usu\xE1rio \xE9 obrigat\xF3rio." });
  }
  if (!file) {
    return res.status(400).json({ message: "Nenhum arquivo de imagem fornecido." });
  }
  const db = await dbPromise;
  try {
    const oldPhotoQuery = "SELECT profile_photo_url FROM usuario WHERE email = $1";
    const oldPhotoResult = await db.query(oldPhotoQuery, [email]);
    const oldPhotoUrl = oldPhotoResult.rows[0]?.profile_photo_url;
    const fileExtension = path.extname(file.originalname);
    const fileName = `${email.replace(
      /[^a-zA-Z0-9]/g,
      "_"
    )}_${Date.now()}${fileExtension}`;
    const filePath = path.join(UPLOADS_DIR, fileName);
    try {
      await import("fs").then(
        (fs) => fs.promises.mkdir(UPLOADS_DIR, { recursive: true })
      );
    } catch (mkdirErr) {
      console.error("Erro ao criar diret\xF3rio de uploads:", mkdirErr);
      return res.status(500).json({ message: "Erro interno no servidor." });
    }
    await writeFile(filePath, file.buffer);
    const newPhotoUrl = `/uploads/profile-photos/${fileName}`;
    const updateQuery = "UPDATE usuario SET profile_photo_url = $1 WHERE email = $2 RETURNING profile_photo_url";
    const updateResult = await db.query(updateQuery, [
      newPhotoUrl,
      email
    ]);
    if (updateResult.rows.length === 0) {
      await unlink(filePath).catch(
        (err) => console.error("Erro ao deletar arquivo de foto n\xE3o salvo:", err)
      );
      return res.status(404).json({ message: "Usu\xE1rio n\xE3o encontrado para atualizar a foto." });
    }
    if (oldPhotoUrl && !oldPhotoUrl.includes("/path/to/default-avatar.png") && oldPhotoUrl.startsWith("/uploads/")) {
      const oldPhotoPath = path.join(__dirname, "..", "..", oldPhotoUrl);
      await unlink(oldPhotoPath).catch(
        (err) => console.error("Erro ao deletar foto antiga:", err)
      );
    }
    return res.status(200).json({ message: "Foto de perfil atualizada com sucesso!", newPhotoUrl });
  } catch (err) {
    console.error("Erro ao atualizar foto de perfil:", err);
    if (file) {
      const fileName = `${email.replace(
        /[^a-zA-Z0-9]/g,
        "_"
      )}_${Date.now()}${path.extname(file.originalname)}`;
      const filePath = path.join(UPLOADS_DIR, fileName);
      await unlink(filePath).catch(
        (deleteErr) => console.error("Erro ao deletar foto ap\xF3s falha:", deleteErr)
      );
    }
    return res.status(500).json({ message: "Erro ao atualizar foto de perfil.", error: err });
  }
};
var updateEmail = async (req, res) => {
  const { oldEmail, newEmail } = req.body;
  if (!oldEmail || typeof oldEmail !== "string" || !newEmail || typeof newEmail !== "string") {
    return res.status(400).json({ message: "Email antigo e novo email s\xE3o obrigat\xF3rios." });
  }
  if (oldEmail === newEmail) {
    return res.status(400).json({ message: "O novo email n\xE3o pode ser igual ao email atual." });
  }
  const db = await dbPromise;
  try {
    const checkNewEmailQuery = "SELECT id_usuario FROM usuario WHERE email = $1 AND email <> $2";
    const checkNewEmailResult = await db.query(
      checkNewEmailQuery,
      [newEmail, oldEmail]
    );
    if (checkNewEmailResult.rows.length > 0) {
      return res.status(409).json({ message: "O novo email j\xE1 est\xE1 em uso." });
    }
    const updateQuery = "UPDATE usuario SET email = $1 WHERE email = $2 RETURNING email";
    const updateResult = await db.query(updateQuery, [
      newEmail,
      oldEmail
    ]);
    if (updateResult.rows.length === 0) {
      return res.status(404).json({ message: "Usu\xE1rio n\xE3o encontrado para atualizar o email." });
    }
    return res.status(200).json({
      message: "Email atualizado com sucesso!",
      newEmail: updateResult.rows[0].email
    });
  } catch (err) {
    console.error("Erro ao atualizar email:", err);
    return res.status(500).json({ message: "Erro ao atualizar email.", error: err });
  }
};
var changePassword = async (req, res) => {
  const { email, currentPassword, newPassword } = req.body;
  if (!email || typeof email !== "string" || !currentPassword || !newPassword) {
    return res.status(400).json({ message: "Email, senha atual e nova senha s\xE3o obrigat\xF3rios." });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ message: "A nova senha deve ter pelo menos 6 caracteres." });
  }
  const db = await dbPromise;
  try {
    const userQuery = "SELECT senha FROM usuario WHERE email = $1";
    const userResult = await db.query(userQuery, [email]);
    const user = userResult.rows[0];
    if (!user) {
      return res.status(404).json({ message: "Usu\xE1rio n\xE3o encontrado." });
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
    return res.status(500).json({ message: "Erro ao alterar senha.", error: err });
  }
};
var deleteAccount = async (req, res) => {
  const { email } = req.query;
  if (!email || typeof email !== "string") {
    return res.status(400).json({ message: "Email do usu\xE1rio \xE9 obrigat\xF3rio." });
  }
  const db = await dbPromise;
  try {
    const photoQuery = "SELECT profile_photo_url FROM usuario WHERE email = $1";
    const photoResult = await db.query(photoQuery, [email]);
    const userPhotoUrl = photoResult.rows[0]?.profile_photo_url;
    if (userPhotoUrl && !userPhotoUrl.includes("/path/to/default-avatar.png") && userPhotoUrl.startsWith("/uploads/")) {
      const photoPath = path.join(__dirname, "..", "..", userPhotoUrl);
      await unlink(photoPath).catch(
        (err) => console.error("Erro ao deletar foto de perfil do usu\xE1rio:", err)
      );
    }
    const deleteUserQuery = "DELETE FROM usuario WHERE email = $1 RETURNING id_usuario";
    const deleteResult = await db.query(deleteUserQuery, [email]);
    if (deleteResult.rows.length === 0) {
      return res.status(404).json({ message: "Usu\xE1rio n\xE3o encontrado para deletar." });
    }
    return res.status(200).json({ message: "Conta deletada com sucesso!" });
  } catch (err) {
    console.error("Erro ao deletar conta:", err);
    return res.status(500).json({ message: "Erro ao deletar conta.", error: err });
  }
};
export {
  changePassword,
  checkUserExists,
  createUser,
  deleteAccount,
  getUserData,
  getUsers,
  handleGoogleLogin,
  updateEmail,
  updateProfilePhoto
};
