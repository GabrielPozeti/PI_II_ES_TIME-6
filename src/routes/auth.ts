/*
  Arquivo: src/routes/auth.ts
  Finalidade: Rotas de autenticação e gerenciamento de conta (registro, login,
  recuperação de senha, logout e informações do usuário).
  Observações: Usa utilitários de `db` e `utils/email` e opera sobre tokens de reset.
*/
import express from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import {
  findByEmail,
  createDocente,
  findById,
  updateDocente,
  findInstituicaoByNome,
  createInstituicao,
} from "../db";
import fs from "fs";
import path from "path";
import { sendEmail } from "../utils/email";

const router = express.Router();

router.post("/register", async (req, res) => {
  const { nome, email, telefone, senha } = req.body;
  if (!nome || !email || !senha)
    return res.status(400).json({ message: "Campos incompletos" });

  const existing = await findByEmail(email);
  if (existing)
    return res.status(409).json({ message: "E-mail já cadastrado" });

  const senha_hash = bcrypt.hashSync(senha, 10);
  const user = await createDocente({
    nome,
    email,
    telefone: telefone || null,
    senha_hash,
  });
  return res.status(201).json({
    message: "Registrado",
    user: {
      id: user.id,
      nome: user.nome,
      email: user.email,
      telefone: user.telefone,
    },
  });
});

router.post("/login", async (req, res) => {
  const { email, senha } = req.body;
  if (!email || !senha)
    return res.status(400).json({ message: "Campos incompletos" });

  const row = await findByEmail(email);
  if (!row) return res.status(401).json({ message: "Credenciais inválidas" });

  const match = bcrypt.compareSync(senha, row.senha_hash);
  if (!match) return res.status(401).json({ message: "Credenciais inválidas" });

  return res.json({
    message: "Logado",
    user: {
      id: row.id,
      nome: row.nome,
      email: row.email,
      telefone: row.telefone,
      curso: row.curso,
      id_instituicao: row.id_instituicao,
    },
  });
});

router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email é obrigatório" });

  const row = await findByEmail(email);

  if (!row) {
    return res.json({
      message: "Se o e-mail existir, você receberá instruções",
    });
  }
  const token = crypto.randomBytes(24).toString("hex");
  const expires = Date.now() + 15 * 60 * 1000; // 15 minutes
  const dataDir = path.resolve(__dirname, "..", "..", "data");
  const tokensFile = path.join(dataDir, "reset_tokens.json");
  let tokens: Record<string, { userId: number; expires: number }> = {};
  if (fs.existsSync(tokensFile)) {
    try {
      tokens = JSON.parse(fs.readFileSync(tokensFile, "utf-8") || "{}");
    } catch (e) {
      tokens = {};
    }
  }
  tokens[token] = { userId: row.id, expires };
  fs.writeFileSync(tokensFile, JSON.stringify(tokens, null, 2));
  const resetLink = `http://localhost:3000/reset-password.html?token=${token}`;

  const out = `To: ${email}\nSubject: Recuperação de senha\nLink: ${resetLink}\n\n`;
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  fs.appendFileSync(path.join(dataDir, "mock_emails.txt"), out);
  console.log("Mock email sent:\n", out);

  await sendEmail(email, row.nome, resetLink);
  return res.json({ message: "Se o e-mail existir, você receberá instruções" });
});

router.post("/reset-password", async (req, res) => {
  const { token, senha } = req.body;
  if (!token || !senha)
    return res
      .status(400)
      .json({ message: "Token e nova senha são obrigatórios" });
  try {
    const dataDir = path.resolve(__dirname, "..", "..", "data");
    const tokensFile = path.join(dataDir, "reset_tokens.json");
    if (!fs.existsSync(tokensFile))
      return res.status(400).json({ message: "Token inválido ou expirado" });
    let tokens: Record<string, { userId: number; expires: number }> = {};
    try {
      tokens = JSON.parse(fs.readFileSync(tokensFile, "utf-8") || "{}");
    } catch (e) {
      tokens = {};
    }
    const record = tokens[token];
    if (!record || record.expires < Date.now())
      return res.status(400).json({ message: "Token inválido ou expirado" });
    const userId = record.userId;
    const user = await findById(userId);
    if (!user) return res.status(400).json({ message: "Usuário inválido" });
    const senha_hash = bcrypt.hashSync(senha, 10);
    await updateDocente(userId, { senha_hash });
    // remove token
    delete tokens[token];
    fs.writeFileSync(tokensFile, JSON.stringify(tokens, null, 2));
    return res.json({ message: "Senha atualizada" });
  } catch (err) {
    return res.status(400).json({ message: "Erro ao processar solicitação" });
  }
});

router.post("/logout", (req, res) => {
  const s = (req as any).session;
  console.log("s:", s);

  if (s) {
    s.destroy?.((e: any) => {
      console.log(e);
    });
  }
  return res.json({ message: "Desconectado" });
});

router.post("/me", async (req, res) => {
  console.log("body:", req.body);

  const { userId } = req.body;

  if (!userId)
    return res.status(400).json({ message: "ID do usuário é obrigatório" });
  const user = await findById(userId);
  if (!user) return res.status(404).json({ message: "Usuário não encontrado" });
  return res.json({
    user: {
      id: user.id,
      nome: user.nome,
      email: user.email,
      telefone: user.telefone,
      curso: user.curso,
      id_instituicao: user.id_instituicao,
    },
  });
});

router.put("/info-adicional", async (req, res) => {
  console.log("body:", req.body);

  const { instituicao, curso, id } = req.body;

  if (instituicao === undefined || curso === undefined || id === undefined)
    return res.status(400).json({ message: "Campos incompletos" });

  try {
    let instituicaoId = null;
    const instituicaoDB = await findInstituicaoByNome(instituicao);
    if (!instituicaoDB) {
      //sigla = as 3 primeiras letras do nome em maiusculo
      const sigla: string = instituicao.slice(0, 3).toUpperCase();

      const createInstituicaoDB = await createInstituicao({
        nome: instituicao,
        sigla,
      });
      instituicaoId = createInstituicaoDB.id;
    }

    const updatedUser = await updateDocente(id, {
      id_instituicao: instituicaoId,
      curso,
    });
    if (!updatedUser)
      return res.status(404).json({ message: "Usuário não encontrado" });
    return res.json({
      message: "Informações adicionais atualizadas",
      user: {
        id: updatedUser.id,
        nome: updatedUser.nome,
        email: updatedUser.email,
        telefone: updatedUser.telefone,
        curso: updatedUser.curso,
        id_instituicao: updatedUser.id_instituicao,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Erro ao atualizar informações" });
  }
});

export default router;
