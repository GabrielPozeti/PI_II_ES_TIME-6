/*
  Arquivo: notas.js
  Finalidade: Interface cliente para visualizar e lançar notas por turma.
  Observações: Carrega matriz de componentes/alunos e permite edição de notas via API.
*/
// await fetch("http://localhost:3000/protected", { credentials: "same-origin" })
//   .then((r) => {
//     if (!r.ok) window.location.href = "/login.html";
//   })
//   .catch(() => {
//     window.location.href = "/login.html";
//   });

// async function fetch(url, opts) {
//   const finalOpts = Object.assign({}, opts || {});
//   finalOpts.headers = Object.assign({}, finalOpts.headers || {});
//   finalOpts.credentials = 'same-origin';
//   const r = await fetch(url, finalOpts);
//   if (!r.ok) {
//     const t = await r.json().catch(()=>({ message: 'Erro' }));
//     throw new Error(t.message || 'Erro na requisição');
//   }
//   return r.json();
// }

const loadTurmasSelect = async () => {
  const input = document.getElementById("turmaSelect");
  input.innerHTML = "";
  const turmas = await fetch("http://localhost:3000/turmas", {
    method: "GET",
    credentials: "include",
  })
    .then((r) => r.json())
    .catch(() => []);
  console.log("turmas:", turmas);
  const opt = document.createElement("option");
  opt.value = "";
  opt.textContent = "-- selecione --";
  input.appendChild(opt);
  for (const t of turmas) {
    const o = document.createElement("option");
    o.value = t.id;
    o.textContent = `${t.disciplina_nome} - ${t.codigo || ""} ${
      t.periodo ? "(" + t.periodo + "º semestre)" : ""
    }`;
    input.appendChild(o);
  }
};

function baixarArquivo(conteudo, nome, tipo) {
  const blob = new Blob([conteudo], { type: tipo });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  a.click();
  URL.revokeObjectURL(url);
}

loadTurmasSelect();

function qs(name) {
  return new URLSearchParams(location.search).get(name);
}

document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("turmaSelect");
  const loadBtn = document.getElementById("loadBtn");
  const container = document.getElementById("matrizContainer");
  const exportBtn = document.getElementById("exportBtn");
  exportBtn.addEventListener("click", () => exportarCSV());

  if (qs("turmaId")) input.value = qs("turmaId");
  loadBtn.addEventListener("click", () => loadTurma(Number(input.value)));

  async function loadTurma(tid) {
    if (!tid) return alert("Informe a turma ID");
    try {
      const data = await fetch(
        "http://localhost:3000/turmas/" + tid + "/notas"
      ).then((r) => r.json());
      renderMatrix(data.componentes, data.alunos, data.notas);
    } catch (e) {
      alert(e.message);
    }
  }

  async function exportarCSV() {
    const tabela = container.querySelector("table");
    if (!tabela) return alert("Carregue uma turma antes 🧑‍🏫");

    // verificar se alguma nota está não lançada
    const spansNotas = tabela.querySelectorAll(
      "tbody td:not(.nota-final) span"
    );

    for (const s of spansNotas) {
      if (s.textContent.trim() === "-" || s.textContent.trim() === "") {
        return alert(
          "Existem notas não lançadas! ⚠\n" +
            "Preencha todos os componentes antes de exportar."
        );
      }
    }

    // montar matriz CSV
    const linhas = [];

    // cabeçalho
    const cab = [];
    tabela.querySelectorAll("thead th").forEach((th) => {
      cab.push(th.textContent.trim());
    });
    linhas.push(cab);

    // linhas dos alunos
    tabela.querySelectorAll("tbody tr").forEach((tr) => {
      const linha = [];
      tr.querySelectorAll("td").forEach((td) => {
        linha.push(td.textContent.trim());
      });
      linhas.push(linha);
    });

    // gerar nome de arquivo
    const turmaId = document.getElementById("turmaSelect").value;
    const turmaTexto =
      document.getElementById("turmaSelect").selectedOptions[0].textContent;

    const sigla = turmaTexto.split(" ")[0] || "Turma";

    const agora = new Date();
    const nomeArquivo =
      `${agora.getFullYear()}-` +
      `${String(agora.getMonth() + 1).padStart(2, "0")}-` +
      `${String(agora.getDate()).padStart(2, "0")}_` +
      `${String(agora.getHours()).padStart(2, "0")}` +
      `${String(agora.getMinutes()).padStart(2, "0")}` +
      `${String(agora.getSeconds()).padStart(2, "0")}` +
      `${String(agora.getMilliseconds()).padStart(3, "0")}` +
      `-${sigla}-${turmaId}.csv`;

    // gerar CSV
    let csv = "";
    linhas.forEach((l) => {
      csv += l.map((item) => `"${item}"`).join(",") + "\n";
    });

    // baixar arquivo
    baixarArquivo(csv, nomeArquivo, "text/csv");
  }

  function renderMatrix(componentes, alunos, notas) {
    if (!componentes || !componentes.length) {
      container.innerHTML = "<p>Nenhum componente cadastrado.</p>";
      return;
    }
    if (!alunos || !alunos.length) {
      container.innerHTML = "<p>Nenhum aluno cadastrado.</p>";
      return;
    }

    const table = document.createElement("table");
    table.className = "matriz";

    // ---------- THEAD ----------
    const thead = document.createElement("thead");
    const trh = document.createElement("tr");

    const colunaNome = document.createElement("th");
    colunaNome.textContent = "Nome"; // coluna nome
    trh.appendChild(colunaNome);
    for (const c of componentes) {
      const th = document.createElement("th");
      th.textContent = c.sigla || c.nome;
      trh.appendChild(th);
    }

    // 🔥 nova coluna: Nota Final
    const thFinal = document.createElement("th");
    thFinal.textContent = "Nota Final";
    trh.appendChild(thFinal);

    thead.appendChild(trh);
    table.appendChild(thead);

    // ---------- TBODY ----------
    const tbody = document.createElement("tbody");

    for (const a of alunos) {
      const tr = document.createElement("tr");

      // nome do aluno
      const tdName = document.createElement("td");
      tdName.textContent = a.nome + " (" + a.matricula + ")";
      tr.appendChild(tdName);

      let soma = 0;
      let count = 0;
      const spans = []; // vamos usar depois para recalcular

      for (const c of componentes) {
        const key = `${a.id}_${c.id}`;
        const val = notas[key];

        const td = document.createElement("td");

        const span = document.createElement("span");
        span.textContent = val == null ? "-" : Number(val).toFixed(2);
        td.appendChild(span);

        if (val != null) {
          soma += Number(val);
          count++;
        }

        spans.push({ componenteId: c.id, span });

        const input = document.createElement("input");
        input.type = "number";
        input.step = "0.01";
        input.min = "0";
        input.max = "10";
        input.placeholder = "—";
        input.style.width = "80px";

        input.addEventListener("change", async () => {
          const v = input.value === "" ? null : Number(input.value);
          if (v != null && (v < 0 || v > 10))
            return alert("Valor deve estar entre 0.00 e 10.00");

          try {
            if (v == null) {
              alert("Remoção não implementada via UI");
            } else {
              await fetch("http://localhost:3000/componentes/notas", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  aluno_id: a.id,
                  componente_id: c.id,
                  valor: v,
                }),
              });

              span.textContent = v.toFixed(2);

              // 🔥 recalcular nota final automaticamente
              recalcFinal();
            }
          } catch (err) {
            alert(err.message);
          }
        });

        td.appendChild(document.createElement("br"));
        td.appendChild(input);
        tr.appendChild(td);
      }

      // ---------- criar coluna Nota Final ----------
      const tdFinal = document.createElement("td");
      tdFinal.classList.add("nota-final");

      function recalcFinal() {
        let total = 0;
        let qtd = 0;

        for (const s of spans) {
          if (s.span.textContent !== "-") {
            total += Number(s.span.textContent);
            qtd++;
          }
        }

        tdFinal.textContent = qtd === 0 ? "-" : (total / qtd).toFixed(2);
      }

      // calcular nota final ao montar a tabela
      recalcFinal();
      tr.appendChild(tdFinal);

      tbody.appendChild(tr);
    }

    table.appendChild(tbody);
    container.innerHTML = "";
    container.appendChild(table);
  }
});
