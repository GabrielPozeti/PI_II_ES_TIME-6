import fs from 'fs';
import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';

const dataDir = path.resolve(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
const dbFile = path.resolve(dataDir, 'docentes.sqlite');

let _db: Database<sqlite3.Database, sqlite3.Statement> | null = null;

export async function getDb() {
  if (_db) return _db;
  _db = await open({ filename: dbFile, driver: sqlite3.Database });
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
    CREATE TABLE IF NOT EXISTS alunos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      matricula TEXT NOT NULL UNIQUE,
      nome TEXT NOT NULL,
      id_turma INTEGER NOT NULL,
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
      atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(id_turma) REFERENCES turmas(id) ON DELETE RESTRICT
    );
    CREATE TABLE IF NOT EXISTS componentes_nota (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      sigla TEXT,
      descricao TEXT,
      disciplina_id INTEGER NOT NULL,
      peso REAL DEFAULT 1.0,
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

export type Docente = {
  id: number;
  nome: string;
  email: string;
  telefone?: string | null;
  senha_hash: string;
  criado_em: string;
  atualizado_em: string;
};

export async function findByEmail(email: string): Promise<Docente | undefined> {
  const db = await getDb();
  const row = await db.get<Docente>('SELECT * FROM docentes WHERE lower(email)=lower(?)', email);
  return row || undefined;
}

export async function findById(id: number): Promise<Docente | undefined> {
  const db = await getDb();
  const row = await db.get<Docente>('SELECT * FROM docentes WHERE id = ?', id);
  return row || undefined;
}

export async function createDocente(data: { nome: string; email: string; telefone?: string | null; senha_hash: string }): Promise<Docente> {
  const db = await getDb();
  const now = new Date().toISOString();
  const result = await db.run(
    'INSERT INTO docentes (nome, email, telefone, senha_hash, criado_em, atualizado_em) VALUES (?, ?, ?, ?, ?, ?)',
    data.nome, data.email, data.telefone || null, data.senha_hash, now, now
  );
  const id = result.lastID as number;
  const row = await findById(id);
  if (!row) throw new Error('Failed to create docente');
  return row;
}

export async function updateDocente(id: number, patch: Partial<Docente>): Promise<Docente | undefined> {
  const db = await getDb();
  const existing = await findById(id);
  if (!existing) return undefined;
  const updated = { ...existing, ...patch, atualizado_em: new Date().toISOString() } as Docente;
  await db.run('UPDATE docentes SET nome = ?, email = ?, telefone = ?, senha_hash = ?, atualizado_em = ? WHERE id = ?',
    updated.nome, updated.email, updated.telefone, updated.senha_hash, updated.atualizado_em, id);
  return await findById(id);
}


