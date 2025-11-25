//Feito por Gabriel Henrique Pozeti de Faria

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const db_1 = require("../db");
const router = express_1.default.Router();
router.get('/', async (req, res) => {
    try {
        const db = await (0, db_1.getDb)();
        const idTurma = req.query.id_turma ? Number(req.query.id_turma) : null;
        if (idTurma) {
            const rows = await db.all('SELECT a.*, t.codigo as turma_codigo, t.periodo as turma_periodo FROM alunos a LEFT JOIN turmas t ON a.id_turma = t.id WHERE a.id_turma = ? ORDER BY a.nome', idTurma);
            return res.json(rows);
        }
        const rows = await db.all('SELECT a.*, t.codigo as turma_codigo, t.periodo as turma_periodo FROM alunos a LEFT JOIN turmas t ON a.id_turma = t.id ORDER BY a.nome');
        res.json(rows);
    }
    catch (err) {
        console.error('Erro GET /alunos', err);
        res.status(500).json({ message: 'Erro interno ao listar alunos' });
    }
});
router.post('/', async (req, res) => {
    try {
        const { matricula, nome, id_turma } = req.body;
        if (!matricula || !nome || !id_turma)
            return res.status(400).json({ message: 'matricula, nome e id_turma são obrigatórios' });
        const db = await (0, db_1.getDb)();
        const turma = await db.get('SELECT id FROM turmas WHERE id = ?', id_turma);
        if (!turma)
            return res.status(400).json({ message: 'Turma inválida' });
        const exists = await db.get('SELECT id FROM alunos WHERE matricula = ?', matricula);
        if (exists)
            return res.status(400).json({ message: 'Matrícula já existe' });
        const now = new Date().toISOString();
        const result = await db.run('INSERT INTO alunos (matricula, nome, id_turma, criado_em, atualizado_em) VALUES (?, ?, ?, ?, ?)', matricula, nome, id_turma, now, now);
        const row = await db.get('SELECT * FROM alunos WHERE id = ?', result.lastID);
        res.status(201).json(row);
    }
    catch (err) {
        console.error('Erro POST /alunos', err);
        res.status(500).json({ message: 'Erro interno ao criar aluno' });
    }
});
router.put('/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { matricula, nome, id_turma } = req.body;
        const db = await (0, db_1.getDb)();
        const existing = await db.get('SELECT * FROM alunos WHERE id = ?', id);
        if (!existing)
            return res.status(404).json({ message: 'Aluno não encontrado' });
        if (id_turma) {
            const turma = await db.get('SELECT id FROM turmas WHERE id = ?', id_turma);
            if (!turma)
                return res.status(400).json({ message: 'Turma inválida' });
        }
        if (matricula && matricula !== existing.matricula) {
            const other = await db.get('SELECT id FROM alunos WHERE matricula = ?', matricula);
            if (other)
                return res.status(400).json({ message: 'Matrícula já existe' });
        }
        const atualizado_em = new Date().toISOString();
        await db.run('UPDATE alunos SET matricula = ?, nome = ?, id_turma = ?, atualizado_em = ? WHERE id = ?', matricula || existing.matricula, nome || existing.nome, id_turma || existing.id_turma, atualizado_em, id);
        const row = await db.get('SELECT * FROM alunos WHERE id = ?', id);
        res.json(row);
    }
    catch (err) {
        console.error('Erro PUT /alunos/:id', err);
        res.status(500).json({ message: 'Erro interno ao atualizar aluno' });
    }
});
router.delete('/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        const db = await (0, db_1.getDb)();
        await db.run('DELETE FROM alunos WHERE id = ?', id);
        res.json({ message: 'Aluno excluído' });
    }
    catch (err) {
        console.error('Erro DELETE /alunos/:id', err);
        res.status(500).json({ message: 'Erro interno ao excluir aluno' });
    }
});
exports.default = router;
