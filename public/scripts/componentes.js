// verify session with server; redirect to login if not authenticated
// await fetch("http://localhost:3000/protected", { credentials: "same-origin" })
//   .then((r) => {
//     if (!r.ok) window.location.href = "/login.html";
//   })
//   .catch(() => {
//     window.location.href = "/login.html";
//   });

async function fetchJson(url, opts) {
  const finalOpts = Object.assign({}, opts || {});
  finalOpts.headers = Object.assign({}, finalOpts.headers || {});
  finalOpts.credentials = "same-origin";
  const r = await fetch("http://localhost:3000" + url, finalOpts);
  if (!r.ok) {
    const t = await r.json().catch(() => ({ message: "Erro" }));
    throw new Error(t.message || "Erro na requisição");
  }
  return r.json();
}

function qs(name) {
  return new URLSearchParams(location.search).get(name);
}

document.addEventListener("DOMContentLoaded", async () => {
  const disciplinaInput = document.getElementById("disciplinaId");
  const disciplinaSelect = document.getElementById("disciplinaIdSelect");
  const loadBtn = document.getElementById("loadBtn");
  const compForm = document.getElementById("componenteForm");
  const compList = document.getElementById("componentesList");

  // verify session with server; redirect to login if not authenticated

  if (disciplinaInput && qs("disciplinaId"))
    disciplinaInput.value = qs("disciplinaId");

  if (loadBtn) {
    loadBtn.addEventListener("click", () =>
      loadDisciplina(Number(disciplinaInput ? disciplinaInput.value : 0))
    );
  }

  if (compForm) {
    compForm.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const idEl = document.getElementById("compId");
      const nomeEl = document.getElementById("nome");
      const siglaEl = document.getElementById("sigla");
      const descricaoEl = document.getElementById("descricao");

      const id = idEl ? idEl.value : "";
      const nome = nomeEl ? nomeEl.value.trim() : "";
      const sigla = siglaEl ? siglaEl.value.trim() : "";
      const descricao = descricaoEl ? descricaoEl.value.trim() : "";
      const disciplina_id = Number(
        disciplinaSelect
          ? disciplinaSelect.value
          : disciplinaInput
          ? disciplinaInput.value
          : 0
      );
      if (!nome || !disciplina_id)
        return alert("Nome e disciplina_id são obrigatórios");
      try {
        if (id) {
          await fetchJson("/componentes/" + id, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              nome,
              sigla,
              descricao,
              disciplina_id,
              peso: 1,
            }),
          });
        } else {
          await fetchJson("/componentes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              nome,
              sigla,
              descricao,
              disciplina_id,
              peso: 1,
            }),
          });
        }
        clearForm();
        await loadCompList();
        await loadDisciplina(disciplina_id);
      } catch (err) {
        alert(err.message);
      }
    });
  }

  const limparBtn = document.getElementById("limparBtn");
  if (limparBtn) limparBtn.addEventListener("click", clearForm);

  function clearForm() {
    const idEl = document.getElementById("compId");
    const nomeEl = document.getElementById("nome");
    const siglaEl = document.getElementById("sigla");
    const descricaoEl = document.getElementById("descricao");
    if (idEl) idEl.value = "";
    if (nomeEl) nomeEl.value = "";
    if (siglaEl) siglaEl.value = "";
    if (descricaoEl) descricaoEl.value = "";
  }

  async function loadDisciplina(disciplinaId) {
    if (!disciplinaId) return alert("Informe o ID da disciplina");
    try {
      const data = await fetchJson("/componentes/matriz/" + disciplinaId);

      await renderComponentes(data.componentes || []);
    } catch (err) {
      alert(err.message);
    }
  }

  async function renderComponentes(componentes) {
    if (!compList) return;
    compList.innerHTML = "";
    for (const c of componentes) {
      const li = document.createElement("li");
      li.textContent = `${c.nome} (${c.sigla || ""}) - ${c.descricao || ""}`;
      const edit = document.createElement("button");
      edit.textContent = "Editar";
      edit.addEventListener("click", () => {
        const idEl = document.getElementById("compId");
        const nomeEl = document.getElementById("nome");
        const siglaEl = document.getElementById("sigla");
        const descricaoEl = document.getElementById("descricao");
        if (idEl) idEl.value = c.id;
        if (nomeEl) nomeEl.value = c.nome;
        if (siglaEl) siglaEl.value = c.sigla || "";
        if (descricaoEl) descricaoEl.value = c.descricao || "";
      });
      const del = document.createElement("button");
      del.textContent = "Excluir";
      del.addEventListener("click", async () => {
        if (!confirm("Confirmar exclusão?")) return;
        try {
          await fetchJson("/componentes/" + c.id, { method: "DELETE" });
          await loadDisciplina(
            Number(disciplinaInput ? disciplinaInput.value : 0)
          );
        } catch (err) {
          alert(err.message);
        }
      });
      li.appendChild(edit);
      li.appendChild(del);
      compList.appendChild(li);
    }
  }

  const loadDisciplinaOptions = async () => {
    if (!disciplinaSelect) return;
    const disciplinas = await fetch("http://localhost:3000/disciplinas", {
      credentials: "same-origin",
      method: "GET",
    })
      .then((r) => r.json())
      .catch(() => []);
    console.log("disciplina options: ", disciplinas);

    disciplinaSelect.innerHTML = "";
    disciplinaSelect.appendChild(
      (() => {
        const option = document.createElement("option");
        option.value = "";
        option.textContent = "-- Selecione --";
        return option;
      })()
    );
    if (disciplinas.length > 0) {
      for (const d of disciplinas) {
        const option = document.createElement("option");
        option.value = d.id;
        option.textContent = d.nome;
        if (disciplinaInput && String(d.id) === String(disciplinaInput.value))
          option.selected = true;
        disciplinaSelect.appendChild(option);
      }
    }
  };
  const loadCompList = async () => {
    if (!compList) return;
    const componentes = await fetch("http://localhost:3000/componentes", {
      credentials: "same-origin",
    })
      .then((r) => r.json())
      .catch(() => []);
    console.log("componentes: ", componentes);
    if (componentes.length > 0) {
      for (const c of componentes) {
        const li = document.createElement("li");
        li.textContent = `${c.nome} (${c.sigla || ""}) - ${c.descricao || ""}`;
        compList.appendChild(li);
      }
    } else {
      compList.innerHTML = "<li>Nenhum componente cadastrado.</li>";
    }
  };
  if (disciplinaSelect) loadDisciplinaOptions();
  loadCompList();
});
