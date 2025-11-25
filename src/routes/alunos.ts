/*
  Arquivo: src/routes/alunos.ts
  Finalidade: Rotas para gerenciar alunos (listagem, criação, atualização, exclusão).
  Observações: Opera sobre a tabela `alunos` e valida relacionamentos com `turmas`.
*/
import express from "express";
import { db } from "../db";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const database = await db();
    const idTurma = req.query.id_turma ? Number(req.query.id_turma) : null;
    if (idTurma) {
      const rows = await database.all(
        "SELECT a.*, t.codigo as turma_codigo, t.periodo as turma_periodo, d.nome as disciplina_nome FROM alunos a LEFT JOIN turmas t ON a.id_turma = t.id LEFT JOIN disciplinas d ON d.id = t.disciplina_id WHERE a.id_turma = $1 ORDER BY a.nome",
        [idTurma]
      );
      return res.json(rows);
    }
    const rows = await database.all(
      "SELECT a.*, t.codigo as turma_codigo, t.periodo as turma_periodo, d.nome as disciplina_nome FROM alunos a LEFT JOIN turmas t ON a.id_turma = t.id LEFT JOIN disciplinas d ON d.id = t.disciplina_id ORDER BY a.nome"
    );
    res.json(rows);
  } catch (err: any) {
    console.error("Erro GET /alunos", err);
    res.status(500).json({ message: "Erro interno ao listar alunos" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { matricula, nome, id_turma } = req.body;
    if (!matricula || !nome || !id_turma)
      return res
        .status(400)
        .json({ message: "matricula, nome e id_turma são obrigatórios" });
    const database = await db();
    const turma = await database.get("SELECT id FROM turmas WHERE id = $1", [
      id_turma,
    ]);
    if (!turma) return res.status(400).json({ message: "Turma inválida" });
    const exists = await database.get(
      "SELECT id FROM alunos WHERE matricula = $1",
      [matricula]
    );
    if (exists) return res.status(400).json({ message: "Matrícula já existe" });
    const now = new Date().toISOString();
    const result = await database.run(
      "INSERT INTO alunos (matricula, nome, id_turma, criado_em, atualizado_em) VALUES ($1, $2, $3, $4, $5)",
      [matricula, nome, id_turma, now, now]
    );
    const row = await database.get("SELECT * FROM alunos WHERE id = $1", [
      result.lastID,
    ]);
    res.status(201).json(row);
  } catch (err: any) {
    console.error("Erro POST /alunos", err);
    res.status(500).json({ message: "Erro interno ao criar aluno" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { matricula, nome, id_turma } = req.body;
    const database = await db();
    const existing = await database.get("SELECT * FROM alunos WHERE id = $1", [
      id,
    ]);
    if (!existing)
      return res.status(404).json({ message: "Aluno não encontrado" });
    if (id_turma) {
      const turma = await database.get("SELECT id FROM turmas WHERE id = $1", [
        id_turma,
      ]);
      if (!turma) return res.status(400).json({ message: "Turma inválida" });
    }
    if (matricula && matricula !== (existing as any).matricula) {
      const other = await database.get(
        "SELECT id FROM alunos WHERE matricula = $1",
        [matricula]
      );
      if (other)
        return res.status(400).json({ message: "Matrícula já existe" });
    }
    const atualizado_em = new Date().toISOString();
    await database.run(
      "UPDATE alunos SET matricula = $1, nome = $2, id_turma = $3, atualizado_em = $4 WHERE id = $5",
      [
        matricula || (existing as any).matricula,
        nome || (existing as any).nome,
        id_turma || (existing as any).id_turma,
        atualizado_em,
        id,
      ]
    );
    const row = await database.get("SELECT * FROM alunos WHERE id = $1", [id]);
    res.json(row);
  } catch (err: any) {
    console.error("Erro PUT /alunos/:id", err);
    res.status(500).json({ message: "Erro interno ao atualizar aluno" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const database = await db();
    await database.run("DELETE FROM alunos WHERE id = $1", [id]);
    res.json({ message: "Aluno excluído" });
  } catch (err: any) {
    console.error("Erro DELETE /alunos/:id", err);
    res.status(500).json({ message: "Erro interno ao excluir aluno" });
  }
});

export default router;
