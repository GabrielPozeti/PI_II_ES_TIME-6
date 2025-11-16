import { Request, Response, NextFunction } from 'express';

export interface AuthRequest extends Request {
  userId?: number;
}

export function verifyToken(req: AuthRequest, res: Response, next: NextFunction) {
  const session = (req as any).session;
  if (!session || !session.userId) {
    return res.status(401).json({ message: 'Não autenticado' });
  }
  req.userId = session.userId;
  return next();
}
