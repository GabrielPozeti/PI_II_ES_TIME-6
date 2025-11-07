import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';

const dbFile = path.resolve(__dirname, '..', 'data', 'docentes.sqlite');

let _db: Database<sqlite3.Database, sqlite3.Statement> | null = null;

async function getDb() {
  if (_db) return _db;
  _db = await open({ filename: dbFile, driver: sqlite3.Database });
  await _db.exec(`
    CREATE TABLE IF NOT EXISTS docentes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      telefone TEXT,
      senha_hash TEXT NOT NULL,
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
      atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP
    );
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


