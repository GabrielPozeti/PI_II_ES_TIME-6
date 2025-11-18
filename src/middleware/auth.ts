/*
  Arquivo: src/middleware/auth.ts
  Finalidade: Middleware de autenticação para rotas protegidas. Verifica sessão
  e adiciona `userId` ao objeto `req` quando autenticado.
*/
import { Request, Response, NextFunction } from "express";

export interface AuthRequest extends Request {
  userId?: number;
}

export function verifyToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const session = (req as any).session;
  console.log("session: ", session);

  if (!session || !session.userId) {
    return res.status(401).json({ message: "Não autenticado" });
  }
  req.userId = session.userId;
  return next();
}
