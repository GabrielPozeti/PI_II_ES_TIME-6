"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDb = getDb;
exports.findByEmail = findByEmail;
exports.findById = findById;
exports.createDocente = createDocente;
exports.updateDocente = updateDocente;
const fs_1 = __importDefault(require("fs"));
const sqlite3_1 = __importDefault(require("sqlite3"));
const sqlite_1 = require("sqlite");
const path_1 = __importDefault(require("path"));
const dataDir = path_1.default.resolve(__dirname, '..', 'data');
if (!fs_1.default.existsSync(dataDir))
    fs_1.default.mkdirSync(dataDir, { recursive: true });
const dbFile = path_1.default.resolve(dataDir, 'docentes.sqlite');
let _db = null;
async function getDb() {
    if (_db)
        return _db;
    _db = await (0, sqlite_1.open)({ filename: dbFile, driver: sqlite3_1.default.Database });
    await _db.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS docentes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      telefone TEXT,
      senha_hash TEXT NOT NULL,
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
      atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS instituicoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      sigla TEXT,
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
      atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS disciplinas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      codigo TEXT,
      instituicao_id INTEGER NOT NULL,
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
      atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(instituicao_id) REFERENCES instituicoes(id) ON DELETE RESTRICT
    );
    CREATE TABLE IF NOT EXISTS turmas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      disciplina_id INTEGER NOT NULL,
      codigo TEXT,
      periodo TEXT,
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
      atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(disciplina_id) REFERENCES disciplinas(id) ON DELETE RESTRICT
    );
    CREATE TABLE IF NOT EXISTS componentes_nota (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      sigla TEXT,
      descricao TEXT,
      disciplina_id INTEGER NOT NULL,
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
      atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(disciplina_id) REFERENCES disciplinas(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      aluno_id INTEGER NOT NULL,
      componente_id INTEGER NOT NULL,
      valor REAL NOT NULL CHECK (valor >= 0.0 AND valor <= 10.0),
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
      atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(aluno_id) REFERENCES alunos(id) ON DELETE CASCADE,
      FOREIGN KEY(componente_id) REFERENCES componentes_nota(id) ON DELETE CASCADE,
      UNIQUE(aluno_id, componente_id)
    );

    CREATE TABLE IF NOT EXISTS auditoria_notas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      aluno_id INTEGER NOT NULL,
      componente_id INTEGER NOT NULL,
      valor_antigo REAL,
      valor_novo REAL,
      data_hora DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(aluno_id) REFERENCES alunos(id) ON DELETE CASCADE,
      FOREIGN KEY(componente_id) REFERENCES componentes_nota(id) ON DELETE CASCADE
    );

    CREATE TRIGGER IF NOT EXISTS trg_notas_insert AFTER INSERT ON notas
    BEGIN
      INSERT INTO auditoria_notas (aluno_id, componente_id, valor_antigo, valor_novo, data_hora)
      VALUES (NEW.aluno_id, NEW.componente_id, NULL, NEW.valor, datetime('now'));
    END;

    CREATE TRIGGER IF NOT EXISTS trg_notas_update AFTER UPDATE ON notas
    BEGIN
      INSERT INTO auditoria_notas (aluno_id, componente_id, valor_antigo, valor_novo, data_hora)
      VALUES (OLD.aluno_id, OLD.componente_id, OLD.valor, NEW.valor, datetime('now'));
    END;
  `);
    return _db;
}
async function findByEmail(email) {
    const db = await getDb();
    const row = await db.get('SELECT * FROM docentes WHERE lower(email)=lower(?)', email);
    return row || undefined;
}
async function findById(id) {
    const db = await getDb();
    const row = await db.get('SELECT * FROM docentes WHERE id = ?', id);
    return row || undefined;
}
async function createDocente(data) {
    const db = await getDb();
    const now = new Date().toISOString();
    const result = await db.run('INSERT INTO docentes (nome, email, telefone, senha_hash, criado_em, atualizado_em) VALUES (?, ?, ?, ?, ?, ?)', data.nome, data.email, data.telefone || null, data.senha_hash, now, now);
    const id = result.lastID;
    const row = await findById(id);
    if (!row)
        throw new Error('Failed to create docente');
    return row;
}
async function updateDocente(id, patch) {
    const db = await getDb();
    const existing = await findById(id);
    if (!existing)
        return undefined;
    const updated = { ...existing, ...patch, atualizado_em: new Date().toISOString() };
    await db.run('UPDATE docentes SET nome = ?, email = ?, telefone = ?, senha_hash = ?, atualizado_em = ? WHERE id = ?', updated.nome, updated.email, updated.telefone, updated.senha_hash, updated.atualizado_em, id);
    return await findById(id);
}
