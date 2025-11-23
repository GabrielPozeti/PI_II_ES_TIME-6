/*
  Arquivo: src/routes/notas.ts
  Finalidade: Endpoints para manipulação de notas (consulta por componente e atualização em lote).
  Observações: Realiza transações para atualizações em lote e invoca `computeNotaFinalForAluno`.
*/
import express from 'express';
import { db } from '../db';
import { computeNotaFinalForAluno } from '../utils/grades';

const router = express.Router();

router.get('/componente/:id', async (req, res) => {
  const componenteId = Number(req.params.id);
  const database = await db();
  const comp = await database.get('SELECT * FROM componentes_nota WHERE id = ?', [componenteId]);
  if (!comp) return res.status(404).json({ message: 'Componente não encontrado' });
  const alunos = await database.all(`
    SELECT a.id, a.matricula, a.nome
    FROM alunos a
    JOIN turmas t ON a.id_turma = t.id
    WHERE t.disciplina_id = ?
    ORDER BY a.nome
  `, comp.disciplina_id);
  const notasRows = await database.all('SELECT aluno_id, valor FROM notas WHERE componente_id = ?', [componenteId]);
  const notas: Record<number, number> = {};
  for (const n of notasRows as any[]) notas[n.aluno_id] = n.valor;
  res.json({ componente: comp, alunos, notas });
});


router.put('/', async (req, res) => {
  const { componente_id, notas } = req.body;
  if (!componente_id || !Array.isArray(notas)) return res.status(400).json({ message: 'componente_id e notas são obrigatórios' });
  const database = await db();
  const comp = await database.get('SELECT * FROM componentes_nota WHERE id = ?', [componente_id]);
  if (!comp) return res.status(400).json({ message: 'Componente inválido' });

  await database.run('BEGIN');
  try {
    const now = new Date().toISOString();
    const affectedAlunoIds = new Set<number>();
    for (const item of notas) {
      const aluno_id = Number(item.aluno_id);
      const raw = item.valor;
      if (raw == null || raw === '') {
        await database.run('DELETE FROM notas WHERE aluno_id = ? AND componente_id = ?', [aluno_id, componente_id]);
        continue;
      }
      const v = Math.round(Number(raw) * 100) / 100;
      if (Number.isNaN(v) || v < 0 || v > 10) {
        await database.run('ROLLBACK');
        return res.status(400).json({ message: `Valor inválido para aluno ${aluno_id}: ${raw}` });
      }
      const aluno = await database.get('SELECT a.id, t.disciplina_id FROM alunos a JOIN turmas t ON a.id_turma = t.id WHERE a.id = ?', [aluno_id]);
      if (!aluno) { await database.run('ROLLBACK'); return res.status(400).json({ message: `Aluno inválido: ${aluno_id}` }); }
      if ((aluno as any).disciplina_id !== (comp as any).disciplina_id) { await database.run('ROLLBACK'); return res.status(400).json({ message: `Aluno ${aluno_id} não pertence à disciplina do componente` }); }

      await database.run(
        `INSERT INTO notas (aluno_id, componente_id, valor, atualizado_em) VALUES ($1, $2, $3, $4)
         ON CONFLICT(aluno_id, componente_id) DO UPDATE SET valor = EXCLUDED.valor, atualizado_em = EXCLUDED.atualizado_em`,
        [aluno_id, componente_id, v, now]
      );
      affectedAlunoIds.add(aluno_id);
    }
    await database.run('COMMIT');
    try {
      for (const a of Array.from(affectedAlunoIds)) {
        await computeNotaFinalForAluno(database, a, (comp as any).disciplina_id);
      }
    } catch (err) {
      console.error('Erro ao recalcular nota_final após atualização em lote:', err);
    }
    res.json({ message: 'Notas atualizadas' });
  } catch (err) {
    await database.run('ROLLBACK');
    console.error(err);
    res.status(500).json({ message: 'Erro ao atualizar notas' });
  }
});

export default router;
