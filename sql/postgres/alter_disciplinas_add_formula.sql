--Feito por Marina Hehnes Espósito

-- Adiciona coluna 'formula' em disciplinas (Postgres)
ALTER TABLE disciplinas ADD COLUMN IF NOT EXISTS formula TEXT;
