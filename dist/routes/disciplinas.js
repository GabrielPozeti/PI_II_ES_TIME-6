"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const db_1 = require("../db");
const router = express_1.default.Router();
router.get('/', async (req, res) => {
    const db = await (0, db_1.getDb)();
    const rows = await db.all('SELECT d.*, i.nome as instituicao_nome FROM disciplinas d JOIN instituicoes i ON d.instituicao_id = i.id ORDER BY d.id');
    res.json(rows);
});
router.get('/:id', async (req, res) => {
    const id = Number(req.params.id);
    const db = await (0, db_1.getDb)();
    const row = await db.get('SELECT * FROM disciplinas WHERE id = ?', id);
    if (!row)
        return res.status(404).json({ message: 'Disciplina não encontrada' });
    res.json(row);
});
router.post('/', async (req, res) => {
    const { nome, codigo, instituicao_id } = req.body;
    if (!nome || !instituicao_id)
        return res.status(400).json({ message: 'Nome e instituicao_id são obrigatórios' });
    const db = await (0, db_1.getDb)();
    const inst = await db.get('SELECT id FROM instituicoes WHERE id = ?', instituicao_id);
    if (!inst)
        return res.status(400).json({ message: 'Instituição inválida' });
    const now = new Date().toISOString();
    const result = await db.run('INSERT INTO disciplinas (nome, codigo, instituicao_id, criado_em, atualizado_em) VALUES (?, ?, ?, ?, ?)', nome, codigo || null, instituicao_id, now, now);
    const id = result.lastID;
    const row = await db.get('SELECT * FROM disciplinas WHERE id = ?', id);
    res.status(201).json(row);
});
router.put('/:id', async (req, res) => {
    const id = Number(req.params.id);
    const { nome, codigo, instituicao_id } = req.body;
    const db = await (0, db_1.getDb)();
    const existing = await db.get('SELECT * FROM disciplinas WHERE id = ?', id);
    if (!existing)
        return res.status(404).json({ message: 'Disciplina não encontrada' });
    if (instituicao_id) {
        const inst = await db.get('SELECT id FROM instituicoes WHERE id = ?', instituicao_id);
        if (!inst)
            return res.status(400).json({ message: 'Instituição inválida' });
    }
    const atualizado_em = new Date().toISOString();
    await db.run('UPDATE disciplinas SET nome = ?, codigo = ?, instituicao_id = ?, atualizado_em = ? WHERE id = ?', nome || existing.nome, codigo || existing.codigo, instituicao_id || existing.instituicao_id, atualizado_em, id);
    const row = await db.get('SELECT * FROM disciplinas WHERE id = ?', id);
    res.json(row);
});
router.delete('/:id', async (req, res) => {
    const id = Number(req.params.id);
    const db = await (0, db_1.getDb)();
    const turmas = await db.get('SELECT COUNT(1) as cnt FROM turmas WHERE disciplina_id = ?', id);
    if (turmas && turmas.cnt > 0)
        return res.status(400).json({ message: 'Existem turmas vinculadas. Exclua-as primeiro.' });
    await db.run('DELETE FROM disciplinas WHERE id = ?', id);
    res.json({ message: 'Disciplina excluída' });
});
exports.default = router;
