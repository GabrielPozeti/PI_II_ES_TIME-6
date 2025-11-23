/*
  Arquivo: src/index.ts
  Finalidade: Ponto de entrada do servidor Express. Configura middlewares,
  rotas (auth, instituicoes, disciplinas, turmas, componentes, notas, auditoria, alunos)
  e serve os arquivos estáticos em `public`.
*/
import express from "express";
import dotenv from "dotenv";
dotenv.config();

import path from "path";
import cors from "cors";
import session from "express-session";
import authRoutes from "./routes/auth";
import testeRouter from "./routes/test";
import { initSchema } from "./db";
import { verifyToken } from "./middleware/auth";

const app = express();
const FRONTEND = "http://127.0.0.1:5500";

app.use(cors({ origin: FRONTEND, credentials: true }));
app.options("*", cors({ origin: FRONTEND, credentials: true }));
app.use(express.json());

const SESSION_SECRET = process.env.SESSION_SECRET || "dev-session-secret";
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, secure: false, sameSite: "none", maxAge: 1000 * 60 * 60 * 24 * 7 },
  })
);

app.use("/", express.static(path.join(__dirname, "..", "public")));
app.use("/auth", authRoutes);
app.use(testeRouter);

app.get("/protected", verifyToken, (req, res) => {
  res.json({ message: "Acesso autorizado ao recurso protegido" });
});

const port = Number(process.env.PORT) || 3000;

initSchema()
  .then(() => {
    console.log("Banco inicializado com sucesso!");
    app.listen(port, () => console.log(`Server listening on http://localhost:${port}`));
  })
  .catch((err) => {
    console.error("❌ Erro ao iniciar servidor:", err);
  });