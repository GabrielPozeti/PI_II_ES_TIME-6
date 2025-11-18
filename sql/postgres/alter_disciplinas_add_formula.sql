-- Adiciona coluna 'formula' em disciplinas (Postgres)
ALTER TABLE disciplinas ADD COLUMN IF NOT EXISTS formula TEXT;
