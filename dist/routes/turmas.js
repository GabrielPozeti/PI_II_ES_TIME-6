"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const db_1 = require("../db");
const grades_1 = require("../utils/grades");
const router = express_1.default.Router();
router.get('/', async (req, res) => {
    const db = await (0, db_1.getDb)();
    const rows = await db.all('SELECT t.*, d.nome as disciplina_nome FROM turmas t JOIN disciplinas d ON t.disciplina_id = d.id ORDER BY t.id');
    res.json(rows);
});
router.get('/:id', async (req, res) => {
    const id = Number(req.params.id);
    const db = await (0, db_1.getDb)();
    const row = await db.get('SELECT * FROM turmas WHERE id = ?', id);
    if (!row)
        return res.status(404).json({ message: 'Turma não encontrada' });
    res.json(row);
});
router.get('/:id/notas', async (req, res) => {
    const id = Number(req.params.id);
    const db = await (0, db_1.getDb)();
    const turma = await db.get('SELECT * FROM turmas WHERE id = ?', id);
    if (!turma)
        return res.status(404).json({ message: 'Turma não encontrada' });
    const disciplinaId = turma.disciplina_id;
    const componentes = await db.all('SELECT * FROM componentes_nota WHERE disciplina_id = ? ORDER BY id', disciplinaId);
    const alunos = await db.all('SELECT id, matricula, nome, nota_final FROM alunos WHERE id_turma = ? ORDER BY nome', id);
    const compIds = componentes.map((c) => c.id);
    const notasRows = compIds.length ? await db.all('SELECT aluno_id, componente_id, valor FROM notas WHERE componente_id IN (' + compIds.map(() => '?').join(',') + ')', ...compIds) : [];
    const notas = {};
    for (const n of notasRows)
        notas[`${n.aluno_id}_${n.componente_id}`] = n.valor;
    for (const a of alunos) {
        if (a.nota_final == null) {
            try {
                await (0, grades_1.computeNotaFinalForAluno)(db, a.id, disciplinaId);
            }
            catch (err) {
                console.error('Erro compute nota_final:', err);
            }
        }
    }
    const alunosFinal = await db.all('SELECT id, matricula, nome, nota_final FROM alunos WHERE id_turma = ? ORDER BY nome', id);
    res.json({ componentes, alunos: alunosFinal, notas });
});
router.get('/:id/exportar', async (req, res) => {
    const id = Number(req.params.id);
    const db = await (0, db_1.getDb)();
    const turma = await db.get('SELECT t.*, d.nome as disciplina_nome, d.codigo as disciplina_codigo FROM turmas t JOIN disciplinas d ON t.disciplina_id = d.id WHERE t.id = ?', id);
    if (!turma)
        return res.status(404).json({ message: 'Turma não encontrada' });
    const disciplinaId = turma.disciplina_id;
    const componentes = await db.all('SELECT * FROM componentes_nota WHERE disciplina_id = ? ORDER BY id', disciplinaId);
    const alunos = await db.all('SELECT id, matricula, nome, nota_final FROM alunos WHERE id_turma = ? ORDER BY nome', id);
    const compIds = componentes.map((c) => c.id);
    const notasRows = compIds.length ? await db.all('SELECT aluno_id, componente_id, valor FROM notas WHERE componente_id IN (' + compIds.map(() => '?').join(',') + ')', ...compIds) : [];
    const notasMap = {};
    for (const n of notasRows)
        notasMap[`${n.aluno_id}_${n.componente_id}`] = n.valor;
    const missing = [];
    for (const a of alunos) {
        for (const c of componentes) {
            const key = `${a.id}_${c.id}`;
            if (notasMap[key] == null)
                missing.push({ alunoId: a.id, alunoNome: a.nome, componenteId: c.id, componenteNome: c.nome });
        }
    }
    if (missing.length > 0) {
        return res.status(400).json({ message: 'Existem notas em branco. Complete todas as notas antes de exportar.', missingCount: missing.length });
    }
    function escapeCsv(val) {
        if (val == null)
            return '';
        const s = String(val);
        if (s.includes('"') || s.includes(',') || s.includes('\n') || s.includes('\r'))
            return '"' + s.replace(/\"/g, '\"\"') + '"';
        return s;
    }
    const headerCols = ['Matricula', 'Nome', ...componentes.map((c) => c.sigla || c.nome), 'Nota Final'];
    const rows = [];
    rows.push(headerCols.map(escapeCsv).join(','));
    for (const a of alunos) {
        const cols = [];
        cols.push(a.matricula || '');
        cols.push(a.nome || '');
        for (const c of componentes) {
            const key = `${a.id}_${c.id}`;
            const v = notasMap[key];
            cols.push(typeof v === 'number' ? v.toFixed(2) : v == null ? '' : String(v));
        }
        cols.push(a.nota_final == null ? '' : Number(a.nota_final).toFixed(2));
        rows.push(cols.map(escapeCsv).join(','));
    }
    const csv = rows.join('\r\n');
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const turmaLabel = `Turma${turma.id}`;
    const sigla = (turma.disciplina_codigo || turma.disciplina_nome || '').toString().replace(/[^a-zA-Z0-9-_]/g, '_');
    const filename = `${timestamp}-${turmaLabel}_${sigla || 'sem_sigla'}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
});
router.post('/:id/import-csv', async (req, res) => {
    const id = Number(req.params.id);
    const csv = req.body && req.body.csv;
    if (!id)
        return res.status(400).json({ message: 'Turma inválida' });
    if (!csv || typeof csv !== 'string')
        return res.status(400).json({ message: 'CSV é obrigatório' });
    const db = await (0, db_1.getDb)();
    const turma = await db.get('SELECT * FROM turmas WHERE id = ?', id);
    if (!turma)
        return res.status(404).json({ message: 'Turma não encontrada' });
    const lines = csv.split(/\r?\n/);
    let inserted = 0;
    let skipped = 0;
    let errors = 0;
    for (const raw of lines) {
        const line = raw.trim();
        if (!line)
            continue;
        const cols = line.split(/[,;\t]/).map(c => c.trim());
        const matricula = cols[0];
        const nome = cols[1];
        if (!matricula || !nome) {
            errors++;
            continue;
        }
        try {
            const existing = await db.get('SELECT id FROM alunos WHERE matricula = ?', matricula);
            if (existing) {
                skipped++;
                continue;
            }
            const now = new Date().toISOString();
            await db.run('INSERT INTO alunos (matricula, nome, id_turma, criado_em, atualizado_em) VALUES (?, ?, ?, ?, ?)', matricula, nome, id, now, now);
            inserted++;
        }
        catch (err) {
            console.error('Erro importando linha:', line, err);
            errors++;
        }
    }
    res.json({ message: 'Importação finalizada', inserted, skipped, errors });
});
router.post('/:id/import-json', async (req, res) => {
    const id = Number(req.params.id);
    const payload = req.body && req.body.data;
    if (!id)
        return res.status(400).json({ message: 'Turma inválida' });
    if (!payload)
        return res.status(400).json({ message: 'JSON data é obrigatório no campo "data"' });
    const db = await (0, db_1.getDb)();
    const turma = await db.get('SELECT * FROM turmas WHERE id = ?', id);
    if (!turma)
        return res.status(404).json({ message: 'Turma não encontrada' });
    let items = [];
    if (Array.isArray(payload)) {
        items = payload;
    }
    else {
        return res.status(400).json({ message: 'Formato inválido: espere um array' });
    }
    let inserted = 0, skipped = 0, errors = 0;
    for (const it of items) {
        try {
            let matricula;
            let nome;
            if (Array.isArray(it)) {
                matricula = it[0];
                nome = it[1];
            }
            else if (typeof it === 'object' && it != null) {
                matricula = it.matricula || it.id || it.ra || it.matricula_id;
                nome = it.nome || it.nome_completo || it.name;
            }
            if (!matricula || !nome) {
                errors++;
                continue;
            }
            const existing = await db.get('SELECT id FROM alunos WHERE matricula = ?', matricula);
            if (existing) {
                skipped++;
                continue;
            }
            const now = new Date().toISOString();
            await db.run('INSERT INTO alunos (matricula, nome, id_turma, criado_em, atualizado_em) VALUES (?, ?, ?, ?, ?)', matricula, nome, id, now, now);
            inserted++;
        }
        catch (err) {
            console.error('Erro import JSON item', it, err);
            errors++;
        }
    }
    res.json({ message: 'Importação JSON finalizada', inserted, skipped, errors });
});
router.post('/', async (req, res) => {
    const { disciplina_id, codigo, periodo } = req.body;
    if (!disciplina_id)
        return res.status(400).json({ message: 'disciplina_id é obrigatório' });
    const db = await (0, db_1.getDb)();
    const disc = await db.get('SELECT id FROM disciplinas WHERE id = ?', disciplina_id);
    if (!disc)
        return res.status(400).json({ message: 'Disciplina inválida' });
    const now = new Date().toISOString();
    const result = await db.run('INSERT INTO turmas (disciplina_id, codigo, periodo, criado_em, atualizado_em) VALUES (?, ?, ?, ?, ?)', disciplina_id, codigo || null, periodo || null, now, now);
    const id = result.lastID;
    const row = await db.get('SELECT * FROM turmas WHERE id = ?', id);
    res.status(201).json(row);
});
router.put('/:id', async (req, res) => {
    const id = Number(req.params.id);
    const { disciplina_id, codigo, periodo } = req.body;
    const db = await (0, db_1.getDb)();
    const existing = await db.get('SELECT * FROM turmas WHERE id = ?', id);
    if (!existing)
        return res.status(404).json({ message: 'Turma não encontrada' });
    if (disciplina_id) {
        const disc = await db.get('SELECT id FROM disciplinas WHERE id = ?', disciplina_id);
        if (!disc)
            return res.status(400).json({ message: 'Disciplina inválida' });
    }
    const atualizado_em = new Date().toISOString();
    await db.run('UPDATE turmas SET disciplina_id = ?, codigo = ?, periodo = ?, atualizado_em = ? WHERE id = ?', disciplina_id || existing.disciplina_id, codigo || existing.codigo, periodo || existing.periodo, atualizado_em, id);
    const row = await db.get('SELECT * FROM turmas WHERE id = ?', id);
    res.json(row);
});
router.delete('/:id', async (req, res) => {
    const id = Number(req.params.id);
    const db = await (0, db_1.getDb)();
    await db.run('DELETE FROM turmas WHERE id = ?', id);
    res.json({ message: 'Turma excluída' });
});
exports.default = router;
