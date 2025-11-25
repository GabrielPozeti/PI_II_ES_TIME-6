/*
  Arquivo: src/routes/componentes.ts
  Finalidade: Rotas para gerenciar componentes de avaliação e suas notas.
  Observações: Suporta listagem, CRUD, matriz de componentes por disciplina e atualização de notas.
*/
import express from "express";
import { getDb } from "../db";

const router = express.Router();

router.get("/", async (req, res) => {
  const disciplina_id = req.query.disciplina_id
    ? Number(req.query.disciplina_id)
    : undefined;
  const db = await getDb();
  if (disciplina_id) {
    const rows = await db.all(
      "SELECT * FROM componentes_nota WHERE disciplina_id = $1 ORDER BY id",
      [disciplina_id]
    );
    return res.json(rows);
  }
  const rows = await db.all("SELECT * FROM componentes_nota ORDER BY id");
  res.json(rows);
});

router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const db = await getDb();
  const row = await db.get("SELECT * FROM componentes_nota WHERE id = $1", [
    id,
  ]);
  if (!row)
    return res.status(404).json({ message: "Componente não encontrado" });
  res.json(row);
});

router.post("/", async (req, res) => {
  const { nome, sigla, descricao, disciplina_id, peso } = req.body;
  if (!nome || !disciplina_id)
    return res
      .status(400)
      .json({ message: "nome e disciplina_id são obrigatórios" });
  const db = await getDb();
  const disc = await db.get("SELECT id FROM disciplinas WHERE id = $1", [
    disciplina_id,
  ]);
  if (!disc) return res.status(400).json({ message: "Disciplina inválida" });
  const now = new Date().toISOString();
  const result = await db.run(
    "INSERT INTO componentes_nota (nome, sigla, descricao, disciplina_id, peso, criado_em, atualizado_em) VALUES ($1, $2, $3, $4, $5, $6, $7)",
    [
      nome,
      sigla || null,
      descricao || null,
      disciplina_id,
      typeof peso === "number" ? peso : 1.0,
      now,
      now,
    ]
  );
  const id = result.lastID as number;
  const row = await db.get("SELECT * FROM componentes_nota WHERE id = $1", [
    id,
  ]);
  res.status(201).json(row);
});

router.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { nome, sigla, descricao, disciplina_id, peso } = req.body;
  const db = await getDb();
  const existing = await db.get(
    "SELECT * FROM componentes_nota WHERE id = $1",
    [id]
  );
  if (!existing)
    return res.status(404).json({ message: "Componente não encontrado" });
  if (disciplina_id) {
    const disc = await db.get("SELECT id FROM disciplinas WHERE id = $1", [
      disciplina_id,
    ]);
    if (!disc) return res.status(400).json({ message: "Disciplina inválida" });
  }
  const atualizado_em = new Date().toISOString();
  await db.run(
    "UPDATE componentes_nota SET nome = $1, sigla = $2, descricao = $3, disciplina_id = $4, peso = $5, atualizado_em = $6 WHERE id = $7",
    [
      nome || existing.nome,
      sigla || existing.sigla,
      descricao || existing.descricao,
      disciplina_id || existing.disciplina_id,
      typeof peso === "number" ? peso : existing.peso,
      atualizado_em,
      id,
    ]
  );
  const row = await db.get("SELECT * FROM componentes_nota WHERE id = $1", [
    id,
  ]);
  res.json(row);
});

router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const db = await getDb();
  const count = await db.get(
    "SELECT COUNT(1) as cnt FROM notas WHERE componente_id = $1",
    [id]
  );
  if (count && (count.cnt as number) > 0)
    return res.status(400).json({
      message:
        "Existem notas vinculadas a este componente. Exclua-as primeiro.",
    });
  await db.run("DELETE FROM componentes_nota WHERE id = $1", [id]);
  res.json({ message: "Componente excluído" });
});

router.get("/matriz/:disciplinaId", async (req, res) => {
  const disciplinaId = Number(req.params.disciplinaId);
  const db = await getDb();
  const componentes = await db.all(
    "SELECT * FROM componentes_nota WHERE disciplina_id = $1 ORDER BY id",
    [disciplinaId]
  );
  const alunos = await db.all(
    `
    SELECT a.id, a.matricula, a.nome, a.id_turma
    FROM alunos a
    JOIN turmas t ON a.id_turma = t.id
    WHERE t.disciplina_id = $1
    ORDER BY a.nome
  `,
    [disciplinaId]
  );
  const componenteIds = componentes.map((c: any) => c.id);
  const notas =
    componenteIds.length > 0
      ? await db.all(
          "SELECT * FROM notas WHERE componente_id IN (" +
            componenteIds.map((_, i) => `$${i + 1}`).join(",") +
            ")",
          componenteIds
        )
      : [];
  const notasMap: Record<string, number> = {};
  for (const n of notas as any[]) {
    notasMap[`${n.aluno_id}_${n.componente_id}`] = n.valor;
  }
  res.json({ componentes, alunos, notas: notasMap });
});

router.post("/notas", async (req, res) => {
  const { aluno_id, componente_id, valor } = req.body;
  if (aluno_id == null || componente_id == null || valor == null)
    return res
      .status(400)
      .json({ message: "aluno_id, componente_id e valor são obrigatórios" });
  const v = Number(valor);
  if (Number.isNaN(v) || v < 0 || v > 10)
    return res
      .status(400)
      .json({ message: "valor deve estar entre 0.00 e 10.00" });
  const db = await getDb();
  const aluno = await db.get(
    "SELECT a.id, t.disciplina_id FROM alunos a JOIN turmas t ON a.id_turma = t.id WHERE a.id = $1",
    [aluno_id]
  );
  if (!aluno) return res.status(400).json({ message: "Aluno inválido" });
  const comp = await db.get("SELECT * FROM componentes_nota WHERE id = $1", [
    componente_id,
  ]);
  if (!comp) return res.status(400).json({ message: "Componente inválido" });
  if (comp.disciplina_id !== aluno.disciplina_id)
    return res
      .status(400)
      .json({ message: "Componente não pertence à disciplina do aluno" });

  const now = new Date().toISOString();
  await db.run(
    `INSERT INTO notas (aluno_id, componente_id, valor, criado_em, atualizado_em) VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT(aluno_id, componente_id) DO UPDATE SET valor = excluded.valor, atualizado_em = excluded.atualizado_em`,
    [aluno_id, componente_id, v, now, now]
  );
  res.json({ message: "Nota registrada" });
});

export default router;
