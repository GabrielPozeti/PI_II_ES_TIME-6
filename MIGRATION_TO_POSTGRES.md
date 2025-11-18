Migração para PostgreSQL

Passos para migrar o projeto para usar PostgreSQL:

1) Instale dependências
   No PowerShell, execute:

```powershell
npm install
```

(Isso instalará `pg` que foi adicionado em `package.json`.)

2) Configurar variáveis de ambiente
   Crie um arquivo `.env` na raiz com a string de conexão do Postgres:

```text
DATABASE_URL=postgres://usuario:senha@localhost:5432/nome_do_banco
```

Ou configure as variáveis padrão do Postgres (`PGHOST`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`, `PGPORT`).

3) Criar o esquema no banco
   Com o banco PostgreSQL rodando e `DATABASE_URL` configurado, rode:

```powershell
psql $env:DATABASE_URL -f sql/postgres/create_tables_postgres.sql
```

Se preferir usar `psql` com parâmetros:

```powershell
psql -h localhost -U usuario -d nome_do_banco -f sql/postgres/create_tables_postgres.sql
```

4) Aplicar alterações adicionais (opcional)
   Os scripts para `ALTER TABLE` (se necessários) estão em `sql/postgres/`:

- `alter_componentes_add_peso.sql`
- `alter_disciplinas_add_formula.sql`
- `alter_alunos_add_nota_final.sql`

Rode-os com `psql -f` caso precise.

5) Migrar dados existentes (SQLite -> Postgres)
   Se você tiver dados no SQLite e quiser migrá-los:

- Exportar cada tabela como CSV do SQLite.
- Criar as tabelas no Postgres (passo 3).
- Importar CSVs com `COPY` ou `
\copy` do `psql`.

Exemplo export do SQLite (PowerShell):

```powershell
# Usando sqlite3 para exportar
sqlite3 data/docentes.sqlite ".headers on" ".mode csv" "SELECT * FROM docentes;" > docentes.csv
```

Exemplo import no Postgres:

```powershell
\copy docentes FROM 'C:/caminho/para/docentes.csv' CSV HEADER;
```

6) Rodar aplicação

```powershell
npm run build
npm start
```

Observações:
- O arquivo `src/db.ts` foi convertido para usar `pg` e inicializar o schema automaticamente no primeiro `getPool()`.
- As triggers e funções de auditoria já foram convertidas para PL/pgSQL.

Se quiser, posso:
- Gerar scripts para exportar os dados do SQLite e importá-los automaticamente.
- Ajustar outras funções do código caso encontremos código que dependa de APIs específicas do `sqlite`.
