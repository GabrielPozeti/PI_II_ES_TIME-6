import express from 'express';
import { getDb } from '../db';

const router = express.Router();

// GET data needed to edit notes for a specific component
router.get('/componente/:id', async (req, res) => {
  const componenteId = Number(req.params.id);
  const db = await getDb();
  const comp = await db.get('SELECT * FROM componentes_nota WHERE id = ?', componenteId);
  if (!comp) return res.status(404).json({ message: 'Componente não encontrado' });
  // students in the disciplina via turmas
  const alunos = await db.all(`
    SELECT a.id, a.matricula, a.nome
    FROM alunos a
    JOIN turmas t ON a.id_turma = t.id
    WHERE t.disciplina_id = ?
    ORDER BY a.nome
  `, comp.disciplina_id);
  const notasRows = await db.all('SELECT aluno_id, valor FROM notas WHERE componente_id = ?', componenteId);
  const notas: Record<number, number> = {};
  for (const n of notasRows as any[]) notas[n.aluno_id] = n.valor;
  res.json({ componente: comp, alunos, notas });
});

// PUT /notas - update multiple notes for a component
// Body: { componente_id: number, notas: Array<{ aluno_id: number, valor: number | null }> }
router.put('/', async (req, res) => {
  const { componente_id, notas } = req.body;
  if (!componente_id || !Array.isArray(notas)) return res.status(400).json({ message: 'componente_id e notas são obrigatórios' });
  const db = await getDb();
  const comp = await db.get('SELECT * FROM componentes_nota WHERE id = ?', componente_id);
  if (!comp) return res.status(400).json({ message: 'Componente inválido' });

  await db.run('BEGIN TRANSACTION');
  try {
    const now = new Date().toISOString();
    for (const item of notas) {
      const aluno_id = Number(item.aluno_id);
      const raw = item.valor;
      if (raw == null || raw === '') {
        // delete existing note if present
        await db.run('DELETE FROM notas WHERE aluno_id = ? AND componente_id = ?', aluno_id, componente_id);
        continue;
      }
      const v = Math.round(Number(raw) * 100) / 100; // two decimals
      if (Number.isNaN(v) || v < 0 || v > 10) {
        await db.run('ROLLBACK');
        return res.status(400).json({ message: `Valor inválido para aluno ${aluno_id}: ${raw}` });
      }
      // ensure aluno exists and belongs to same disciplina
      const aluno = await db.get('SELECT a.id, t.disciplina_id FROM alunos a JOIN turmas t ON a.id_turma = t.id WHERE a.id = ?', aluno_id);
      if (!aluno) { await db.run('ROLLBACK'); return res.status(400).json({ message: `Aluno inválido: ${aluno_id}` }); }
      if (aluno.disciplina_id !== comp.disciplina_id) { await db.run('ROLLBACK'); return res.status(400).json({ message: `Aluno ${aluno_id} não pertence à disciplina do componente` }); }

      // upsert
      await db.run(
        `INSERT INTO notas (aluno_id, componente_id, valor, atualizado_em) VALUES (?, ?, ?, ?)
         ON CONFLICT(aluno_id, componente_id) DO UPDATE SET valor = excluded.valor, atualizado_em = excluded.atualizado_em`,
        aluno_id, componente_id, v, now
      );
    }
    await db.run('COMMIT');
    res.json({ message: 'Notas atualizadas' });
  } catch (err) {
    await db.run('ROLLBACK');
    console.error(err);
    res.status(500).json({ message: 'Erro ao atualizar notas' });
  }
});

export default router;
