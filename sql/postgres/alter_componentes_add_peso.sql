--Feito por Marina Hehnes Espósito

-- Adiciona coluna 'peso' em componentes_nota (Postgres)
ALTER TABLE componentes_nota ADD COLUMN IF NOT EXISTS peso REAL DEFAULT 1.0;
