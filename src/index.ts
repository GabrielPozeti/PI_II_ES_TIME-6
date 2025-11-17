import express from "express";
import dotenv from "dotenv";
import path from "path";
import cors from "cors";
import authRoutes from "./routes/auth";
import { verifyToken } from "./middleware/auth";
import session from "express-session";
import instituicoesRoutes from "./routes/instituicoes";
import disciplinasRoutes from "./routes/disciplinas";
import turmasRoutes from "./routes/turmas";
import componentesRoutes from "./routes/componentes";
import notasRoutes from "./routes/notas";
import auditoriaRoutes from "./routes/auditoria";
import alunosRoutes from "./routes/alunos";

dotenv.config();

const app = express();
const FRONTEND = "http://127.0.0.1:5500";

app.use(
  cors({
    origin: FRONTEND,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  })
);

app.options(
  "*",
  cors({
    origin: FRONTEND,
    credentials: true,
  })
);

app.use(express.json());

const SESSION_SECRET = process.env.SESSION_SECRET || "dev-session-secret";

app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,

    cookie: {
      httpOnly: true,
      secure: false,
      sameSite: "none",
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  })
);

// Redireciona a raiz para a página de login
app.get("/", (req, res) => {
  res.redirect("/login.html");
});

app.use("/", express.static(path.join(__dirname, "..", "public")));

app.use("/auth", authRoutes);

app.use("/instituicoes", verifyToken, instituicoesRoutes);
app.use("/disciplinas", verifyToken, disciplinasRoutes);
app.use("/turmas", verifyToken, turmasRoutes);
app.use("/componentes", verifyToken, componentesRoutes);
app.use("/notas", verifyToken, notasRoutes);
app.use("/auditoria", verifyToken, auditoriaRoutes);
app.use("/alunos", verifyToken, alunosRoutes);

app.get("/protected", verifyToken, (req, res) => {
  res.json({ message: "Acesso autorizado ao recurso protegido" });
});

const port = process.env.PORT ? Number(process.env.PORT) : 3000;
app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
