# PI_II_ES_TIME-6
Projeto Integrador 2 - Pontifícia Universidade Católica de Campinas
 
**Descrição**

O Sistema NotaDez se trata de um sistema para gestão de turmas, alunos, componentes de nota e lançamento de notas por docentes. Possui:

- API em Node.js/Express (TypeScript) que serve rotas para criação/edição/exclusão de instituições, disciplinas, turmas, docentes, alunos e notas.
- Persistência em PostgreSQL.
- Auditoria de notas via triggers no banco de dados (registro de inserções e atualizações de notas em `auditoria_notas`).
- Exportação de quadro de notas para CSV e importação básica de alunos via CSV/JSON.

**Equipe**

1. Gabriel Henrique Pozeti de Faria - R.A: 25022716
2. Marina Hehnes Espósito - R.A: 25000937
3. Lara Brondi Fraccaroli - R.A: 25001358
4. Ana Beatriz da Silva - R.A: 25007143 
5. Maria Eduarda Perez Mostaro Campos - R.A: 25000131

**Estrutura do repositório (resumo)**

- `src/`: código-fonte TypeScript do servidor (rotas, utils, inicialização do DB)
- `public/`: frontend estático (HTML/JS/CSS)
- `sql/`: scripts SQL para PostgreSQL (criação de tabelas, triggers, alterações)
- `dist/`: build gerado (JS transpilado)

**Requisitos**

- Node.js 18+ (ou versão compatível com dependências)
- npm
- PostgreSQL

**Variáveis de ambiente**

Defina as variáveis de ambiente antes de executar a aplicação. Exemplo mais importante:

- `DATABASE_URL`: string de conexão PostgreSQL, ex: `postgresql://user:password@localhost:5432/nome_db`

Outras variáveis (opcionais):

- `.env` pode ser usado com o pacote `dotenv` (já incluído). Crie um arquivo `.env` na raiz e adicione `DATABASE_URL`.

**Instalação e execução (desenvolvimento)**

1. Instale dependências:

```
npm install
```

2. Para executar em modo desenvolvimento com restart automático (recomendado):

PowerShell:
```
$env:DATABASE_URL = 'postgresql://user:pass@localhost:5432/dbname'
npm run start:dev
```

Ou em Unix shell:
```
export DATABASE_URL='postgresql://user:pass@localhost:5432/dbname'
npm run start:dev
```

3. Para build e execução em produção (pré-requisito: `tsc`/build):

```
npm run build
$env:DATABASE_URL = 'postgresql://user:pass@localhost:5432/dbname'
npm start
```

Observação: se `DATABASE_URL` apontar para um Postgres vazio, a aplicação executa `initSchema()` e cria as tabelas e triggers definidas em `src/db.ts`.

**Endpoints importantes**

- `PUT /notas/` : rota que atualiza/inserta notas em lote; usa `INSERT ... ON CONFLICT ... DO UPDATE`. Trigger de auditoria grava logs na tabela `auditoria_notas` automaticamente.
- `GET /turmas/:id/exportar` : gera e envia CSV com quadro de notas da turma (retorna 400 se existirem notas em branco).
- `POST /turmas/:id/import-csv` : importa alunos a partir de CSV passado no corpo `{ csv: "..." }`.
- `GET /auditoria` : rotas para recuperar registros de auditoria (veja `src/routes/auditoria.ts`).

Veja `src/routes` para a lista completa de rotas.

**Como testar a exportação CSV rapidamente**

1. Garanta que existam turmas, componentes e notas preenchidas (pelo frontend ou via chamadas HTTP).
2. Pelo browser: acesse `http://localhost:PORT/turmas/ID/exportar` (o front-end já tem botões "Exportar CSV" em `public/scripts/gestao.js` e `public/scripts/turmas.js`).
3. Usando PowerShell (exemplo):

```
Invoke-WebRequest -Uri "http://localhost:3000/turmas/1/exportar" -OutFile "turma_1.csv" -UseBasicParsing
```

4. Usando curl:

```
curl -o turma_1.csv "http://localhost:3000/turmas/1/exportar"
```

Observação: O backend valida se há notas em branco e retornará erro 400 listando `missingCount` se houver lacunas.

**Auditoria de notas (triggers)**

- O requisito de auditoria está implementado: quando uma nota é criada (INSERT) ou atualizada (UPDATE), a trigger correspondente insere um registro em `auditoria_notas` contendo `aluno_id`, `componente_id`, `valor_antigo`, `valor_novo` e `data_hora`.
- As triggers são definidas nos scripts SQL em `sql/create_auditoria_notas.sql` (SQLite) e em `sql/postgres/create_tables_postgres.sql` (Postgres), além de serem criadas programaticamente por `src/db.ts` na inicialização.

**Importação de alunos (CSV/JSON)**

- Pelo frontend há opções de importar alunos via CSV (duas colunas: matricula, nome) em `public/scripts/gestao.js` e `public/scripts/turmas.js`.
- Também é possível enviar JSON para `POST /turmas/:id/import-json` com um array de objetos ou arrays.

**Dicas de implantação em ambiente de testes**

1. Provisionar um banco PostgreSQL (local ou em container). Ex.: usando Docker:

```
docker run --name pi2-postgres -e POSTGRES_USER=pi2 -e POSTGRES_PASSWORD=pi2 -e POSTGRES_DB=pi2_db -p 5432:5432 -d postgres:15
```

2. Configure `DATABASE_URL`:

PowerShell:
```
$env:DATABASE_URL = 'postgresql://pi2:pi2@localhost:5432/pi2_db'
npm run start:dev
```
