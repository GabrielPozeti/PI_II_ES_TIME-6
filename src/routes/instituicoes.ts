/*
  Arquivo: src/routes/instituicoes.ts
  Finalidade: Rotas CRUD para instituições (listar, criar, atualizar, excluir).
  Observações: Valida relações com disciplinas ao excluir.
*/
import express from "express";
import { db } from "../db";

const router = express.Router();

router.get("/", async (req, res) => {
  const database = await db();
  const rows = await database.all("SELECT * FROM instituicoes ORDER BY id");
  res.json(rows);
});

router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const database = await db();
  const row = await database.get("SELECT * FROM instituicoes WHERE id = $1", [
    id,
  ]);
  if (!row)
    return res.status(404).json({ message: "Instituição não encontrada" });
  res.json(row);
});

router.post("/", async (req, res) => {
  const { nome, sigla } = req.body;
  if (!nome) return res.status(400).json({ message: "Nome é obrigatório" });
  const database = await db();
  const now = new Date().toISOString();
  const result = await database.run(
    "INSERT INTO instituicoes (nome, sigla, criado_em, atualizado_em) VALUES ($1, $2, $3, $4)",
    [nome, sigla || null, now, now]
  );
  const id = result.lastID as number;
  const row = await database.get("SELECT * FROM instituicoes WHERE id = $1", [
    id,
  ]);
  res.status(201).json(row);
});

router.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { nome, sigla } = req.body;
  const database = await db();
  const existing = await database.get(
    "SELECT * FROM instituicoes WHERE id = $1",
    [id]
  );
  if (!existing)
    return res.status(404).json({ message: "Instituição não encontrada" });
  const atualizado_em = new Date().toISOString();
  await database.run(
    "UPDATE instituicoes SET nome = $1, sigla = $2, atualizado_em = $3 WHERE id = $4",
    [
      nome || (existing as any).nome,
      sigla || (existing as any).sigla,
      atualizado_em,
      id,
    ]
  );
  const row = await database.get("SELECT * FROM instituicoes WHERE id = $1", [
    id,
  ]);
  res.json(row);
});

router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const database = await db();
  const disciplinas = await database.get(
    "SELECT COUNT(1) as cnt FROM disciplinas WHERE instituicao_id = $1",
    [id]
  );
  if (disciplinas && ((disciplinas as any).cnt as number) > 0)
    return res
      .status(400)
      .json({ message: "Existem disciplinas vinculadas. Exclua-as primeiro." });
  await database.run("DELETE FROM instituicoes WHERE id = $1", [id]);
  res.json({ message: "Instituição excluída" });
});

export default router;
