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
      await loadTurmasSelect();
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
          r.periodo ? "(" + r.periodo + "º semestre)" : ""
        }`;

        const del = document.createElement("button");
        del.textContent = "Excluir";
        del.addEventListener("click", async () => {
          if (
            !confirm(
              "Deseja solicitar exclusão desta turma?\nUm e-mail será enviado para confirmação."
            )
          )
            return;

          try {
            const resp = await fetch(
              `http://localhost:3000/turmas/solicitar-exclusao`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                  email: JSON.parse(localStorage.getItem("user")).email,
                  id: r.id,
                }), //pega o email do usuario logado do localStorage
              }
            ).then((r) => r.json());

            alert("E-mail enviado! Confirme pelo link recebido.");
          } catch (e) {
            alert(e.message);
          }
        });

        const notasBtn = document.createElement("button");
        notasBtn.textContent = "Quadro de Notas";
        notasBtn.addEventListener("click", () => {
          location.href = "notas.html?turmaId=" + r.id;
        });

        li.appendChild(del);
        li.appendChild(notasBtn);

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
      const id = Number(document.getElementById("turmaSelect").value);
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
  const loadTurmasSelect = async () => {
    const turmaSelect = document.getElementById("turmaSelect");
    turmaSelect.innerHTML = "";
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
    turmaSelect.appendChild(opt);
    for (const t of turmas) {
      const o = document.createElement("option");
      o.value = t.id;
      o.textContent = `${t.disciplina_nome} - ${t.codigo || ""} ${
        t.periodo ? "(" + t.periodo + "º semestre)" : ""
      }`;
      turmaSelect.appendChild(o);
    }
  };

  loadTurmasSelect();
});
