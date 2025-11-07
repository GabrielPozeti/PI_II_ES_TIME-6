"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const db_1 = require("../db");
const router = express_1.default.Router();
router.get('/', async (req, res) => {
    const disciplina_id = req.query.disciplina_id ? Number(req.query.disciplina_id) : undefined;
    const db = await (0, db_1.getDb)();
    if (disciplina_id) {
        const rows = await db.all('SELECT * FROM componentes_nota WHERE disciplina_id = ? ORDER BY id', disciplina_id);
        return res.json(rows);
    }
    const rows = await db.all('SELECT * FROM componentes_nota ORDER BY id');
    res.json(rows);
});
router.get('/:id', async (req, res) => {
    const id = Number(req.params.id);
    const db = await (0, db_1.getDb)();
    const row = await db.get('SELECT * FROM componentes_nota WHERE id = ?', id);
    if (!row)
        return res.status(404).json({ message: 'Componente não encontrado' });
    res.json(row);
});
router.post('/', async (req, res) => {
    const { nome, sigla, descricao, disciplina_id } = req.body;
    if (!nome || !disciplina_id)
        return res.status(400).json({ message: 'nome e disciplina_id são obrigatórios' });
    const db = await (0, db_1.getDb)();
    const disc = await db.get('SELECT id FROM disciplinas WHERE id = ?', disciplina_id);
    if (!disc)
        return res.status(400).json({ message: 'Disciplina inválida' });
    const now = new Date().toISOString();
    const result = await db.run('INSERT INTO componentes_nota (nome, sigla, descricao, disciplina_id, criado_em, atualizado_em) VALUES (?, ?, ?, ?, ?, ?)', nome, sigla || null, descricao || null, disciplina_id, now, now);
    const id = result.lastID;
    const row = await db.get('SELECT * FROM componentes_nota WHERE id = ?', id);
    res.status(201).json(row);
});
router.put('/:id', async (req, res) => {
    const id = Number(req.params.id);
    const { nome, sigla, descricao, disciplina_id } = req.body;
    const db = await (0, db_1.getDb)();
    const existing = await db.get('SELECT * FROM componentes_nota WHERE id = ?', id);
    if (!existing)
        return res.status(404).json({ message: 'Componente não encontrado' });
    if (disciplina_id) {
        const disc = await db.get('SELECT id FROM disciplinas WHERE id = ?', disciplina_id);
        if (!disc)
            return res.status(400).json({ message: 'Disciplina inválida' });
    }
    const atualizado_em = new Date().toISOString();
    await db.run('UPDATE componentes_nota SET nome = ?, sigla = ?, descricao = ?, disciplina_id = ?, atualizado_em = ? WHERE id = ?', nome || existing.nome, sigla || existing.sigla, descricao || existing.descricao, disciplina_id || existing.disciplina_id, atualizado_em, id);
    const row = await db.get('SELECT * FROM componentes_nota WHERE id = ?', id);
    res.json(row);
});
router.delete('/:id', async (req, res) => {
    const id = Number(req.params.id);
    const db = await (0, db_1.getDb)();
    const count = await db.get('SELECT COUNT(1) as cnt FROM notas WHERE componente_id = ?', id);
    if (count && count.cnt > 0)
        return res.status(400).json({ message: 'Existem notas vinculadas a este componente. Exclua-as primeiro.' });
    await db.run('DELETE FROM componentes_nota WHERE id = ?', id);
    res.json({ message: 'Componente excluído' });
});
router.get('/matriz/:disciplinaId', async (req, res) => {
    const disciplinaId = Number(req.params.disciplinaId);
    const db = await (0, db_1.getDb)();
    const componentes = await db.all('SELECT * FROM componentes_nota WHERE disciplina_id = ? ORDER BY id', disciplinaId);
    const alunos = await db.all(`
    SELECT a.id, a.matricula, a.nome, a.id_turma
    FROM alunos a
    JOIN turmas t ON a.id_turma = t.id
    WHERE t.disciplina_id = ?
    ORDER BY a.nome
  `, disciplinaId);
    const notas = await db.all('SELECT * FROM notas WHERE componente_id IN (' + (componentes.map(() => '?').join(',') || 'NULL') + ')', ...(componentes.map((c) => c.id)));
    const notasMap = {};
    for (const n of notas) {
        notasMap[`${n.aluno_id}_${n.componente_id}`] = n.valor;
    }
    res.json({ componentes, alunos, notas: notasMap });
});
router.post('/notas', async (req, res) => {
    const { aluno_id, componente_id, valor } = req.body;
    if (aluno_id == null || componente_id == null || valor == null)
        return res.status(400).json({ message: 'aluno_id, componente_id e valor são obrigatórios' });
    const v = Number(valor);
    if (Number.isNaN(v) || v < 0 || v > 10)
        return res.status(400).json({ message: 'valor deve estar entre 0.00 e 10.00' });
    const db = await (0, db_1.getDb)();
    const aluno = await db.get('SELECT a.id, t.disciplina_id FROM alunos a JOIN turmas t ON a.id_turma = t.id WHERE a.id = ?', aluno_id);
    if (!aluno)
        return res.status(400).json({ message: 'Aluno inválido' });
    const comp = await db.get('SELECT * FROM componentes_nota WHERE id = ?', componente_id);
    if (!comp)
        return res.status(400).json({ message: 'Componente inválido' });
    if (comp.disciplina_id !== aluno.disciplina_id)
        return res.status(400).json({ message: 'Componente não pertence à disciplina do aluno' });
    const now = new Date().toISOString();
    await db.run(`INSERT INTO notas (aluno_id, componente_id, valor, criado_em, atualizado_em) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(aluno_id, componente_id) DO UPDATE SET valor = excluded.valor, atualizado_em = excluded.atualizado_em`, aluno_id, componente_id, v, now, now);
    res.json({ message: 'Nota registrada' });
});
exports.default = router;
