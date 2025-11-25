/*
  Arquivo: src/routes/disciplinas.ts
  Finalidade: Rotas CRUD para disciplinas e validação da fórmula usada para cálculo de nota.
  Observações: Verifica integridade com `instituicoes` e assegura que componentes tenham siglas quando fórmula é salva.
*/
import express from "express";
import { getDb } from "../db";

const router = express.Router();

router.get("/", async (req, res) => {
  const db = await getDb();
  const rows = await db.all(
    "SELECT d.*, i.nome as instituicao_nome FROM disciplinas d JOIN instituicoes i ON d.instituicao_id = i.id ORDER BY d.id"
  );
  res.json(rows);
});

router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const db = await getDb();
  const row = await db.get("SELECT * FROM disciplinas WHERE id = $1", [id]);
  if (!row)
    return res.status(404).json({ message: "Disciplina não encontrada" });
  res.json(row);
});

router.post("/", async (req, res) => {
  const { nome, codigo, instituicao_id, periodo } = req.body;
  console.log("body", { nome, codigo, instituicao_id, periodo });

  if (!nome || !instituicao_id)
    return res
      .status(400)
      .json({ message: "Nome e instituicao_id são obrigatórios" });
  const db = await getDb();
  const inst =
    (await db.get("SELECT id FROM instituicoes WHERE id = $1", [
      instituicao_id,
    ])) || null;
  if (!inst) return res.status(400).json({ message: "Instituição inválida" });
  const now = new Date().toISOString();
  const result = await db.run(
    "INSERT INTO disciplinas (nome, codigo, instituicao_id, periodo, criado_em, atualizado_em) VALUES ($1, $2, $3, $4, $5, $6)",
    [nome, codigo || null, instituicao_id, periodo || null, now, now]
  );
  const id = result.lastID as number;
  const row = await db.get("SELECT * FROM disciplinas WHERE id = $1", [id]);
  res.status(201).json(row);
});

router.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { nome, codigo, instituicao_id } = req.body;
  const db = await getDb();
  const existing = await db.get("SELECT * FROM disciplinas WHERE id = $1", [
    id,
  ]);
  if (!existing)
    return res.status(404).json({ message: "Disciplina não encontrada" });
  if (instituicao_id) {
    const inst = await db.get("SELECT id FROM instituicoes WHERE id = $1", [
      instituicao_id,
    ]);
    if (!inst) return res.status(400).json({ message: "Instituição inválida" });
  }

  const atualizado_em = new Date().toISOString();
  await db.run(
    "UPDATE disciplinas SET nome = $1, codigo = $2, instituicao_id = $3, atualizado_em = $4 WHERE id = $5",
    [
      nome || existing.nome,
      codigo || existing.codigo,
      instituicao_id || existing.instituicao_id,
      atualizado_em,
      id,
    ]
  );
  const row = await db.get("SELECT * FROM disciplinas WHERE id = $1", [id]);
  res.json(row);
});

router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const db = await getDb();
  const turmas = await db.get(
    "SELECT COUNT(1) as cnt FROM turmas WHERE disciplina_id = $1",
    [id]
  );
  if (turmas && (turmas.cnt as number) > 0)
    return res
      .status(400)
      .json({ message: "Existem turmas vinculadas. Exclua-as primeiro." });

  // Deletar componentes de nota associados
  await db.run("DELETE FROM componentes_nota WHERE disciplina_id = $1", [id]);

  await db.run("DELETE FROM disciplinas WHERE id = $1", [id]);
  res.json({ message: "Disciplina excluída" });
});

export default router;
