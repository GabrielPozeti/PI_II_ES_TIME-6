--Feito por Marina Hehnes Espósito

PRAGMA foreign_keys = ON;

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
