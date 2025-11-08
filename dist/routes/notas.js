"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const db_1 = require("../db");
const router = express_1.default.Router();
router.get('/componente/:id', async (req, res) => {
    const componenteId = Number(req.params.id);
    const db = await (0, db_1.getDb)();
    const comp = await db.get('SELECT * FROM componentes_nota WHERE id = ?', componenteId);
    if (!comp)
        return res.status(404).json({ message: 'Componente não encontrado' });
    const alunos = await db.all(`
    SELECT a.id, a.matricula, a.nome
    FROM alunos a
    JOIN turmas t ON a.id_turma = t.id
    WHERE t.disciplina_id = ?
    ORDER BY a.nome
  `, comp.disciplina_id);
    const notasRows = await db.all('SELECT aluno_id, valor FROM notas WHERE componente_id = ?', componenteId);
    const notas = {};
    for (const n of notasRows)
        notas[n.aluno_id] = n.valor;
    res.json({ componente: comp, alunos, notas });
});
router.put('/', async (req, res) => {
    const { componente_id, notas } = req.body;
    if (!componente_id || !Array.isArray(notas))
        return res.status(400).json({ message: 'componente_id e notas são obrigatórios' });
    const db = await (0, db_1.getDb)();
    const comp = await db.get('SELECT * FROM componentes_nota WHERE id = ?', componente_id);
    if (!comp)
        return res.status(400).json({ message: 'Componente inválido' });
    await db.run('BEGIN TRANSACTION');
    try {
        const now = new Date().toISOString();
        for (const item of notas) {
            const aluno_id = Number(item.aluno_id);
            const raw = item.valor;
            if (raw == null || raw === '') {
                await db.run('DELETE FROM notas WHERE aluno_id = ? AND componente_id = ?', aluno_id, componente_id);
                continue;
            }
            const v = Math.round(Number(raw) * 100) / 100;
            if (Number.isNaN(v) || v < 0 || v > 10) {
                await db.run('ROLLBACK');
                return res.status(400).json({ message: `Valor inválido para aluno ${aluno_id}: ${raw}` });
            }
            const aluno = await db.get('SELECT a.id, t.disciplina_id FROM alunos a JOIN turmas t ON a.id_turma = t.id WHERE a.id = ?', aluno_id);
            if (!aluno) {
                await db.run('ROLLBACK');
                return res.status(400).json({ message: `Aluno inválido: ${aluno_id}` });
            }
            if (aluno.disciplina_id !== comp.disciplina_id) {
                await db.run('ROLLBACK');
                return res.status(400).json({ message: `Aluno ${aluno_id} não pertence à disciplina do componente` });
            }
            await db.run(`INSERT INTO notas (aluno_id, componente_id, valor, atualizado_em) VALUES (?, ?, ?, ?)
         ON CONFLICT(aluno_id, componente_id) DO UPDATE SET valor = excluded.valor, atualizado_em = excluded.atualizado_em`, aluno_id, componente_id, v, now);
        }
        await db.run('COMMIT');
        res.json({ message: 'Notas atualizadas' });
    }
    catch (err) {
        await db.run('ROLLBACK');
        console.error(err);
        res.status(500).json({ message: 'Erro ao atualizar notas' });
    }
});
exports.default = router;
