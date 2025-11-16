"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeNotaFinalForAluno = computeNotaFinalForAluno;
exports.computeNotaFinalForAlunos = computeNotaFinalForAlunos;
async function computeNotaFinalForAluno(db, alunoId, disciplinaId) {
    const componentes = await db.all('SELECT id, COALESCE(peso, 1.0) as peso FROM componentes_nota WHERE disciplina_id = ? ORDER BY id', disciplinaId);
    if (!componentes || componentes.length === 0) {
        await db.run('UPDATE alunos SET nota_final = NULL, atualizado_em = ? WHERE id = ?', new Date().toISOString(), alunoId);
        return;
    }
    const rows = await db.all(`SELECT n.valor as valor, COALESCE(c.peso, 1.0) as peso
     FROM notas n
     JOIN componentes_nota c ON n.componente_id = c.id
     WHERE n.aluno_id = ? AND c.disciplina_id = ?`, alunoId, disciplinaId);
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
async function computeNotaFinalForAlunos(db, alunoIds, disciplinaId) {
    for (const a of alunoIds) {
        await computeNotaFinalForAluno(db, a, disciplinaId);
    }
}
exports.default = {
    computeNotaFinalForAluno,
    computeNotaFinalForAlunos,
};
