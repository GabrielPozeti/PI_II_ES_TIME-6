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
    const rows = await db.all('SELECT * FROM instituicoes ORDER BY id');
    res.json(rows);
});
router.get('/:id', async (req, res) => {
    const id = Number(req.params.id);
    const db = await (0, db_1.getDb)();
    const row = await db.get('SELECT * FROM instituicoes WHERE id = ?', id);
    if (!row)
        return res.status(404).json({ message: 'Instituição não encontrada' });
    res.json(row);
});
router.post('/', async (req, res) => {
    const { nome, sigla } = req.body;
    if (!nome)
        return res.status(400).json({ message: 'Nome é obrigatório' });
    const db = await (0, db_1.getDb)();
    const now = new Date().toISOString();
    const result = await db.run('INSERT INTO instituicoes (nome, sigla, criado_em, atualizado_em) VALUES (?, ?, ?, ?)', nome, sigla || null, now, now);
    const id = result.lastID;
    const row = await db.get('SELECT * FROM instituicoes WHERE id = ?', id);
    res.status(201).json(row);
});
router.put('/:id', async (req, res) => {
    const id = Number(req.params.id);
    const { nome, sigla } = req.body;
    const db = await (0, db_1.getDb)();
    const existing = await db.get('SELECT * FROM instituicoes WHERE id = ?', id);
    if (!existing)
        return res.status(404).json({ message: 'Instituição não encontrada' });
    const atualizado_em = new Date().toISOString();
    await db.run('UPDATE instituicoes SET nome = ?, sigla = ?, atualizado_em = ? WHERE id = ?', nome || existing.nome, sigla || existing.sigla, atualizado_em, id);
    const row = await db.get('SELECT * FROM instituicoes WHERE id = ?', id);
    res.json(row);
});
router.delete('/:id', async (req, res) => {
    const id = Number(req.params.id);
    const db = await (0, db_1.getDb)();
    const disciplinas = await db.get('SELECT COUNT(1) as cnt FROM disciplinas WHERE instituicao_id = ?', id);
    if (disciplinas && disciplinas.cnt > 0)
        return res.status(400).json({ message: 'Existem disciplinas vinculadas. Exclua-as primeiro.' });
    await db.run('DELETE FROM instituicoes WHERE id = ?', id);
    res.json({ message: 'Instituição excluída' });
});
exports.default = router;
