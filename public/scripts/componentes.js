
// verify session with server; redirect to login if not authenticated
await fetch('/protected', { credentials: 'same-origin' })
  .then(r => { if (!r.ok) window.location.href = '/login.html'; })
  .catch(() => { window.location.href = '/login.html'; });

async function fetchJson(url, opts) {
  const finalOpts = Object.assign({}, opts || {});
  finalOpts.headers = Object.assign({}, finalOpts.headers || {});
  finalOpts.credentials = 'same-origin';
  const r = await fetch(url, finalOpts);
  if (!r.ok) {
    const t = await r.json().catch(()=>({ message: 'Erro' }));
    throw new Error(t.message || 'Erro na requisição');
  }
  return r.json();
}

function qs(name) { return new URLSearchParams(location.search).get(name); }

document.addEventListener('DOMContentLoaded', () => {
  const disciplinaInput = document.getElementById('disciplinaId');
  const loadBtn = document.getElementById('loadBtn');
  const compForm = document.getElementById('componenteForm');
  const compList = document.getElementById('componentesList');
  const matrizContainer = document.getElementById('matrizContainer');
  const formulaInput = document.getElementById('formulaInput');
  const saveFormulaBtn = document.getElementById('saveFormulaBtn');

  if (qs('disciplinaId')) disciplinaInput.value = qs('disciplinaId');

  loadBtn.addEventListener('click', () => loadDisciplina(Number(disciplinaInput.value)));

  compForm.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const id = document.getElementById('compId').value;
  const nome = document.getElementById('nome').value.trim();
  const sigla = document.getElementById('sigla').value.trim();
  const descricao = document.getElementById('descricao').value.trim();
  const pesoRaw = document.getElementById('peso').value;
  const peso = pesoRaw === '' ? undefined : Number(pesoRaw);
    const disciplina_id = Number(disciplinaInput.value);
    if (!nome || !disciplina_id) return alert('Nome e disciplina_id são obrigatórios');
    try {
      if (id) {
        await fetchJson('/componentes/' + id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome, sigla, descricao, disciplina_id, peso }) });
      } else {
        await fetchJson('/componentes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome, sigla, descricao, disciplina_id, peso }) });
      }
      clearForm();
      await loadDisciplina(disciplina_id);
    } catch (err) { alert(err.message); }
  });

  document.getElementById('limparBtn').addEventListener('click', clearForm);

  function clearForm() {
    document.getElementById('compId').value = '';
    document.getElementById('nome').value = '';
    document.getElementById('sigla').value = '';
    document.getElementById('descricao').value = '';
    document.getElementById('peso').value = '';
  }

  async function loadDisciplina(disciplinaId) {
    if (!disciplinaId) return alert('Informe o ID da disciplina');
    try {
      const data = await fetchJson('/componentes/matriz/' + disciplinaId);
      const disciplina = await fetchJson('/disciplinas/' + disciplinaId);
      if (formulaInput) formulaInput.value = disciplina.formula || '';
      renderComponentes(data.componentes);
      renderMatriz(data.alunos, data.componentes, data.notas);
    } catch (err) { alert(err.message); }
  }

  if (saveFormulaBtn) {
    saveFormulaBtn.addEventListener('click', async () => {
      const disciplina_id = Number(disciplinaInput.value);
      if (!disciplina_id) return alert('Informe o ID da disciplina');
      const formula = formulaInput.value.trim();
      try {
        await fetchJson('/disciplinas/' + disciplina_id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ formula }) });
        alert('Fórmula salva com sucesso');
        // reload matrix to compute nota_final
        await loadDisciplina(disciplina_id);
      } catch (err) { alert(err.message); }
    });
  }

  function renderComponentes(componentes) {
    compList.innerHTML = '';
    for (const c of componentes) {
      const li = document.createElement('li');
      li.textContent = `${c.nome} (${c.sigla || ''}) - ${c.descricao || ''}`;
      const edit = document.createElement('button'); edit.textContent = 'Editar';
      edit.addEventListener('click', () => {
        document.getElementById('compId').value = c.id;
        document.getElementById('nome').value = c.nome;
        document.getElementById('sigla').value = c.sigla || '';
        document.getElementById('descricao').value = c.descricao || '';
        document.getElementById('peso').value = (c.peso != null ? String(c.peso) : '');
      });
      const del = document.createElement('button'); del.textContent = 'Excluir';
      del.addEventListener('click', async () => {
        if (!confirm('Confirmar exclusão?')) return;
        try { await fetchJson('/componentes/' + c.id, { method: 'DELETE' }); await loadDisciplina(Number(document.getElementById('disciplinaId').value)); } catch (err) { alert(err.message); }
      });
      li.appendChild(edit); li.appendChild(del);
      compList.appendChild(li);

    /*
      Arquivo: componentes.js
      Finalidade: Lógica cliente para gerenciar componentes de avaliação (ex.: criar,
      editar, excluir componentes e salvar fórmula da disciplina). Também renderiza
      a matriz de notas para a disciplina e permite edição de valores.
      Observações: Comunica-se com endpoints como `/componentes` e `/disciplinas`.
    */

    // verify session with server; redirect to login if not authenticated
    await fetch('/protected', { credentials: 'same-origin' })
      .then(r => { if (!r.ok) window.location.href = '/login.html'; })
      .catch(() => { window.location.href = '/login.html'; });
      return;
    }
    const table = document.createElement('table');
    table.className = 'matriz';
    const thead = document.createElement('thead');
    const trh = document.createElement('tr');
    trh.appendChild(document.createElement('th')); // empty corner
    for (const c of componentes) {
      const th = document.createElement('th'); th.textContent = c.sigla || c.nome;
      trh.appendChild(th);
    }
    const thFinal = document.createElement('th'); thFinal.textContent = 'Nota Final';
    trh.appendChild(thFinal);
    thead.appendChild(trh);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    for (const a of alunos) {
      const tr = document.createElement('tr');
      const tdName = document.createElement('td'); tdName.textContent = a.nome + ' (' + a.matricula + ')';
      tr.appendChild(tdName);
      for (const c of componentes) {
        const key = `${a.id}_${c.id}`;
        const val = notas[key];
        const td = document.createElement('td');
        const span = document.createElement('span'); span.textContent = (val == null ? '-' : Number(val).toFixed(2));
        td.appendChild(span);
        const input = document.createElement('input'); input.type = 'number'; input.step = '0.01'; input.min = '0'; input.max = '10'; input.placeholder = '—';
        input.style.width = '80px';
        input.addEventListener('change', async () => {
          const v = input.value === '' ? null : Number(input.value);
          if (v != null && (v < 0 || v > 10)) return alert('Valor deve estar entre 0.00 e 10.00');
          try {
            if (v == null) {
              alert('Para remover, edite no servidor.');
            } else {
              await fetchJson('/componentes/notas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ aluno_id: a.id, componente_id: c.id, valor: v }) });
              span.textContent = v.toFixed(2);
            }
          } catch (err) { alert(err.message); }
        });
        td.appendChild(document.createElement('br'));
        td.appendChild(input);
        tr.appendChild(td);
      }
      const tdFinal = document.createElement('td');
      const nf = a.nota_final;
      tdFinal.textContent = (nf == null ? '-' : Number(nf).toFixed(2));
      tr.appendChild(tdFinal);
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    matrizContainer.innerHTML = '';
    matrizContainer.appendChild(table);
  }
});
