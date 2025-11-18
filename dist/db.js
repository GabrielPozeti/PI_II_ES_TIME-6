"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPool = getPool;
exports.findByEmail = findByEmail;
exports.findById = findById;
exports.createDocente = createDocente;
exports.updateDocente = updateDocente;
exports.findInstituicaoByNome = findInstituicaoByNome;
exports.createInstituicao = createInstituicao;
exports.getDb = getDb;
const dotenv_1 = __importDefault(require("dotenv"));
const pg_1 = require("pg");
dotenv_1.default.config();
const pool = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
let initialized = false;
async function initSchema() {
    if (initialized)
        return;
    // Cria as tabelas principais compatíveis com PostgreSQL
    await pool.query(`
    CREATE TABLE IF NOT EXISTS instituicoes (
      id SERIAL PRIMARY KEY,
      nome TEXT NOT NULL,
      sigla TEXT,
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS disciplinas (
      id SERIAL PRIMARY KEY,
      nome TEXT NOT NULL,
      codigo TEXT,
      periodo INTEGER,
      instituicao_id INTEGER NOT NULL REFERENCES instituicoes(id) ON DELETE RESTRICT,
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS turmas (
      id SERIAL PRIMARY KEY,
      disciplina_id INTEGER NOT NULL REFERENCES disciplinas(id) ON DELETE RESTRICT,
      codigo TEXT,
      periodo TEXT,
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS alunos (
      id SERIAL PRIMARY KEY,
      matricula TEXT NOT NULL UNIQUE,
      nome TEXT NOT NULL,
      id_turma INTEGER NOT NULL REFERENCES turmas(id) ON DELETE RESTRICT,
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      nota_final REAL
    );

    CREATE TABLE IF NOT EXISTS docentes (
      id SERIAL PRIMARY KEY,
      nome TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      telefone TEXT,
      senha_hash TEXT NOT NULL,
      curso TEXT,
      id_instituicao INTEGER REFERENCES instituicoes(id),
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS componentes_nota (
      id SERIAL PRIMARY KEY,
      nome TEXT NOT NULL,
      sigla TEXT,
      descricao TEXT,
      disciplina_id INTEGER NOT NULL REFERENCES disciplinas(id) ON DELETE CASCADE,
      peso REAL DEFAULT 1.0,
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS notas (
      id SERIAL PRIMARY KEY,
      aluno_id INTEGER NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
      componente_id INTEGER NOT NULL REFERENCES componentes_nota(id) ON DELETE CASCADE,
      valor REAL NOT NULL CHECK (valor >= 0.0 AND valor <= 10.0),
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(aluno_id, componente_id)
    );

    CREATE TABLE IF NOT EXISTS auditoria_notas (
      id SERIAL PRIMARY KEY,
      aluno_id INTEGER NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
      componente_id INTEGER NOT NULL REFERENCES componentes_nota(id) ON DELETE CASCADE,
      valor_antigo REAL,
      valor_novo REAL,
      data_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
    // Função e triggers para auditoria (INSERT)
    await pool.query(`
    CREATE OR REPLACE FUNCTION trg_notas_insert_fn() RETURNS trigger AS $$
    BEGIN
      INSERT INTO auditoria_notas (aluno_id, componente_id, valor_antigo, valor_novo, data_hora)
      VALUES (NEW.aluno_id, NEW.componente_id, NULL, NEW.valor, CURRENT_TIMESTAMP);
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER trg_notas_insert
    AFTER INSERT ON notas
    FOR EACH ROW
    EXECUTE FUNCTION trg_notas_insert_fn();
  `);
    // Função e trigger para auditoria (UPDATE)
    await pool.query(`
    CREATE OR REPLACE FUNCTION trg_notas_update_fn() RETURNS trigger AS $$
    BEGIN
      INSERT INTO auditoria_notas (aluno_id, componente_id, valor_antigo, valor_novo, data_hora)
      VALUES (OLD.aluno_id, OLD.componente_id, OLD.valor, NEW.valor, CURRENT_TIMESTAMP);
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER trg_notas_update
    AFTER UPDATE ON notas
    FOR EACH ROW
    EXECUTE FUNCTION trg_notas_update_fn();
  `);
    initialized = true;
}
async function getPool() {
    await initSchema();
    return pool;
}
async function findByEmail(email) {
    const { rows } = await pool.query("SELECT * FROM docentes WHERE lower(email)=lower($1) LIMIT 1", [email]);
    return rows[0] || undefined;
}
async function findById(id) {
    const { rows } = await pool.query("SELECT * FROM docentes WHERE id = $1", [id]);
    return rows[0] || undefined;
}
async function createDocente(data) {
    const now = new Date();
    const { rows } = await pool.query(`INSERT INTO docentes (nome, email, telefone, senha_hash, criado_em, atualizado_em, curso, id_instituicao)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`, [data.nome, data.email, data.telefone || null, data.senha_hash, now, now, null, null]);
    if (!rows[0])
        throw new Error("Failed to create docente");
    return rows[0];
}
async function updateDocente(id, patch) {
    const existing = await findById(id);
    if (!existing)
        return undefined;
    const updated = {
        ...existing,
        ...patch,
        atualizado_em: new Date().toISOString(),
    };
    await pool.query("UPDATE docentes SET nome = $1, email = $2, telefone = $3, senha_hash = $4, atualizado_em = $5, curso = $6, id_instituicao = $7 WHERE id = $8", [
        updated.nome,
        updated.email,
        updated.telefone,
        updated.senha_hash,
        updated.atualizado_em,
        updated.curso,
        updated.id_instituicao,
        id,
    ]);
    return await findById(id);
}
async function findInstituicaoByNome(nome) {
    const { rows } = await pool.query("SELECT * FROM instituicoes WHERE lower(nome)=lower($1) LIMIT 1", [nome]);
    return rows[0] || undefined;
}
async function createInstituicao(data) {
    const now = new Date();
    const { rows } = await pool.query("INSERT INTO instituicoes (nome, sigla, criado_em, atualizado_em) VALUES ($1, $2, $3, $4) RETURNING *", [data.nome, data.sigla || null, now, now]);
    if (!rows[0])
        throw new Error("Failed to create instituicao");
    return rows[0];
}
// Compat layer para manter API semelhante ao sqlite usado nas rotas
function convertPlaceholders(sql) {
    let i = 0;
    return sql.replace(/\?/g, () => {
        i += 1;
        return `$${i}`;
    });
}
async function getDb() {
    await initSchema();
    return {
        all: async (sql, ...params) => {
            const q = convertPlaceholders(sql);
            const res = await pool.query(q, params);
            return res.rows;
        },
        get: async (sql, ...params) => {
            const q = convertPlaceholders(sql);
            const res = await pool.query(q, params);
            return res.rows[0] || undefined;
        },
        run: async (sql, ...params) => {
            // Se for INSERT sem RETURNING, adiciona RETURNING id para compatibilidade
            const isInsert = /^\s*INSERT\s+/i.test(sql);
            let q = sql;
            if (isInsert && !/RETURNING\s+/i.test(sql)) {
                q = `${sql} RETURNING id`;
            }
            const qConverted = convertPlaceholders(q);
            const res = await pool.query(qConverted, params);
            if (isInsert) {
                return { lastID: res.rows[0] ? res.rows[0].id : undefined };
            }
            return { changes: res.rowCount };
        },
    };
}
