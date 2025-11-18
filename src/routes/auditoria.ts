/*
  Arquivo: src/routes/auditoria.ts
  Finalidade: Rotas para recuperar logs de auditoria de notas por turma.
  Observações: Consulta a tabela `auditoria_notas` e junta com `alunos`, `turmas` e `componentes_nota`.
*/
import express from 'express';
import { getDb } from '../db';

const router = express.Router();

router.get('/:turmaId', async (req, res) => {
  const turmaId = Number(req.params.turmaId);
  if (!turmaId) return res.status(400).json({ message: 'turmaId inválido' });
  const db = await getDb();
  const rows = await db.all(
    `SELECT an.id as log_id, an.aluno_id, an.componente_id, an.valor_antigo, an.valor_novo, an.data_hora,
            a.nome as aluno_nome, a.matricula as aluno_matricula,
            c.nome as componente_nome, c.sigla as componente_sigla,
            t.id as turma_id, t.codigo as turma_codigo
     FROM auditoria_notas an
     JOIN alunos a ON an.aluno_id = a.id
     JOIN turmas t ON a.id_turma = t.id
     JOIN componentes_nota c ON an.componente_id = c.id
     WHERE t.id = ?
     ORDER BY an.data_hora DESC`,
    turmaId
  );
  res.json(rows);
});

export default router;
