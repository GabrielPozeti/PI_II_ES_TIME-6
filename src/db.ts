import { Client } from "pg";

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

let _connected = false;

export async function connect() {
  if (_connected) return;
  await client.connect();
  _connected = true;
}

export async function initSchema() {
  await connect();

  await client.query(`
    CREATE TABLE IF NOT EXISTS instituicoes (
      id SERIAL PRIMARY KEY,
      nome TEXT NOT NULL,
      sigla TEXT,
      criado_em TIMESTAMP DEFAULT NOW(),
      atualizado_em TIMESTAMP DEFAULT NOW()
    );
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS docentes (
      id SERIAL PRIMARY KEY,
      nome TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      telefone TEXT,
      senha_hash TEXT NOT NULL,
      curso TEXT,
      id_instituicao INTEGER REFERENCES instituicoes(id),
      criado_em TIMESTAMP DEFAULT NOW(),
      atualizado_em TIMESTAMP DEFAULT NOW()
    );
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS disciplinas (
      id SERIAL PRIMARY KEY,
      nome TEXT NOT NULL,
      codigo TEXT,
      periodo INTEGER,
      instituicao_id INTEGER REFERENCES instituicoes(id),
      criado_em TIMESTAMP DEFAULT NOW(),
      atualizado_em TIMESTAMP DEFAULT NOW()
    );
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS turmas (
      id SERIAL PRIMARY KEY,
      disciplina_id INTEGER REFERENCES disciplinas(id),
      codigo TEXT,
      periodo TEXT,
      criado_em TIMESTAMP DEFAULT NOW(),
      atualizado_em TIMESTAMP DEFAULT NOW()
    );
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS componentes_nota (
      id SERIAL PRIMARY KEY,
      nome TEXT NOT NULL,
      sigla TEXT,
      descricao TEXT,
      disciplina_id INTEGER REFERENCES disciplinas(id),
      peso NUMERIC(5,2) DEFAULT 1.00,
      criado_em TIMESTAMP DEFAULT NOW(),
      atualizado_em TIMESTAMP DEFAULT NOW()
    );
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS alunos (
      id SERIAL PRIMARY KEY,
      matricula TEXT NOT NULL UNIQUE,
      nome TEXT NOT NULL,
      id_turma INTEGER REFERENCES turmas(id),
      criado_em TIMESTAMP DEFAULT NOW(),
      atualizado_em TIMESTAMP DEFAULT NOW()
    );
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS notas (
      id SERIAL PRIMARY KEY,
      aluno_id INTEGER REFERENCES alunos(id) ON DELETE CASCADE,
      componente_id INTEGER REFERENCES componentes_nota(id) ON DELETE CASCADE,
      valor NUMERIC(5,2) NOT NULL,
      criado_em TIMESTAMP DEFAULT NOW(),
      atualizado_em TIMESTAMP DEFAULT NOW(),
      UNIQUE (aluno_id, componente_id)
    );
  `);

  await client.query(`
  CREATE TABLE IF NOT EXISTS auditoria_notas (
    id SERIAL PRIMARY KEY,
    aluno_id INTEGER NOT NULL REFERENCES alunos(id),
    componente_id INTEGER NOT NULL REFERENCES componentes_nota(id),
    valor_antigo NUMERIC(5,2),
    valor_novo NUMERIC(5,2),
    mensagem TEXT,
    criado_em TIMESTAMP DEFAULT NOW()
  );
`);

  await client.query(`
    CREATE OR REPLACE FUNCTION trg_notas_insert_func()
    RETURNS TRIGGER AS $$
    BEGIN
      INSERT INTO auditoria_notas (aluno_id, componente_id, valor_antigo, valor_novo)
      VALUES (NEW.aluno_id, NEW.componente_id, NULL, NEW.valor);
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await client.query(`
    CREATE OR REPLACE FUNCTION trg_notas_update_func()
    RETURNS TRIGGER AS $$
    BEGIN
      INSERT INTO auditoria_notas (aluno_id, componente_id, valor_antigo, valor_novo)
      VALUES (OLD.aluno_id, OLD.componente_id, OLD.valor, NEW.valor);
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await client.query(`
    DROP TRIGGER IF EXISTS trg_notas_insert ON notas;
  `);

  await client.query(`
    CREATE TRIGGER trg_notas_insert
    AFTER INSERT ON notas
    FOR EACH ROW
    EXECUTE FUNCTION trg_notas_insert_func();
  `);

  await client.query(`
    DROP TRIGGER IF EXISTS trg_notas_update ON notas;
  `);

  await client.query(`
    CREATE TRIGGER trg_notas_update
    AFTER UPDATE ON notas
    FOR EACH ROW
    EXECUTE FUNCTION trg_notas_update_func();
  `);
}

/**
 * Compatibility wrapper for route code to use db() API
 */
export async function db() {
  await connect();

  return {
    async get(sql: string, params: any[] = []) {
      const res = await client.query(sql, params);
      return res.rows && res.rows.length ? res.rows[0] : undefined;
    },

    async all(sql: string, params: any[] = []) {
      const res = await client.query(sql, params);
      return res.rows || [];
    },

    async run(sql: string, params: any[] = []) {
      const isInsert = /^\s*insert/i.test(sql);
      let q = sql;
      if (isInsert && !/returning\s+/i.test(q)) q += " RETURNING id";
      const res = await client.query(q, params);
      if (isInsert)
        return { lastID: res.rows && res.rows[0] ? res.rows[0].id : undefined };
      return { changes: res.rowCount };
    },
  };
}

export async function getDb() {
  return await db();
}

export default client;
