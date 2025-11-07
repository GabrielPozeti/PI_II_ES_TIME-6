import express from 'express';
import { getDb } from '../db';

const router = express.Router();

router.get('/', async (req, res) => {
  const db = await getDb();
  const rows = await db.all('SELECT t.*, d.nome as disciplina_nome FROM turmas t JOIN disciplinas d ON t.disciplina_id = d.id ORDER BY t.id');
  res.json(rows);
});

router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const db = await getDb();
  const row = await db.get('SELECT * FROM turmas WHERE id = ?', id);
  if (!row) return res.status(404).json({ message: 'Turma não encontrada' });
  res.json(row);
});

router.post('/', async (req, res) => {
  const { disciplina_id, codigo, periodo } = req.body;
  if (!disciplina_id) return res.status(400).json({ message: 'disciplina_id é obrigatório' });
  const db = await getDb();
  const disc = await db.get('SELECT id FROM disciplinas WHERE id = ?', disciplina_id);
  if (!disc) return res.status(400).json({ message: 'Disciplina inválida' });
  const now = new Date().toISOString();
  const result = await db.run('INSERT INTO turmas (disciplina_id, codigo, periodo, criado_em, atualizado_em) VALUES (?, ?, ?, ?, ?)', disciplina_id, codigo || null, periodo || null, now, now);
  const id = result.lastID as number;
  const row = await db.get('SELECT * FROM turmas WHERE id = ?', id);
  res.status(201).json(row);
});

router.put('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { disciplina_id, codigo, periodo } = req.body;
  const db = await getDb();
  const existing = await db.get('SELECT * FROM turmas WHERE id = ?', id);
  if (!existing) return res.status(404).json({ message: 'Turma não encontrada' });
  if (disciplina_id) {
    const disc = await db.get('SELECT id FROM disciplinas WHERE id = ?', disciplina_id);
    if (!disc) return res.status(400).json({ message: 'Disciplina inválida' });
  }
  const atualizado_em = new Date().toISOString();
  await db.run('UPDATE turmas SET disciplina_id = ?, codigo = ?, periodo = ?, atualizado_em = ? WHERE id = ?', disciplina_id || existing.disciplina_id, codigo || existing.codigo, periodo || existing.periodo, atualizado_em, id);
  const row = await db.get('SELECT * FROM turmas WHERE id = ?', id);
  res.json(row);
});

router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const db = await getDb();
  await db.run('DELETE FROM turmas WHERE id = ?', id);
  res.json({ message: 'Turma excluída' });
});

export default router;
