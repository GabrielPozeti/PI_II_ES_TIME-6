/*
  Arquivo: instituicoes.js
  Finalidade: Código cliente para `instituicoes.html` — carregamento e CRUD de instituições.
  Observações: Usa `fetch` para comunicar-se com a API e manipula o DOM (lista e formulário).
*/
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
  const lista = document.getElementById('lista');
  const form = document.getElementById('instForm');

  load();
  document.getElementById('limparBtn').addEventListener('click', clearForm);

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const id = document.getElementById('instId').value;
    const nome = document.getElementById('nome').value.trim();
    const sigla = document.getElementById('sigla').value.trim();
    if (!nome) return alert('Nome é obrigatório');
    try {
      if (id) await fetchJson('/instituicoes/' + id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome, sigla }) });
      else await fetchJson('/instituicoes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome, sigla }) });
      clearForm();
      await load();
    } catch (err) { alert(err.message); }
  });

  function clearForm() { document.getElementById('instId').value=''; document.getElementById('nome').value=''; document.getElementById('sigla').value=''; }

  async function load() {
    try {
      const rows = await fetchJson('/instituicoes');
      lista.innerHTML = '';
      for (const r of rows) {
        const li = document.createElement('li');
        li.textContent = r.nome + (r.sigla ? ' ('+r.sigla+')' : '');
        const edit = document.createElement('button'); edit.textContent = 'Editar';
        edit.addEventListener('click', async () => {
          try { const d = await fetchJson('/instituicoes/' + r.id); document.getElementById('instId').value=d.id; document.getElementById('nome').value=d.nome; document.getElementById('sigla').value=d.sigla||''; } catch(e){alert(e.message)}
        });
        const del = document.createElement('button'); del.textContent='Excluir';
        del.addEventListener('click', async ()=>{ if(!confirm('Confirmar exclusão?')) return; try{ await fetchJson('/instituicoes/' + r.id, { method: 'DELETE' }); await load(); } catch(e){ alert(e.message); }});
        li.appendChild(edit); li.appendChild(del); lista.appendChild(li);
      }
    } catch (err) { alert(err.message); }
  }
});
