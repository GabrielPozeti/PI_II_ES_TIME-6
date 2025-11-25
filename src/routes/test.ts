//Feito por Ana Beatriz da Silva

/*
  Arquivo: src/routes/test.ts
  Finalidade: Testar conexão com PostgreSQL e endpoints do auth.
*/

import { Router } from "express";
import { db } from "../db";

const router = Router();

router.get("/teste-db", async (req, res) => {
  try {
    const database = await db();
    const result = await database.get("SELECT version();");
    res.json({ message: "Conexão com Postgres OK", version: result.version });
  } catch (err) {
    res.status(500).json({ message: "Erro ao conectar ao banco", error: err });
  }
});

router.get("/teste-docentes", async (req, res) => {
  try {
    const database = await db();
    const count = await database.get("SELECT COUNT(*) FROM docentes;");
    res.json({ message: "Tabela docentes OK", total: count.count });
  } catch (err) {
    res.status(500).json({ message: "Erro ao acessar tabela docentes", error: err });
  }
});

router.post("/teste-docente", async (req, res) => {
  try {
    const database = await db();
    const { nome, email, senha } = req.body;

    if (!nome || !email || !senha) {
      return res.status(400).json({ message: "Campos incompletos" });
    }

    const result = await database.run(
      "INSERT INTO docentes (nome,email,senha_hash) VALUES ($1,$2,$3) RETURNING id;",
      [nome, email, senha]
    );

    const inserted = await database.get("SELECT * FROM docentes WHERE id = $1", [result.lastID]);

    res.json({ message: "Docente de teste criado", docente: inserted });
  } catch (err) {
    res.status(500).json({ message: "Erro ao criar docente de teste", error: err });
  }
});

export default router;
