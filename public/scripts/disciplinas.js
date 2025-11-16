// verify session
fetch('/protected', { credentials: 'same-origin' }).then(r => { if (!r.ok) window.location.href = '/login.html'; }).catch(()=>{ window.location.href = '/login.html'; });

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

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('discForm');
  const lista = document.getElementById('lista');
  const instituicaoSelect = document.getElementById('instituicaoId');

  loadInstituicoes();
  loadDisciplinas();

  document.getElementById('limparBtn').addEventListener('click', clearForm);

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const id = document.getElementById('discId').value;
    const nome = document.getElementById('nome').value.trim();
    const codigo = document.getElementById('codigo').value.trim();
    const instituicao_id = Number(instituicaoSelect.value);
    const formula = document.getElementById('formula').value.trim();
    if (!nome || !instituicao_id) return alert('Nome e Instituição são obrigatórios');
    try {
      if (id) {
        await fetchJson('/disciplinas/' + id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome, codigo, instituicao_id, formula }) });
      } else {
        await fetchJson('/disciplinas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome, codigo, instituicao_id, formula }) });
      }
      clearForm();
      await loadDisciplinas();
    } catch (err) { alert(err.message); }
  });

  function clearForm() {
    document.getElementById('discId').value = '';
    document.getElementById('nome').value = '';
    document.getElementById('codigo').value = '';
    document.getElementById('formula').value = '';
    instituicaoSelect.selectedIndex = 0;
  }

  async function loadInstituicoes() {
    try {
      const insts = await fetchJson('/instituicoes');
      instituicaoSelect.innerHTML = '';
      const opt = document.createElement('option'); opt.value = ''; opt.textContent = '-- selecione --'; instituicaoSelect.appendChild(opt);
      for (const i of insts) {
        const o = document.createElement('option'); o.value = i.id; o.textContent = i.nome + (i.sigla ? ' ('+i.sigla+')' : ''); instituicaoSelect.appendChild(o);
      }
    } catch (err) { console.error(err); }
  }

  async function loadDisciplinas() {
    try {
      const rows = await fetchJson('/disciplinas');
      lista.innerHTML = '';
      for (const r of rows) {
        const li = document.createElement('li');
        li.textContent = `${r.nome} ${r.codigo ? '('+r.codigo+')' : ''}`;
        const edit = document.createElement('button'); edit.textContent = 'Editar';
        edit.addEventListener('click', async () => {
          try {
            const data = await fetchJson('/disciplinas/' + r.id);
            document.getElementById('discId').value = data.id;
            document.getElementById('nome').value = data.nome;
            document.getElementById('codigo').value = data.codigo || '';
            document.getElementById('formula').value = data.formula || '';
            instituicaoSelect.value = data.instituicao_id;
          } catch (err) { alert(err.message); }
        });
        const del = document.createElement('button'); del.textContent = 'Excluir';
        del.addEventListener('click', async () => {
          if (!confirm('Confirmar exclusão?')) return;
          try { await fetchJson('/disciplinas/' + r.id, { method: 'DELETE' }); await loadDisciplinas(); } catch (err) { alert(err.message); }
        });
        li.appendChild(edit); li.appendChild(del);
        lista.appendChild(li);
      }
    } catch (err) { alert(err.message); }
  }
});
