import { Database } from 'sqlite';

export async function computeNotaFinalForAluno(db: any, alunoId: number, disciplinaId: number): Promise<void> {
  const componentes: Array<{ id: number; peso: number }> = await db.all('SELECT id, COALESCE(peso, 1.0) as peso FROM componentes_nota WHERE disciplina_id = ? ORDER BY id', disciplinaId);
  if (!componentes || componentes.length === 0) {
    await db.run('UPDATE alunos SET nota_final = NULL, atualizado_em = ? WHERE id = ?', new Date().toISOString(), alunoId);
    return;
  }

  const rows: Array<{ valor: number; peso: number }> = await db.all(
    `SELECT n.valor as valor, COALESCE(c.peso, 1.0) as peso
     FROM notas n
     JOIN componentes_nota c ON n.componente_id = c.id
     WHERE n.aluno_id = ? AND c.disciplina_id = ?`,
    alunoId, disciplinaId
  );

  if (!rows || rows.length === 0) {
    await db.run('UPDATE alunos SET nota_final = NULL, atualizado_em = ? WHERE id = ?', new Date().toISOString(), alunoId);
    return;
  }

  let weightedSum = 0;
  let weightTotal = 0;
  for (const r of rows) {
    const v = Number(r.valor);
    const p = Number(r.peso) || 1.0;
    weightedSum += v * p;
    weightTotal += p;
  }
  const nota = weightTotal === 0 ? null : Math.round((weightedSum / weightTotal) * 100) / 100;
  await db.run('UPDATE alunos SET nota_final = ?, atualizado_em = ? WHERE id = ?', nota, new Date().toISOString(), alunoId);
}

export async function computeNotaFinalForAlunos(db: any, alunoIds: number[], disciplinaId: number): Promise<void> {
  for (const a of alunoIds) {
    await computeNotaFinalForAluno(db, a, disciplinaId);
  }
}

export default {
  computeNotaFinalForAluno,
  computeNotaFinalForAlunos,
};
