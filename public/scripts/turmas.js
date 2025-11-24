/*
  Arquivo: turmas.js
  Finalidade: Lógica cliente para a página de turmas (`turmas.html`) — CRUD, importação/exportação e navegação para quadro de notas.
  Observações: Usa `fetch` com credenciais e manipula arquivos CSV/JSON para importação.
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

document.addEventListener("DOMContentLoaded", () => {
  const lista = document.getElementById("lista");
  const disciplinaSelect = document.getElementById("disciplinaIdSelect");
  const form = document.getElementById("turmaForm");

  loadDisciplinas();
  loadTurmas();

  document.getElementById("limparBtn").addEventListener("click", clearForm);

  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const id = document.getElementById("turmaId").value;
    const disciplina_id = Number(disciplinaSelect.value);
    const codigo = document.getElementById("codigo").value.trim();
    const periodo = document.getElementById("periodo").value.trim();
    if (!disciplina_id) return alert("Informe a disciplina");
    try {
      if (id)
        await fetch("http://localhost:3000/turmas/" + id, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ disciplina_id, codigo, periodo }),
        });
      else
        await fetch("http://localhost:3000/turmas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ disciplina_id, codigo, periodo }),
        });
      clearForm();
      await loadTurmas();
    } catch (err) {
      alert(err.message);
    }
  });

  function clearForm() {
    document.getElementById("turmaId").value = "";
    disciplinaSelect.selectedIndex = 0;
    document.getElementById("codigo").value = "";
    document.getElementById("periodo").value = "";
  }

  async function loadDisciplinas() {
    try {
      const rows = await fetch("http://localhost:3000/disciplinas", {
        method: "GET",
        credentials: "include",
      })
        .then((r) => r.json())
        .catch(() => []);
      disciplinaSelect.innerHTML = "";
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "-- selecione --";
      disciplinaSelect.appendChild(opt);
      for (const r of rows) {
        const o = document.createElement("option");
        o.value = r.id;
        o.textContent = r.nome + (r.codigo ? " (" + r.codigo + ")" : "");
        disciplinaSelect.appendChild(o);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function loadTurmas() {
    try {
      const rows = await fetch("http://localhost:3000/turmas", {
        method: "GET",
        credentials: "include",
      })
        .then((r) => r.json())
        .catch(() => []);
      lista.innerHTML = "";
      for (const r of rows) {
        const li = document.createElement("li");
        li.textContent = `Disciplina ${r.disciplina_nome} - ${r.codigo || ""} ${
          r.periodo ? "(" + r.periodo + ")" : ""
        }`;
        const editar = document.createElement("button");
        editar.textContent = "Editar";
        editar.addEventListener("click", async () => {
          const d = await fetch("http://localhost:3000/turmas/" + r.id);
          document.getElementById("turmaId").value = d.id;
          disciplinaSelect.value = d.disciplina_id;
          document.getElementById("codigo").value = d.codigo || "";
          document.getElementById("periodo").value = d.periodo || "";
        });
        const del = document.createElement("button");
        del.textContent = "Excluir";
        del.addEventListener("click", async () => {
          if (!confirm("Confirmar exclusão?")) return;
          try {
            await fetch("http://localhost:3000/turmas/" + r.id, {
              method: "DELETE",
            });
            await loadTurmas();
          } catch (e) {
            alert(e.message);
          }
        });
        const notasBtn = document.createElement("button");
        notasBtn.textContent = "Quadro de Notas";
        notasBtn.addEventListener("click", () => {
          location.href = "notas.html?turmaId=" + r.id;
        });
        const exportBtn = document.createElement("button");
        exportBtn.textContent = "Exportar CSV";
        exportBtn.addEventListener("click", () => {
          window.open(
            "http://localhost:3000/turmas/" + r.id + "/exportar",
            "_blank"
          );
        });
        li.appendChild(editar);
        li.appendChild(del);
        li.appendChild(notasBtn);
        li.appendChild(exportBtn);
        lista.appendChild(li);
      }
    } catch (e) {
      alert(e.message);
    }
  }

  // imports
  document
    .getElementById("importCsvBtn")
    .addEventListener("click", async () => {
      const id = Number(document.getElementById("importTurmaId").value);
      if (!id) return alert("Informe Turma ID para importar");
      const fileInput = document.getElementById("csvFile");
      if (!fileInput || !fileInput.files || fileInput.files.length === 0)
        return alert("Selecione um arquivo CSV");
      const file = fileInput.files[0];
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const csv = String(ev.target.result || "");
        try {
          const r = await fetch(
            "http://localhost:3000/turmas/" + id + "/import-csv",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ csv }),
            }
          );
          alert(JSON.stringify(r));
          fileInput.value = "";
          await loadTurmas();
        } catch (e) {
          alert(e.message);
        }
      };
      reader.onerror = (e) => {
        alert("Erro ao ler o arquivo");
      };
      reader.readAsText(file, "utf-8");
    });

  document
    .getElementById("importJsonBtn")
    .addEventListener("click", async () => {
      const id = Number(document.getElementById("importTurmaId").value);
      if (!id) return alert("Informe Turma ID para importar");
      const txt = document.getElementById("jsonArea").value;
      if (!txt) return alert("Cole o JSON (array)");
      try {
        const data = JSON.parse(txt);
        const r = await fetch(
          "http://localhost:3000/turmas/" + id + "/import-json",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ data }),
          }
        );
        alert(JSON.stringify(r));
        await loadTurmas();
      } catch (e) {
        alert(e.message || e);
      }
    });
});
