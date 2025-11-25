/*
  Arquivo: src/routes/turmas.ts
  Finalidade: Rotas para gerenciar turmas, import/export de alunos e geração de CSV.
  Observações: Valida existência de disciplinas e importa CSV/JSON.
*/
import express from "express";
import { db } from "../db";
import crypto from "crypto";
import { sendExclusaoTurmaEmail } from "../utils/email";

const router = express.Router();

router.get("/", async (req, res) => {
  const database = await db();
  const rows = await database.all(
    "SELECT t.*, d.nome as disciplina_nome FROM turmas t JOIN disciplinas d ON t.disciplina_id = d.id ORDER BY t.id"
  );
  res.json(rows);
});

router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const database = await db();
  const row = await database.get("SELECT * FROM turmas WHERE id = $1", [id]);
  if (!row) return res.status(404).json({ message: "Turma não encontrada" });
  res.json(row);
});

router.get("/:id/notas", async (req, res) => {
  const id = Number(req.params.id);
  const database = await db();
  const turma = await database.get("SELECT * FROM turmas WHERE id = $1", [id]);
  if (!turma) return res.status(404).json({ message: "Turma não encontrada" });
  const disciplinaId = (turma as any).disciplina_id;
  const componentes = await database.all(
    "SELECT * FROM componentes_nota WHERE disciplina_id = $1 ORDER BY id",
    [disciplinaId]
  );
  const alunos = await database.all(
    "SELECT id, matricula, nome FROM alunos WHERE id_turma = $1 ORDER BY nome",
    [id]
  );

  const compIds = componentes.map((c: any) => c.id);
  const notasRows = compIds.length
    ? await database.all(
        "SELECT aluno_id, componente_id, valor FROM notas WHERE componente_id IN (" +
          compIds.map((_, i) => `$${i + 1}`).join(",") +
          ")",
        compIds
      )
    : [];
  const notas: Record<string, number> = {};
  for (const n of notasRows as any[])
    notas[`${n.aluno_id}_${n.componente_id}`] = n.valor;

  res.json({ componentes, alunos, notas });
});

router.get("/:id/exportar", async (req, res) => {
  const id = Number(req.params.id);
  const database = await db();
  const turma = await database.get(
    "SELECT t.*, d.nome as disciplina_nome, d.codigo as disciplina_codigo FROM turmas t JOIN disciplinas d ON t.disciplina_id = d.id WHERE t.id = $1",
    [id]
  );
  if (!turma) return res.status(404).json({ message: "Turma não encontrada" });

  const disciplinaId = (turma as any).disciplina_id;
  const componentes = await database.all(
    "SELECT * FROM componentes_nota WHERE disciplina_id = $1 ORDER BY id",
    [disciplinaId]
  );
  const alunos = await database.all(
    "SELECT id, matricula, nome FROM alunos WHERE id_turma = $1 ORDER BY nome",
    [id]
  );

  const compIds = componentes.map((c: any) => c.id);
  const notasRows = compIds.length
    ? await database.all(
        "SELECT aluno_id, componente_id, valor FROM notas WHERE componente_id IN (" +
          compIds.map((_, i) => `$${i + 1}`).join(",") +
          ")",
        compIds
      )
    : [];
  const notasMap: Record<string, number> = {};
  for (const n of notasRows as any[])
    notasMap[`${n.aluno_id}_${n.componente_id}`] = n.valor;

  const missing: Array<{
    alunoId: number;
    alunoNome: string;
    componenteId: number;
    componenteNome: string;
  }> = [];
  for (const a of alunos as any[]) {
    for (const c of componentes as any[]) {
      const key = `${a.id}_${c.id}`;
      if (notasMap[key] == null)
        missing.push({
          alunoId: a.id,
          alunoNome: a.nome,
          componenteId: c.id,
          componenteNome: c.nome,
        });
    }
  }

  if (missing.length > 0) {
    return res.status(400).json({
      message:
        "Existem notas em branco. Complete todas as notas antes de exportar.",
      missingCount: missing.length,
    });
  }

  function escapeCsv(val: any) {
    if (val == null) return "";
    const s = String(val);
    if (
      s.includes('"') ||
      s.includes(",") ||
      s.includes("\n") ||
      s.includes("\r")
    )
      return '"' + s.replace(/\"/g, '""') + '"';
    return s;
  }

  const headerCols = [
    "Matricula",
    "Nome",
    ...componentes.map((c: any) => c.sigla || c.nome),
  ];
  const rows: string[] = [];
  rows.push(headerCols.map(escapeCsv).join(","));

  for (const a of alunos as any[]) {
    const cols: any[] = [];
    cols.push(a.matricula || "");
    cols.push(a.nome || "");
    for (const c of componentes as any[]) {
      const key = `${a.id}_${c.id}`;
      const v = notasMap[key];
      cols.push(
        typeof v === "number" ? v.toFixed(2) : v == null ? "" : String(v)
      );
    }
    rows.push(cols.map(escapeCsv).join(","));
  }

  const csv = rows.join("\r\n");

  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
    now.getDate()
  )}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const turmaLabel = `Turma${(turma as any).id}`;
  const sigla = (
    (turma as any).disciplina_codigo ||
    (turma as any).disciplina_nome ||
    ""
  )
    .toString()
    .replace(/[^a-zA-Z0-9-_]/g, "_");
  const filename = `${timestamp}-${turmaLabel}_${sigla || "sem_sigla"}.csv`;

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(csv);
});

router.post("/:id/import-csv", async (req, res) => {
  const id = Number(req.params.id);
  const csv: string = req.body && req.body.csv;
  if (!id) return res.status(400).json({ message: "Turma inválida" });
  if (!csv || typeof csv !== "string")
    return res.status(400).json({ message: "CSV é obrigatório" });
  const database = await db();
  const turma = await database.get("SELECT * FROM turmas WHERE id = $1", [id]);
  if (!turma) return res.status(404).json({ message: "Turma não encontrada" });

  const lines = csv.split(/\r?\n/);
  let inserted = 0;
  let skipped = 0;
  let errors = 0;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const cols = line.split(/[,;\t]/).map((c) => c.trim());
    const matricula = cols[0];
    const nome = cols[1];
    if (!matricula || !nome) {
      errors++;
      continue;
    }
    try {
      const existing = await database.get(
        "SELECT id FROM alunos WHERE matricula = $1",
        [matricula]
      );
      if (existing) {
        skipped++;
        continue;
      }
      const now = new Date().toISOString();
      await database.run(
        "INSERT INTO alunos (matricula, nome, id_turma, criado_em, atualizado_em) VALUES ($1, $2, $3, $4, $5)",
        [matricula, nome, id, now, now]
      );
      inserted++;
    } catch (err) {
      console.error("Erro importando linha:", line, err);
      errors++;
    }
  }
  res.json({ message: "Importação finalizada", inserted, skipped, errors });
});

router.post("/:id/import-json", async (req, res) => {
  const id = Number(req.params.id);
  const payload = req.body && req.body.data;
  if (!id) return res.status(400).json({ message: "Turma inválida" });
  if (!payload)
    return res
      .status(400)
      .json({ message: 'JSON data é obrigatório no campo "data"' });
  const database = await db();
  const turma = await database.get("SELECT * FROM turmas WHERE id = $1", [id]);
  if (!turma) return res.status(404).json({ message: "Turma não encontrada" });

  let items: any[] = [];
  if (Array.isArray(payload)) {
    items = payload;
  } else {
    return res
      .status(400)
      .json({ message: "Formato inválido: espere um array" });
  }

  let inserted = 0,
    skipped = 0,
    errors = 0;
  for (const it of items) {
    try {
      let matricula: string | undefined;
      let nome: string | undefined;
      if (Array.isArray(it)) {
        matricula = it[0];
        nome = it[1];
      } else if (typeof it === "object" && it != null) {
        matricula = it.matricula || it.id || it.ra || it.matricula_id;
        nome = it.nome || it.nome_completo || it.name;
      }
      if (!matricula || !nome) {
        errors++;
        continue;
      }
      const existing = await database.get(
        "SELECT id FROM alunos WHERE matricula = $1",
        [matricula]
      );
      if (existing) {
        skipped++;
        continue;
      }
      const now = new Date().toISOString();
      await database.run(
        "INSERT INTO alunos (matricula, nome, id_turma, criado_em, atualizado_em) VALUES ($1, $2, $3, $4, $5)",
        [matricula, nome, id, now, now]
      );
      inserted++;
    } catch (err) {
      console.error("Erro import JSON item", it, err);
      errors++;
    }
  }
  res.json({
    message: "Importação JSON finalizada",
    inserted,
    skipped,
    errors,
  });
});

router.post("/", async (req, res) => {
  const { disciplina_id, codigo, periodo } = req.body;
  console.log("body: ", { disciplina_id, codigo, periodo });

  if (!disciplina_id)
    return res.status(400).json({ message: "disciplina_id é obrigatório" });
  const database = await db();
  const disc = await database.get("SELECT id FROM disciplinas WHERE id = $1", [
    disciplina_id,
  ]);
  if (!disc) return res.status(400).json({ message: "Disciplina inválida" });
  const now = new Date().toISOString();
  const result = await database.run(
    "INSERT INTO turmas (disciplina_id, codigo, periodo, criado_em, atualizado_em) VALUES ($1, $2, $3, $4, $5)",
    [disciplina_id, codigo || null, periodo || null, now, now]
  );
  const id = result.lastID as number;
  const row = await database.get("SELECT * FROM turmas WHERE id = $1", [id]);
  res.status(201).json(row);
});

router.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { disciplina_id, codigo, periodo } = req.body;
  const database = await db();
  const existing = await database.get("SELECT * FROM turmas WHERE id = $1", [
    id,
  ]);
  if (!existing)
    return res.status(404).json({ message: "Turma não encontrada" });
  if (disciplina_id) {
    const disc = await database.get(
      "SELECT id FROM disciplinas WHERE id = $1",
      [disciplina_id]
    );
    if (!disc) return res.status(400).json({ message: "Disciplina inválida" });
  }
  const atualizado_em = new Date().toISOString();
  await database.run(
    "UPDATE turmas SET disciplina_id = $1, codigo = $2, periodo = $3, atualizado_em = $4 WHERE id = $5",
    [
      disciplina_id || (existing as any).disciplina_id,
      codigo || (existing as any).codigo,
      periodo || (existing as any).periodo,
      atualizado_em,
      id,
    ]
  );
  const row = await database.get("SELECT * FROM turmas WHERE id = $1", [id]);
  res.json(row);
});

router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const database = await db();
  await database.run("DELETE FROM turmas WHERE id = $1", [id]);
  res.json({ message: "Turma excluída" });
});

router.post("/solicitar-exclusao", async (req, res) => {
  const { email, id } = req.body;
  const database = await db();

  const turma = await database.get(
    "SELECT t.*, d.nome AS disciplina_nome, d.codigo AS disciplina_codigo FROM turmas t JOIN disciplinas d ON d.id = t.disciplina_id WHERE t.id = $1",
    [id]
  );
  if (!turma) return res.status(404).json({ message: "Turma não encontrada" });

  // Gerar token de exclusão
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(); //expira em 1 dia

  await database.run(
    "INSERT INTO turma_delete_tokens (turma_id, token, expires_at) VALUES ($1, $2, $3)",
    [id, token, expiresAt]
  );

  const link = `http://localhost:3000/exclusao_concluida.html?token=${token}`;

  // 📩 Enviar e-mail de confirmação usando EmailJS
  try {
    await sendExclusaoTurmaEmail(
      email,
      link,
      turma.disciplina_nome,
      turma.codigo || "Sem código",
      turma.periodo || "Sem período"
    );

    res.json({ message: "E-mail enviado para confirmação." });
  } catch (err) {
    console.error("Erro ao enviar e-mail:", err);
    res.status(500).json({ message: "Erro ao enviar e-mail de confirmação." });
  }
});

router.post("/confirmar-exclusao", async (req, res) => {
  const { token } = req.body;
  const database = await db();

  const row = await database.get(
    "SELECT * FROM turma_delete_tokens WHERE token = $1",
    [token]
  );

  if (!row) return res.sendFile("exclusao_erro.html", { root: "public" });

  if (new Date() > new Date(row.expires_at))
    return res.sendFile("exclusao_erro.html", { root: "public" });

  // excluir em cascata: auditoria → notas → alunos → turma
  const alunos = await database.all(
    "SELECT id FROM alunos WHERE id_turma = $1",
    [row.turma_id]
  );
  const alunoIds = alunos.map((a: any) => a.id);

  if (alunoIds.length > 0) {
    const placeholders = alunoIds.map((_, i) => `$${i + 1}`).join(",");
    await database.run(
      `DELETE FROM auditoria_notas WHERE aluno_id IN (${placeholders})`,
      alunoIds
    );
    await database.run(
      `DELETE FROM notas WHERE aluno_id IN (${placeholders})`,
      alunoIds
    );
    await database.run(`DELETE FROM alunos WHERE id_turma = $1`, [
      row.turma_id,
    ]);
  }

  // excluir turma
  await database.run("DELETE FROM turmas WHERE id = $1", [row.turma_id]);

  // limpar token
  await database.run("DELETE FROM turma_delete_tokens WHERE token = $1", [
    token,
  ]);

  res.sendFile("exclusao_concluida.html", { root: "public" });
});

export default router;
