-- Schema PostgreSQL gerado a partir dos scripts SQLite

-- Tabelas principais
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

-- Funções e triggers para auditoria
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
