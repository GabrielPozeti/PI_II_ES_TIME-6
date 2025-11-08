import express from 'express';
import { getDb } from '../db';
import { computeNotaFinalForAluno } from '../utils/grades';

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

router.get('/:id/notas', async (req, res) => {
  const id = Number(req.params.id);
  const db = await getDb();
  const turma = await db.get('SELECT * FROM turmas WHERE id = ?', id);
  if (!turma) return res.status(404).json({ message: 'Turma não encontrada' });
  const disciplinaId = turma.disciplina_id;
  const componentes = await db.all('SELECT * FROM componentes_nota WHERE disciplina_id = ? ORDER BY id', disciplinaId);
  const alunos = await db.all('SELECT id, matricula, nome, nota_final FROM alunos WHERE id_turma = ? ORDER BY nome', id);
  const compIds = componentes.map((c:any) => c.id);
  const notasRows = compIds.length ? await db.all('SELECT aluno_id, componente_id, valor FROM notas WHERE componente_id IN (' + compIds.map(()=>'?').join(',') + ')', ...compIds) : [];
  const notas: Record<string, number> = {};
  for (const n of notasRows as any[]) notas[`${n.aluno_id}_${n.componente_id}`] = n.valor;

  for (const a of alunos as any[]) {
    if (a.nota_final == null) {
      try { await computeNotaFinalForAluno(db, a.id, disciplinaId); } catch (err) { console.error('Erro compute nota_final:', err); }
    }
  }

  const alunosFinal = await db.all('SELECT id, matricula, nome, nota_final FROM alunos WHERE id_turma = ? ORDER BY nome', id);

  res.json({ componentes, alunos: alunosFinal, notas });
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
