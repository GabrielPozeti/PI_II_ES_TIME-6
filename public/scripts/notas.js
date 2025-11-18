/*
  Arquivo: notas.js
  Finalidade: Interface cliente para visualizar e lançar notas por turma.
  Observações: Carrega matriz de componentes/alunos e permite edição de notas via API.
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

function qs(name) { return new URLSearchParams(location.search).get(name); }

document.addEventListener('DOMContentLoaded', ()=>{
  const input = document.getElementById('turmaIdInput');
  const loadBtn = document.getElementById('loadBtn');
  const container = document.getElementById('matrizContainer');

  if (qs('turmaId')) input.value = qs('turmaId');
  loadBtn.addEventListener('click', ()=> loadTurma(Number(input.value)));

  async function loadTurma(tid){
    if (!tid) return alert('Informe a turma ID');
    try{
      const data = await fetchJson('/turmas/' + tid + '/notas');
      renderMatrix(data.componentes, data.alunos, data.notas);
    }catch(e){ alert(e.message); }
  }

  function renderMatrix(componentes, alunos, notas){
    if (!componentes.length) { container.innerHTML = '<p>Nenhum componente cadastrado.</p>'; return; }
    const table = document.createElement('table'); table.className='matriz';
    const thead = document.createElement('thead'); const trh = document.createElement('tr');
    trh.appendChild(document.createElement('th'));
    for(const c of componentes){ const th=document.createElement('th'); th.textContent = c.sigla || c.nome; trh.appendChild(th); }
    trh.appendChild(((()=>{ const th=document.createElement('th'); th.textContent='Nota Final'; return th; })()));
    thead.appendChild(trh); table.appendChild(thead);

    const tbody=document.createElement('tbody');
    for(const a of alunos){ const tr=document.createElement('tr'); const tdName=document.createElement('td'); tdName.textContent = a.nome + ' ('+a.matricula+')'; tr.appendChild(tdName);
      for(const c of componentes){ const key = `${a.id}_${c.id}`; const val = notas[key]; const td=document.createElement('td'); const span=document.createElement('span'); span.textContent = (val==null?'-':Number(val).toFixed(2)); td.appendChild(span);
        const input=document.createElement('input'); input.type='number'; input.step='0.01'; input.min='0'; input.max='10'; input.placeholder='—'; input.style.width='80px';
        input.addEventListener('change', async ()=>{
          const v = input.value === '' ? null : Number(input.value);
          if (v != null && (v < 0 || v > 10)) return alert('Valor deve estar entre 0.00 e 10.00');
          try{ if (v == null) alert('Remoção não implementada via UI'); else { await fetchJson('/componentes/notas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ aluno_id: a.id, componente_id: c.id, valor: v }) }); span.textContent = v.toFixed(2); } } catch(err){ alert(err.message); }
        });
        td.appendChild(document.createElement('br'));
        td.appendChild(input);
        tr.appendChild(td);
      }
      const tdFinal = document.createElement('td'); tdFinal.textContent = (a.nota_final==null?'-':Number(a.nota_final).toFixed(2)); tr.appendChild(tdFinal);
      tbody.appendChild(tr);
    }
    table.appendChild(tbody); container.innerHTML=''; container.appendChild(table);
  }
});
