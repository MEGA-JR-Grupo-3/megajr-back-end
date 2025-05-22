import { Request, Response } from "express"; // import do express
import prisma from '../db/connection'; // import do prisma cliente
import bcrypt from 'bcrypt'; // import para criptografar as senhas

export class UserController {
  // Busca todos os usuários (GET /users)
  static async getUsers(_: Request, res: Response) {
    try {
      const users = await prisma.usuario.findMany({
        select: {
          id_usuario: true,
          nome: true,
          email: true,
          // Não retornamos a senha por segurança
        }
      });
      return res.status(200).json(users);
    } catch (err) {
      console.error("Erro ao buscar usuários:", err);
      return res.status(500).json({
        message: "Erro ao buscar usuários",
        error: err instanceof Error ? err.message : "Erro desconhecido"
      });
    }
  }

  // Verifica se usuário existe (GET /users/check?email=...)
  static async checkUserExists(req: Request, res: Response) {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ message: "Email é obrigatório" });
    }

    try {
      const user = await prisma.usuario.findUnique({
        where: { email: email.toString() }
      });

      return res.status(200).json({
        exists: !!user,
        message: user ? "Usuário já existe" : "Usuário não encontrado"
      });
    } catch (err) {
      console.error("Erro ao verificar usuário:", err);
      return res.status(500).json({
        message: "Erro ao verificar usuário",
        error: err instanceof Error ? err.message : "Erro desconhecido"
      });
    }
  }

  // Cria novo usuário (POST /users)
  static async createUser(req: Request, res: Response) {
    const { nome, email, senha } = req.body;

    if (!nome || !email || !senha) {
      return res.status(400).json({ message: "Todos os campos são obrigatórios" });
    }

    try {
      // Verifica se email já existe
      const userExists = await prisma.usuario.findUnique({
        where: { email }
      });

      if (userExists) {
        return res.status(409).json({ message: "Email já cadastrado" });
      }

      // Cria o usuário
      const newUser = await prisma.usuario.create({
        data: {
          nome,
          email,
          senha: await hashPassword(senha) // Função ao final do código
        },
        select: {
          id_usuario: true,
          nome: true,
          email: true
          // Não retornamos a senha
        }
      });

      return res.status(201).json({
        message: "Usuário cadastrado com sucesso!",
        user: newUser
      });
    } catch (err) {
      console.error("Erro ao cadastrar usuário:", err);
      return res.status(500).json({
        message: "Erro ao cadastrar usuário",
        error: err instanceof Error ? err.message : "Erro desconhecido"
      });
    }
  }

  // Login/Cadastro com Google (POST /users/google)
  static async handleGoogleLogin(req: Request, res: Response) {
    const { nome, email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email é obrigatório" });
    }

    try {
      // Verifica se usuário existe
      let user = await prisma.usuario.findUnique({
        where: { email }
      });

      if (!user) {
        // Cria novo usuário para login Google
        user = await prisma.usuario.create({
          data: {
            nome,
            email,
            senha: "google-auth",
            foto_perfil: null
          },
          select: {
            id_usuario: true,
            nome: true,
            email: true
          }
        });
        return res.status(201).json({
          message: "Usuário Google registrado com sucesso!",
          user
        });
      }

      return res.status(200).json({
        message: "Usuário Google encontrado",
        user: {
          id_usuario: user.id_usuario,
          nome: user.nome,
          email: user.email
        }
      });
    } catch (err) {
      console.error("Erro no login Google:", err);
      return res.status(500).json({
        message: "Erro ao lidar com login do Google",
        error: err instanceof Error ? err.message : "Erro desconhecido"
      });
    }
  }

  // Busca dados do usuário (POST /users/data)
  static async getUserData(req: Request, res: Response) {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email é obrigatório" });
    }

    try {
      const user = await prisma.usuario.findUnique({
        where: { email },
        select: {
          id_usuario: true,
          nome: true,
          email: true
        }
      });

      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      return res.status(200).json(user);
    } catch (err) {
      console.error("Erro ao buscar dados do usuário:", err);
      return res.status(500).json({
        message: "Erro ao buscar dados do usuário",
        error: err instanceof Error ? err.message : "Erro desconhecido"
      });
    }
  }
}

// Função auxiliar para hash de senha
async function hashPassword(password: string): Promise<string> {
  // Exemplo com bcrypt (importar bcrypt no topo)
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);
  return hashedPassword;
}