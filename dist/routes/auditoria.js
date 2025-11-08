"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const db_1 = require("../db");
const router = express_1.default.Router();
router.get('/:turmaId', async (req, res) => {
    const turmaId = Number(req.params.turmaId);
    if (!turmaId)
        return res.status(400).json({ message: 'turmaId inválido' });
    const db = await (0, db_1.getDb)();
    const rows = await db.all(`SELECT an.id as log_id, an.aluno_id, an.componente_id, an.valor_antigo, an.valor_novo, an.data_hora,
            a.nome as aluno_nome, a.matricula as aluno_matricula,
            c.nome as componente_nome, c.sigla as componente_sigla,
            t.id as turma_id, t.codigo as turma_codigo
     FROM auditoria_notas an
     JOIN alunos a ON an.aluno_id = a.id
     JOIN turmas t ON a.id_turma = t.id
     JOIN componentes_nota c ON an.componente_id = c.id
     WHERE t.id = ?
     ORDER BY an.data_hora DESC`, turmaId);
    res.json(rows);
});
exports.default = router;
