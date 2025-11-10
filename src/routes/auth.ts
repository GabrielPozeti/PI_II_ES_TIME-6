import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { findByEmail, createDocente, findById, updateDocente } from '../db';
import fs from 'fs';
import path from 'path';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

router.post('/register', async (req, res) => {
  const { nome, email, telefone, senha } = req.body;
  if (!nome || !email || !senha) return res.status(400).json({ message: 'Campos incompletos' });

  const existing = await findByEmail(email);
  if (existing) return res.status(409).json({ message: 'E-mail já cadastrado' });

  const senha_hash = bcrypt.hashSync(senha, 10);
  const user = await createDocente({ nome, email, telefone: telefone || null, senha_hash });
  return res.status(201).json({ message: 'Registrado', user: { id: user.id, nome: user.nome, email: user.email, telefone: user.telefone } });
});

router.post('/login', async (req, res) => {
  const { email, senha } = req.body;
  if (!email || !senha) return res.status(400).json({ message: 'Campos incompletos' });

  const row = await findByEmail(email);
  if (!row) return res.status(401).json({ message: 'Credenciais inválidas' });

  const match = bcrypt.compareSync(senha, row.senha_hash);
  if (!match) return res.status(401).json({ message: 'Credenciais inválidas' });

  const token = jwt.sign({ userId: row.id }, JWT_SECRET, { expiresIn: '1h' });
  return res.json({ token, user: { id: row.id, nome: row.nome, email: row.email, telefone: row.telefone } });
});

router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email é obrigatório' });

  const row = await findByEmail(email);
  if (!row) {
    return res.json({ message: 'Se o e-mail existir, você receberá instruções' });
  }
  const token = jwt.sign({ userId: row.id }, JWT_SECRET, { expiresIn: '15m' });
  const resetLink = `http://localhost:3000/reset-password.html?token=${token}`;

  const out = `To: ${email}\nSubject: Recuperação de senha\nLink: ${resetLink}\n\n`;
  const dataDir = path.resolve(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  fs.appendFileSync(path.join(dataDir, 'mock_emails.txt'), out);
  console.log('Mock email sent:\n', out);

  return res.json({ message: 'Se o e-mail existir, você receberá instruções' });
});

router.post('/reset-password', async (req, res) => {
  const { token, senha } = req.body;
  if (!token || !senha) return res.status(400).json({ message: 'Token e nova senha são obrigatórios' });
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    const userId = payload.userId;
    const user = await findById(userId);
    if (!user) return res.status(400).json({ message: 'Usuário inválido' });
    const senha_hash = bcrypt.hashSync(senha, 10);
    await updateDocente(userId, { senha_hash });
    return res.json({ message: 'Senha atualizada' });
  } catch (err) {
    return res.status(400).json({ message: 'Token inválido ou expirado' });
  }
});

export default router;
