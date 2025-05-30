// src/middlewares/auth.middleware.ts
import { Request, Response, NextFunction } from "express";
import { admin } from "../firebaseAdminConfig.js";

export interface AuthRequest extends Request {
  userId?: string;
  userEmail?: string;
}

export const authenticateFirebaseToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (token == null) {
    return res
      .status(401)
      .json({ message: "Acesso negado: Token não fornecido." });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);

    req.userId = decodedToken.uid;
    req.userEmail = decodedToken.email;

    next();
  } catch (error) {
    console.error("Erro na verificação do Firebase ID Token:", error);
    return res
      .status(403)
      .json({ message: "Token de autenticação inválido ou expirado." });
  }
};
