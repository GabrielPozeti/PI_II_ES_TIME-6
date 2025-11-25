// Feito por Marina Hehnes Espósito

// Script de migração: SQLite -> PostgreSQL
// Uso: configurar DATABASE_URL no .env e rodar `node scripts/migrate_sqlite_to_postgres.js`

const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
require('dotenv').config();
const path = require('path');

const sqlitePath = path.resolve(__dirname, '..', 'data', 'docentes.sqlite');
const sqliteDb = new sqlite3.Database(sqlitePath);
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function allAsync(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function getAsync(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

async function run() {
  if (!process.env.DATABASE_URL) {
    console.error('Erro: configure DATABASE_URL no .env antes de rodar este script.');
    process.exit(1);
  }

  console.log('Conectando ao SQLite:', sqlitePath);
  console.log('Conectando ao Postgres via DATABASE_URL');

  const client = await pool.connect();
  try {
    // Mapas para guardar id antigo -> id novo
    const map = {
      instituicoes: new Map(),
      disciplinas: new Map(),
      turmas: new Map(),
      alunos: new Map(),
      docentes: new Map(),
      componentes_nota: new Map(),
    };

    // Helper para inserir e retornar id
    async function insertReturning(table, cols, values) {
      const colsList = cols.join(', ');
      const params = values.map((_, i) => `$${i + 1}`).join(', ');
      const q = `INSERT INTO ${table} (${colsList}) VALUES (${params}) RETURNING id`;
      const res = await client.query(q, values);
      return res.rows[0].id;
    }

    // 1) instituicoes
    try {
      const rows = await allAsync(sqliteDb, 'SELECT * FROM instituicoes');
      console.log(`instituicoes: ${rows.length} registro(s)`);
      for (const r of rows) {
        const id = await insertReturning('instituicoes', ['nome','sigla','criado_em','atualizado_em'], [r.nome, r.sigla || null, r.criado_em || null, r.atualizado_em || null]);
        map.instituicoes.set(r.id, id);
      }
    } catch (e) { console.warn('Aviso: tabela instituicoes não encontrada ou erro ->', e.message); }

    // 2) disciplinas
    try {
      const rows = await allAsync(sqliteDb, 'SELECT * FROM disciplinas');
      console.log(`disciplinas: ${rows.length} registro(s)`);
      for (const r of rows) {
        const instId = map.instituicoes.get(r.instituicao_id) || null;
        const id = await insertReturning('disciplinas', ['nome','codigo','periodo','instituicao_id','criado_em','atualizado_em'], [r.nome, r.codigo || null, r.periodo || null, instId, r.criado_em || null, r.atualizado_em || null]);
        map.disciplinas.set(r.id, id);
      }
    } catch (e) { console.warn('Aviso: tabela disciplinas não encontrada ou erro ->', e.message); }

    // 3) turmas
    try {
      const rows = await allAsync(sqliteDb, 'SELECT * FROM turmas');
      console.log(`turmas: ${rows.length} registro(s)`);
      for (const r of rows) {
        const discId = map.disciplinas.get(r.disciplina_id) || null;
        const id = await insertReturning('turmas', ['disciplina_id','codigo','periodo','criado_em','atualizado_em'], [discId, r.codigo || null, r.periodo || null, r.criado_em || null, r.atualizado_em || null]);
        map.turmas.set(r.id, id);
      }
    } catch (e) { console.warn('Aviso: tabela turmas não encontrada ou erro ->', e.message); }

    // 4) alunos
    try {
      const rows = await allAsync(sqliteDb, 'SELECT * FROM alunos');
      console.log(`alunos: ${rows.length} registro(s)`);
      for (const r of rows) {
        const turmaId = map.turmas.get(r.id_turma) || null;
        const id = await insertReturning('alunos', ['matricula','nome','id_turma','criado_em','atualizado_em','nota_final'], [r.matricula, r.nome, turmaId, r.criado_em || null, r.atualizado_em || null, r.nota_final || null]);
        map.alunos.set(r.id, id);
      }
    } catch (e) { console.warn('Aviso: tabela alunos não encontrada ou erro ->', e.message); }

    // 5) docentes
    try {
      const rows = await allAsync(sqliteDb, 'SELECT * FROM docentes');
      console.log(`docentes: ${rows.length} registro(s)`);
      for (const r of rows) {
        const instId = map.instituicoes.get(r.id_instituicao) || null;
        const id = await insertReturning('docentes', ['nome','email','telefone','senha_hash','curso','id_instituicao','criado_em','atualizado_em'], [r.nome, r.email, r.telefone || null, r.senha_hash, r.curso || null, instId, r.criado_em || null, r.atualizado_em || null]);
        map.docentes.set(r.id, id);
      }
    } catch (e) { console.warn('Aviso: tabela docentes não encontrada ou erro ->', e.message); }

    // 6) componentes_nota
    try {
      const rows = await allAsync(sqliteDb, 'SELECT * FROM componentes_nota');
      console.log(`componentes_nota: ${rows.length} registro(s)`);
      for (const r of rows) {
        const discId = map.disciplinas.get(r.disciplina_id) || null;
        const id = await insertReturning('componentes_nota', ['nome','sigla','descricao','disciplina_id','peso','criado_em','atualizado_em'], [r.nome, r.sigla || null, r.descricao || null, discId, r.peso || 1.0, r.criado_em || null, r.atualizado_em || null]);
        map.componentes_nota.set(r.id, id);
      }
    } catch (e) { console.warn('Aviso: tabela componentes_nota não encontrada ou erro ->', e.message); }

    // 7) notas
    try {
      const rows = await allAsync(sqliteDb, 'SELECT * FROM notas');
      console.log(`notas: ${rows.length} registro(s)`);
      for (const r of rows) {
        const alunoId = map.alunos.get(r.aluno_id) || null;
        const compId = map.componentes_nota.get(r.componente_id) || null;
        await insertReturning('notas', ['aluno_id','componente_id','valor','criado_em','atualizado_em'], [alunoId, compId, r.valor, r.criado_em || null, r.atualizado_em || null]);
      }
    } catch (e) { console.warn('Aviso: tabela notas não encontrada ou erro ->', e.message); }

    // 8) auditoria_notas
    try {
      const rows = await allAsync(sqliteDb, 'SELECT * FROM auditoria_notas');
      console.log(`auditoria_notas: ${rows.length} registro(s)`);
      for (const r of rows) {
        const alunoId = map.alunos.get(r.aluno_id) || null;
        const compId = map.componentes_nota.get(r.componente_id) || null;
        await insertReturning('auditoria_notas', ['aluno_id','componente_id','valor_antigo','valor_novo','data_hora'], [alunoId, compId, r.valor_antigo || null, r.valor_novo || null, r.data_hora || null]);
      }
    } catch (e) { console.warn('Aviso: tabela auditoria_notas não encontrada ou erro ->', e.message); }

    // Atualizar sequences
    const tables = ['instituicoes','disciplinas','turmas','alunos','docentes','componentes_nota','notas','auditoria_notas'];
    for (const t of tables) {
      try {
        await client.query(`SELECT setval(pg_get_serial_sequence($1, 'id'), COALESCE((SELECT MAX(id) FROM ${t}), 1), true)`, [t]);
      } catch (e) {
        console.warn('Aviso ao atualizar sequence em', t, e.message);
      }
    }

    console.log('Migração completada com sucesso.');
  } catch (err) {
    console.error('Erro durante a migração:', err);
  } finally {
    client.release();
    sqliteDb.close();
    await pool.end();
  }
}

run().catch(err => {
  console.error('Erro não tratado:', err);
  process.exit(1);
});
