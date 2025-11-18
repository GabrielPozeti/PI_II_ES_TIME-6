-- Adiciona coluna 'nota_final' em alunos (Postgres)
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS nota_final REAL;
