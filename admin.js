(function(){
  'use strict';
  const api=window.EcoAPI,esc=api.esc,app=document.getElementById('app');
  const SESSION_KEY='ecofriends_admin_session_v2';
  let token=null,snapshot=null,busy=false,refreshing=false,view='login',generation=0;
  try{token=sessionStorage.getItem(SESSION_KEY);localStorage.removeItem('ecofriends_admin_code');}catch(error){}
  function toast(message,error=false){const element=document.getElementById('toast');element.textContent=message;element.className='toast show'+(error?' error':'');setTimeout(()=>element.className='toast',4000);}
  function confirmDialog(message,{danger=false,confirmLabel='Confirmar',cancelLabel='Cancelar'}={}){
    return new Promise(resolve=>{
      const overlay=document.createElement('div');overlay.className='modal-overlay';
      overlay.innerHTML='<div class="modal-box" role="alertdialog" aria-modal="true"><p class="modal-message"></p><div class="modal-actions"><button class="btn secondary modal-cancel" type="button"></button><button class="btn modal-confirm" type="button"></button></div></div>';
      overlay.querySelector('.modal-message').textContent=message;
      const confirmButton=overlay.querySelector('.modal-confirm');confirmButton.textContent=confirmLabel;if(danger)confirmButton.classList.add('danger');
      overlay.querySelector('.modal-cancel').textContent=cancelLabel;
      function close(result){overlay.remove();document.removeEventListener('keydown',onKey);resolve(result);}
      function onKey(event){if(event.key==='Escape')close(false);}
      overlay.querySelector('.modal-cancel').onclick=()=>close(false);
      confirmButton.onclick=()=>close(true);
      overlay.addEventListener('mousedown',event=>{if(event.target===overlay)close(false);});
      document.addEventListener('keydown',onKey);
      document.body.appendChild(overlay);
      confirmButton.focus();
    });
  }
  function forget(){token=null;generation++;try{sessionStorage.removeItem(SESSION_KEY);}catch(error){};document.body.classList.remove('printing-report');login();}
  function handle(error){if(error.code==='42501'){forget();toast('La sesión venció. Ingresa de nuevo.',true);}else toast(error.message||'Revisa la conexión e intenta de nuevo.',true);}
  async function rpc(name,args={}){return api.rpc(name,{p_token:token,...args});}
  function login(){
    view='login';
    app.innerHTML='<div class="card activation"><h2>Código de administrador</h2><p class="hint">Ingresa tu código para controlar los salones y consultar los resultados.</p><form id="login-form"><label for="code-input">Código</label><input id="code-input" type="password" autocomplete="off" required maxlength="200"><div id="login-error" class="error-msg" role="alert"></div><button class="btn" id="enter-btn">Entrar</button></form></div>';
    document.getElementById('login-form').addEventListener('submit',async event=>{
      event.preventDefault();if(busy)return;busy=true;
      const button=document.getElementById('enter-btn');button.disabled=true;button.textContent='Verificando…';
      try{
        const result=await api.rpc('ecofriends_login',{p_code:document.getElementById('code-input').value.trim()});
        if(result.error){document.getElementById('login-error').textContent=result.error;return;}
        token=result.token;sessionStorage.setItem(SESSION_KEY,token);generation++;await loadPanel();
      }catch(error){const box=document.getElementById('login-error');if(box)box.textContent='No se pudo iniciar sesión. Revisa la conexión y el almacenamiento del navegador.';}
      finally{busy=false;button.disabled=false;button.textContent='Entrar';}
    });
    document.getElementById('code-input').focus();
  }
  async function loadPanel(){
    view='loading';document.body.classList.remove('printing-report');app.innerHTML='<div class="loading">Cargando panel…</div>';
    try{snapshot=await rpc('ecofriends_admin_snapshot');view='panel';renderPanel();}
    catch(error){handle(error);if(token){app.innerHTML='<div class="card"><p>No se pudo cargar el panel.</p><button class="btn" id="reload-panel">Volver a intentar</button></div>';document.getElementById('reload-panel').onclick=loadPanel;}}
  }
  function renderPanel(){
    app.innerHTML='<div class="card"><h2>Jornada de votación</h2><p class="hint">Abre los salones que necesites o habilita todos de una vez. Al terminar, revisa los totales y ciérralos.</p><div id="sync-status" role="status"></div><div class="toolbar"><button class="btn secondary" id="refresh">Actualizar</button><button class="btn" id="open-all">Abrir todos</button><button class="btn danger" id="close-all">Cerrar todos</button><button class="btn" id="final-report">Generar informe final / PDF</button><button class="btn secondary" id="logout">Cerrar sesión</button></div><div id="saved-reports"></div></div><div class="card" id="groups"></div><details class="card"><summary>Consultar resultados por candidato</summary><div id="live-results"></div></details>';
    ['Preescolar','Primaria','Bachillerato'].forEach(section=>{
      const block=document.createElement('section');block.innerHTML='<h2 class="section-title">'+esc(section)+'</h2>';
      const grid=document.createElement('div');grid.className='admin-groups-grid';block.appendChild(grid);
      const voted=snapshot.groups.filter(g=>g.seccion===section).map(g=>({orden:g.orden,decided:false,g}));
      const decided=(snapshot.decided||[]).filter(g=>g.seccion===section).map(g=>({orden:g.orden,decided:true,g}));
      voted.concat(decided).sort((a,b)=>a.orden-b.orden).forEach(entry=>{
        if(entry.decided){
          const g=entry.g;
          const card=document.createElement('div');card.className='admin-group decided-group';
          card.innerHTML='<div><h3>'+esc(g.grupo)+'</h3><div class="g-status">Designado sin votación</div><p class="participation">Ganador: '+esc(g.nombre)+'</p></div>';
          grid.appendChild(card);
          return;
        }
        const g=entry.g;
        const row=document.createElement('div');row.className='admin-group';row.dataset.group=g.grupo;
        row.innerHTML='<div><h3>'+esc(g.grupo)+'</h3><div class="g-status"></div><p class="participation"></p><form class="expected-form"><span class="expected-label">Estudiantes que votarán</span><div class="expected-input-row"><input type="number" min="0" max="500" step="1" aria-label="Estudiantes esperados de '+esc(g.grupo)+'" placeholder="Sin definir"><button>Guardar cantidad</button></div></form></div><div class="group-buttons"><button class="btn group-control"></button><button class="btn danger group-reset" type="button">Reiniciar votos</button></div>';
        const input=row.querySelector('input');input.addEventListener('input',()=>input.dataset.dirty='true');
        row.querySelector('form').addEventListener('submit',event=>{
          event.preventDefault();const count=input.value===''?null:Number(input.value);
          if(count!==null && (!Number.isInteger(count)||count<0||count>500))return toast('Escribe una cantidad entre 0 y 500.',true);
          action(async()=>{await rpc('ecofriends_admin_set_expected',{p_grupo:g.grupo,p_expected:count});delete input.dataset.dirty;toast('Cantidad guardada.');});
        });
        row.querySelector('.group-control').addEventListener('click',async()=>{
          const current=snapshot.groups.find(item=>item.grupo===g.grupo);
          if(current.voting_open){
            const expected=current.expected_voters===null?'sin cantidad esperada definida':current.expected_voters+' esperados';
            if(!await confirmDialog('Cerrar '+g.grupo+': '+current.total+' votos recibidos, '+expected+'. Confirma que todos los puestos terminaron de guardar.',{confirmLabel:'Cerrar salón'}))return;
          }else if(current.completed_at && !await confirmDialog(g.grupo+' ya fue finalizado. ¿Reabrirlo conservando sus votos?',{confirmLabel:'Reabrir'}))return;
          action(async()=>{await rpc('ecofriends_admin_set_group',{p_grupo:g.grupo,p_open:!current.voting_open});toast(g.grupo+(current.voting_open?' cerrado.':' habilitado.'));});
        });
        row.querySelector('.group-reset').addEventListener('click',async()=>{
          const current=snapshot.groups.find(item=>item.grupo===g.grupo);
          if(!await confirmDialog('¿Borrar los '+current.total+' votos de '+g.grupo+' y dejarlo en cero? Esta acción no se puede deshacer.',{danger:true,confirmLabel:'Borrar votos'}))return;
          if(!await confirmDialog('Confirma otra vez: se eliminarán permanentemente '+current.total+' votos de '+g.grupo+'.',{danger:true,confirmLabel:'Sí, eliminar'}))return;
          action(async()=>{const deleted=await rpc('ecofriends_admin_reset_group',{p_grupo:g.grupo});toast(g.grupo+': '+deleted+' votos eliminados. Salón reiniciado y cerrado.');});
        });
        grid.appendChild(row);
      });document.getElementById('groups').appendChild(block);
    });
    document.getElementById('refresh').onclick=()=>refresh();
    document.getElementById('open-all').onclick=async()=>{if(await confirmDialog('¿Abrir todos los salones, incluidos los finalizados? Se conservarán todos los votos registrados.',{confirmLabel:'Abrir todos'}))action(async()=>{await rpc('ecofriends_admin_open_all');toast('Todos los salones están habilitados.');});};
    document.getElementById('close-all').onclick=async()=>{if(await confirmDialog('¿Cerrar todos los salones? Confirma que los puestos terminaron de guardar.',{danger:true,confirmLabel:'Cerrar todos'}))action(async()=>{await rpc('ecofriends_admin_close_all');toast('Todos los salones están cerrados.');});};
    document.getElementById('final-report').onclick=async()=>{
      const issues=snapshot.groups.filter(g=>!g.completed_at || (g.expected_voters!==null && Number(g.total)!==Number(g.expected_voters)));
      if(issues.length && !await confirmDialog('Hay '+issues.length+' salones pendientes o con diferencias de participación. El informe los señalará. ¿Generarlo de todos modos?',{confirmLabel:'Generar de todos modos'}))return;
      action(async()=>showReport(await rpc('ecofriends_admin_report')));
    };
    document.getElementById('logout').onclick=()=>action(async()=>{await rpc('ecofriends_logout');forget();});
    paint();
  }
  function paint(){
    if(view!=='panel')return;
    const open=snapshot.groups.filter(g=>g.voting_open);
    document.getElementById('sync-status').textContent=(open.length===1?'Abierto: '+open[0].grupo:open.length?'Salones abiertos: '+open.length+' de '+snapshot.groups.length:'Todos los salones cerrados')+' · Actualizado '+new Date(snapshot.generated_at).toLocaleTimeString('es-CO');
    app.querySelectorAll('.admin-group:not(.decided-group)').forEach(row=>{
      const g=snapshot.groups.find(item=>item.grupo===row.dataset.group);row.classList.toggle('open',g.voting_open);
      row.querySelector('.g-status').textContent=g.voting_open?'Abierto':g.completed_at?'Finalizado':'Pendiente';
      const total=Number(g.total),expected=g.expected_voters;
      row.querySelector('.participation').textContent=total+' votos recibidos'+(expected===null?'': ' de '+expected+' esperados'+(total<expected?' · Faltan '+(expected-total):total>expected?' · Revisar: '+(total-expected)+' de más':' · Total completo'));
      row.querySelector('.participation').classList.toggle('mismatch',expected!==null && total>expected);
      const input=row.querySelector('input');if(document.activeElement!==input && !input.dataset.dirty) input.value=expected===null?'':expected;
      const button=row.querySelector('.group-control');button.textContent=g.voting_open?'Cerrar salón':g.completed_at?'Reabrir salón':'Abrir salón';button.disabled=busy;
      row.querySelector('form button').disabled=busy;
    });
    document.getElementById('final-report').disabled=busy||open.length>0;
    document.getElementById('close-all').disabled=busy||open.length===0;
    document.getElementById('open-all').disabled=busy||open.length===snapshot.groups.length;
    document.getElementById('live-results').innerHTML=window.EcoReport.markup(snapshot,false);
    const saved=document.getElementById('saved-reports');saved.innerHTML='';
    if(snapshot.reports?.length){
      const label=document.createElement('p');label.textContent='Informes guardados:';saved.appendChild(label);
      snapshot.reports.forEach(report=>{const button=document.createElement('button');button.className='btn secondary';button.textContent=window.EcoReport.date(report.created_at);button.style.marginBottom='8px';button.onclick=()=>action(async()=>showReport(await rpc('ecofriends_admin_report',{p_report_id:report.id})));saved.appendChild(button);});
    }
  }
  async function refresh(force=false){
    if(!token || view!=='panel' || refreshing || (busy&&!force))return;
    refreshing=true;const stamp=generation;
    try{const data=await rpc('ecofriends_admin_snapshot');if(stamp===generation && view==='panel'){snapshot=data;paint();}}
    catch(error){if(stamp===generation && view==='panel'){if(error.code==='42501')handle(error);else document.getElementById('sync-status').textContent='Sin conexión: los conteos pueden estar desactualizados. Revisa el wifi.';}}
    finally{refreshing=false;}
  }
  async function action(callback){
    if(busy)return;busy=true;generation++;
    app.querySelectorAll('button').forEach(button=>button.disabled=true);
    try{await callback();if(view==='panel'){snapshot=await rpc('ecofriends_admin_snapshot');}}
    catch(error){handle(error);}
    finally{busy=false;app.querySelectorAll('button').forEach(button=>button.disabled=false);if(view==='panel')paint();}
  }
  function showReport(data){
    view='report';generation++;document.body.classList.add('printing-report');
    app.innerHTML='<div class="toolbar no-print"><button class="btn" id="print-report">Guardar PDF / Imprimir</button><button class="btn secondary" id="backup-report">Descargar respaldo JSON</button><button class="btn secondary" id="back-panel">Volver al panel</button></div><p class="no-print">En el diálogo de impresión, selecciona «Guardar como PDF». Este informe conserva el recuento de la fecha indicada.</p><div class="card">'+window.EcoReport.markup(data,true)+'</div>';
    document.getElementById('print-report').onclick=()=>window.print();
    document.getElementById('backup-report').onclick=()=>{
      const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='ecofriends-informe-'+data.report_id+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    };
    document.getElementById('back-panel').onclick=loadPanel;window.scrollTo(0,0);
  }
  setInterval(()=>{if(!document.hidden)refresh();},3000);
  window.addEventListener('online',()=>refresh());
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
  if(token)loadPanel();else login();
})();
