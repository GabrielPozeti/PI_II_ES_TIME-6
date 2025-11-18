/*
  Arquivo: src/utils/grades.ts
  Finalidade: Utilitários para cálculo de nota final de alunos.
  Observações: Suporta cálculo por fórmula definida na disciplina ou média ponderada por pesos.
*/
import { Database } from 'sqlite';

export async function computeNotaFinalForAluno(db: any, alunoId: number, disciplinaId: number): Promise<void> {
  // Check if there is a formula defined for the disciplina
  const disciplina = await db.get('SELECT formula FROM disciplinas WHERE id = ?', disciplinaId);
  const componentes: Array<{ id: number; peso: number; sigla: string }> = await db.all('SELECT id, COALESCE(peso, 1.0) as peso, sigla FROM componentes_nota WHERE disciplina_id = ? ORDER BY id', disciplinaId);

  if (!componentes || componentes.length === 0) {
    await db.run('UPDATE alunos SET nota_final = NULL, atualizado_em = ? WHERE id = ?', new Date().toISOString(), alunoId);
    return;
  }

  // If a formula exists, try to compute using the formula and component siglas
  if (disciplina && disciplina.formula) {
    const formula: string = disciplina.formula;
    // fetch all notas for the aluno for this disciplina
    const notasRows: Array<{ componente_id: number; valor: number }> = await db.all(
      `SELECT n.componente_id as componente_id, n.valor as valor FROM notas n JOIN componentes_nota c ON n.componente_id = c.id WHERE n.aluno_id = ? AND c.disciplina_id = ?`,
      alunoId, disciplinaId
    );
    const notasMap: Record<number, number> = {};
    for (const nr of notasRows) notasMap[nr.componente_id] = nr.valor;

    // build map sigla -> valor
    const siglaMap: Record<string, number|null> = {};
    for (const c of componentes as any[]) {
      const val = notasMap[c.id];
      siglaMap[c.sigla] = val == null ? null : Number(val);
    }

    // If any sigla referenced in formula is missing a nota, set nota_final = NULL
    // We'll check that every component sigla used in formula has a numeric value
    let expr = String(formula);
    for (const c of componentes as any[]) {
      const s = c.sigla;
      const re = new RegExp('\\b' + String(s).replace(/[-/\\^$*+?.()|[\]{}]/g,'\\$&') + '\\b', 'g');
      if (re.test(expr)) {
        const v = siglaMap[s];
        if (v == null) {
          await db.run('UPDATE alunos SET nota_final = NULL, atualizado_em = ? WHERE id = ?', new Date().toISOString(), alunoId);
          return;
        }
        // replace all occurrences with numeric literal
        expr = expr.replace(re, String(Number(v)));
      }
    }

    // validate resulting expression contains only safe characters
    if (!/^[0-9+\-*/().\s]+$/.test(expr)) {
      await db.run('UPDATE alunos SET nota_final = NULL, atualizado_em = ? WHERE id = ?', new Date().toISOString(), alunoId);
      return;
    }
    try {
      // evaluate safely
      // eslint-disable-next-line no-new-func
      const value = Function('return ' + expr)();
      let nota = Number(value);
      if (!Number.isFinite(nota) || Number.isNaN(nota)) {
        await db.run('UPDATE alunos SET nota_final = NULL, atualizado_em = ? WHERE id = ?', new Date().toISOString(), alunoId);
        return;
      }
      // clamp and round to two decimals
      if (nota < 0) nota = 0;
      if (nota > 10) nota = 10;
      nota = Math.round(nota * 100) / 100;
      await db.run('UPDATE alunos SET nota_final = ?, atualizado_em = ? WHERE id = ?', nota, new Date().toISOString(), alunoId);
      return;
    } catch (err) {
      await db.run('UPDATE alunos SET nota_final = NULL, atualizado_em = ? WHERE id = ?', new Date().toISOString(), alunoId);
      return;
    }
  }

  // Fallback: weighted average (previous behavior) if no formula
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
