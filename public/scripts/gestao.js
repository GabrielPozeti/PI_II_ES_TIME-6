
/*
  Arquivo: gestao.js
  Finalidade: Lógica de frontend para a página de gestão (`gestao.html`).
  Observações: Fornece funções de request, carregamento de listas (instituições,
  disciplinas, turmas, alunos), CRUD via API e controles de modal/confirm.
*/

// verify session with server; redirect to login if not authenticated
await fetch('/protected', { credentials: 'same-origin' })
  .then(r => { if (!r.ok) window.location.href = '/login.html'; })
  .catch(() => { window.location.href = '/login.html'; });

const qs=(s)=>document.querySelector(s);
const qsa=(s)=>Array.from(document.querySelectorAll(s));
const listaInst=qs('#lista-instituicoes');
const listaDisc=qs('#lista-disciplinas');
const listaTur=qs('#lista-turmas');
const listaAlunos = qs('#lista-alunos');
const formInst=qs('#form-instituicao');
const formDisc=qs('#form-disciplina');
const formTur=qs('#form-turma');
const formAluno = qs('#form-aluno');
const modal=qs('#modal');
const modalText=qs('#modal-text');
const modalConfirm=qs('#modal-confirm');
const modalCancel=qs('#modal-cancel');
let pendingDelete=null;
async function request(method,url,body){
  const opts={method,headers:{'Content-Type':'application/json'}, credentials: 'same-origin'};
  if(body)opts.body=JSON.stringify(body);
  const res=await fetch(url,opts);
  const contentType = res.headers.get('content-type') || '';
  // try to parse JSON when appropriate, otherwise return text for errors
  if (!res.ok) {
    if (contentType.includes('application/json')) {
      const errBody = await res.json().catch(()=>({ message: 'Erro desconhecido' }));
      throw errBody;
    }
    const text = await res.text().catch(()=>null);
    throw { message: text || ('HTTP ' + res.status) };
  }
  if (contentType.includes('application/json')) return res.json();
  // if success but not JSON, return raw text
  return res.text();
}
async function loadInstituicoes(){
  const data=await request('GET','/instituicoes');
  listaInst.innerHTML='';
  const sel=document.getElementById('disciplina-instituicao');
  sel.innerHTML='';
  for(const i of data){
    const li=document.createElement('li');
    li.textContent=`${i.nome} ${i.sigla?'- '+i.sigla:''}`;
    const actions=document.createElement('div');
    actions.className='item-actions';
    const edit=document.createElement('button');
    edit.textContent='Editar';
    edit.onclick=()=>{(document.getElementById('instituicao-id')).value=i.id;document.getElementById('instituicao-nome').value=i.nome;document.getElementById('instituicao-sigla').value=i.sigla||'';};
    const del=document.createElement('button');
    del.textContent='Excluir';
    del.onclick=()=>{pendingDelete={type:'instituicao',id:i.id};modalText.textContent=`Confirma exclusão da instituição ${i.nome}?`;modal.className='';};
    actions.appendChild(edit);actions.appendChild(del);li.appendChild(actions);listaInst.appendChild(li);
    const opt=document.createElement('option');opt.value=i.id;opt.textContent=i.nome;sel.appendChild(opt);
  }
  await loadDisciplinas();
}
async function loadDisciplinas(){
  const data=await request('GET','/disciplinas');
  listaDisc.innerHTML='';
  const sel=document.getElementById('turma-disciplina');
  sel.innerHTML='';
  for(const d of data){
    const li=document.createElement('li');
    li.textContent=`${d.nome} ${d.codigo?'- '+d.codigo:''} (${d.instituicao_nome})`;
    const actions=document.createElement('div');actions.className='item-actions';
    const edit=document.createElement('button');edit.textContent='Editar';edit.onclick=()=>{(document.getElementById('disciplina-id')).value=d.id;document.getElementById('disciplina-nome').value=d.nome;document.getElementById('disciplina-codigo').value=d.codigo||'';document.getElementById('disciplina-instituicao').value=d.instituicao_id;};
    const del=document.createElement('button');del.textContent='Excluir';del.onclick=()=>{pendingDelete={type:'disciplina',id:d.id};modalText.textContent=`Confirma exclusão da disciplina ${d.nome}?`;modal.className='';};
    actions.appendChild(edit);actions.appendChild(del);li.appendChild(actions);listaDisc.appendChild(li);
    const opt=document.createElement('option');opt.value=d.id;opt.textContent=d.nome;sel.appendChild(opt);
  }
  await loadTurmas();
}
async function loadTurmas(){
  const data=await request('GET','/turmas');
  listaTur.innerHTML='';
  const selAlunoTurma = document.getElementById('aluno-turma');
  if (selAlunoTurma) selAlunoTurma.innerHTML = '';
  for(const t of data){
    const li=document.createElement('li');
    li.textContent=`${t.codigo?t.codigo+' - ':''}${t.periodo?t.periodo+' - ':''}${t.disciplina_nome}`;
    const actions=document.createElement('div');actions.className='item-actions';
    const edit=document.createElement('button');edit.textContent='Editar';edit.onclick=()=>{(document.getElementById('turma-id')).value=t.id;document.getElementById('turma-codigo').value=t.codigo||'';document.getElementById('turma-periodo').value=t.periodo||'';document.getElementById('turma-disciplina').value=t.disciplina_id;};
    const del=document.createElement('button');del.textContent='Excluir';del.onclick=()=>{pendingDelete={type:'turma',id:t.id};modalText.textContent=`Confirma exclusão da turma ${t.codigo||t.id}?`;modal.className='';};
      const exp=document.createElement('button');exp.textContent='Exportar CSV';
      const imp=document.createElement('button');
      imp.textContent='Importar alunos';
      imp.onclick=async ()=>{
        const csv = prompt('Cole o CSV com duas colunas (matricula, nome). Linhas adicionais serão ignoradas.');
        if (!csv) return;
        try {
          await request('POST', `/turmas/${t.id}/import-csv`, { csv });
          alert('Importação concluída');
          await loadTurmas();
        } catch (err) { alert(err.message || JSON.stringify(err)); }
      };
    exp.onclick=async ()=>{
      try{
        const r=await fetch('/turmas/'+t.id+'/exportar', { credentials: 'same-origin' });
        if(!r.ok){
          const err = await r.json().catch(()=>({message:'Erro ao exportar'}));
          return alert(err.message || 'Erro ao exportar CSV');
        }
        const blob = await r.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const cd = r.headers.get('content-disposition') || '';
        const m = cd.match(/filename\s*=\s*"?([^\";]+)"?/);
        a.download = (m && m[1]) ? m[1] : ('turma_' + t.id + '.csv');
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        alert('CSV gerado com sucesso');
      }catch(err){
        alert(err.message || 'Erro ao exportar CSV');
      }
    };
    actions.appendChild(edit);actions.appendChild(del);actions.appendChild(imp);actions.appendChild(exp);li.appendChild(actions);listaTur.appendChild(li);
    if (selAlunoTurma) {
      const opt = document.createElement('option'); opt.value = t.id; opt.textContent = (t.codigo? t.codigo + ' - ' : '') + (t.periodo? t.periodo + ' - ' : '') + (t.disciplina_nome || ('Turma ' + t.id));
      selAlunoTurma.appendChild(opt);
    }
  }
}
async function loadAlunos(){
  try {
    const data = await request('GET', '/alunos');
    listaAlunos.innerHTML = '';
    for (const a of data) {
      const li = document.createElement('li');
      li.textContent = `${a.matricula || ''} - ${a.nome} ${a.id_turma ? '(' + a.id_turma + ')' : ''}`;
      const actions = document.createElement('div'); actions.className = 'item-actions';
      const edit = document.createElement('button'); edit.textContent = 'Editar'; edit.onclick = ()=>{document.getElementById('aluno-id').value = a.id; document.getElementById('aluno-matricula').value = a.matricula||''; document.getElementById('aluno-nome').value = a.nome||''; if(document.getElementById('aluno-turma')) document.getElementById('aluno-turma').value = a.id_turma; };
      const del = document.createElement('button'); del.textContent = 'Excluir'; del.onclick = ()=>{pendingDelete={type:'aluno',id:a.id};modalText.textContent=`Confirma exclusão do aluno ${a.nome}?`;modal.className='';};
      actions.appendChild(edit); actions.appendChild(del); li.appendChild(actions); listaAlunos.appendChild(li);
    }
  } catch (err) { console.error('Erro carregando alunos', err); }
}
formInst.addEventListener('submit',async e=>{e.preventDefault();const id=(document.getElementById('instituicao-id')).value;const nome=document.getElementById('instituicao-nome').value;const sigla=document.getElementById('instituicao-sigla').value;try{if(id)await request('PUT',`/instituicoes/${id}`,{nome,sigla});else await request('POST','/instituicoes',{nome,sigla});document.getElementById('instituicao-id').value='';document.getElementById('instituicao-nome').value='';document.getElementById('instituicao-sigla').value='';await loadInstituicoes()}catch(err){alert(err.message||JSON.stringify(err))}});
document.getElementById('instituicao-cancel').addEventListener('click',()=>{document.getElementById('instituicao-id').value='';document.getElementById('instituicao-nome').value='';document.getElementById('instituicao-sigla').value=''});
formDisc.addEventListener('submit',async e=>{e.preventDefault();const id=(document.getElementById('disciplina-id')).value;const nome=document.getElementById('disciplina-nome').value;const codigo=document.getElementById('disciplina-codigo').value;const instituicao_id=document.getElementById('disciplina-instituicao').value;try{if(id)await request('PUT',`/disciplinas/${id}`,{nome,codigo,instituicao_id});else await request('POST','/disciplinas',{nome,codigo,instituicao_id});document.getElementById('disciplina-id').value='';document.getElementById('disciplina-nome').value='';document.getElementById('disciplina-codigo').value='';await loadDisciplinas()}catch(err){alert(err.message||JSON.stringify(err))}});
document.getElementById('disciplina-cancel').addEventListener('click',()=>{document.getElementById('disciplina-id').value='';document.getElementById('disciplina-nome').value='';document.getElementById('disciplina-codigo').value=''});
formTur.addEventListener('submit',async e=>{e.preventDefault();const id=(document.getElementById('turma-id')).value;const codigo=document.getElementById('turma-codigo').value;const periodo=document.getElementById('turma-periodo').value;const disciplina_id=document.getElementById('turma-disciplina').value;try{if(id)await request('PUT',`/turmas/${id}`,{codigo,periodo,disciplina_id});else await request('POST','/turmas',{codigo,periodo,disciplina_id});document.getElementById('turma-id').value='';document.getElementById('turma-codigo').value='';document.getElementById('turma-periodo').value='';await loadTurmas()}catch(err){alert(err.message||JSON.stringify(err))}});
document.getElementById('turma-cancel').addEventListener('click',()=>{document.getElementById('turma-id').value='';document.getElementById('turma-codigo').value='';document.getElementById('turma-periodo').value=''});
modalCancel.addEventListener('click',()=>{pendingDelete=null;modal.className='modal-hidden'});
modalConfirm.addEventListener('click',async ()=>{
  if(!pendingDelete){modal.className='modal-hidden';return}
  try{
    if(pendingDelete.type==='instituicao')await request('DELETE',`/instituicoes/${pendingDelete.id}`);
    else if(pendingDelete.type==='disciplina')await request('DELETE',`/disciplinas/${pendingDelete.id}`);
    else if(pendingDelete.type==='turma')await request('DELETE',`/turmas/${pendingDelete.id}`);
    else if(pendingDelete.type==='aluno')await request('DELETE',`/alunos/${pendingDelete.id}`);
    pendingDelete=null;modal.className='modal-hidden';await loadInstituicoes();await loadAlunos();
  }catch(err){modal.className='modal-hidden';alert(err.message||JSON.stringify(err))}
});

formAluno && formAluno.addEventListener('submit', async e=>{
  e.preventDefault();
  const id = (document.getElementById('aluno-id')).value;
  const matricula = document.getElementById('aluno-matricula').value;
  const nome = document.getElementById('aluno-nome').value;
  const id_turma = document.getElementById('aluno-turma').value;
  try{
    if(id) await request('PUT', `/alunos/${id}`, { matricula, nome, id_turma });
    else await request('POST', '/alunos', { matricula, nome, id_turma });
    document.getElementById('aluno-id').value='';document.getElementById('aluno-matricula').value='';document.getElementById('aluno-nome').value='';
    await loadAlunos();
  }catch(err){alert(err.message||JSON.stringify(err))}
});
document.getElementById('aluno-cancel') && document.getElementById('aluno-cancel').addEventListener('click', ()=>{document.getElementById('aluno-id').value='';document.getElementById('aluno-matricula').value='';document.getElementById('aluno-nome').value='';});

loadInstituicoes().then(()=>loadAlunos());
