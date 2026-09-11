(function(){
  'use strict';
  var GROUP_ORDER = ["K3 Alef","K3 Bet","K4 Alef","K4 Bet","K5 Alef","K5 Bet",
    "1° Alef","1° Bet","2° Alef","2° Bet","3° Alef","3° Bet","4° Alef","4° Bet",
    "5° Alef","5° Bet","6° Alef","6° Bet","7° Alef","7° Bet","8° Alef","8° Bet",
    "9° Alef","9° Bet","10° Alef","10° Bet","11° Alef","11° Bet","12° Alef","12° Bet"];

  var SECTIONS = [
    {id:"Preescolar", label:"Preescolar", cls:"pre"},
    {id:"Primaria", label:"Primaria", cls:"pri"},
    {id:"Bachillerato", label:"Bachillerato", cls:"bac"}
  ];

  var DECIDED = {
    "K5 Bet": "Jacob Goleburn"
  };

  var app = document.getElementById("app");
  var state = {view:'home',group:null,allCandidates:[],loaded:false,gruposAbiertos:{},groups:[],sending:false};
  var api = window.EcoAPI;
  var PENDING_KEY = 'ecofriends_pending_vote_v2';
  var syncing = false;
  var modal = null;


  function esc(s){
    return String(s).replace(/[&<>"']/g, function(c){
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];
    });
  }
  function initials(name){
    var parts = name.trim().split(/\s+/);
    return ((parts[0]||"")[0]||"") + ((parts[1]||"")[0]||"");
  }
  function avatar(candidate){
    if(!candidate.foto_url) return '<div class="avatar">' + esc(initials(candidate.nombre)) + '</div>';
    var style = window.ecofriendsPhotoStyle ? window.ecofriendsPhotoStyle(candidate.foto_url) : '';
    return '<div class="avatar"><img src="' + esc(candidate.foto_url) + '" alt=""' +
      (style ? ' style="' + esc(style) + '"' : '') + '></div>';
  }
  function deviceId(){
    var k = "ecofriends_device_id";
    var v = localStorage.getItem(k);
    if(!v){ v = (crypto.randomUUID ? crypto.randomUUID() : (Date.now()+"-"+Math.random())); localStorage.setItem(k, v); }
    return v;
  }
  function groupsInSection(sectionId){
    var set = {};
    state.allCandidates.forEach(function(c){ if(c.seccion === sectionId) set[c.grupo] = true; });
    if(sectionId === "Preescolar") set["K5 Bet"] = true;
    return GROUP_ORDER.filter(function(g){ return set[g]; });
  }

  function render(){
    if(state.view === "home") return renderHome();
    if(state.view === "ballot") return renderBallot();

  }

  function renderHome(){
    var html = '';
    SECTIONS.forEach(function(s){
      var groups = groupsInSection(s.id);
      if(!groups.length) return;
      html += '<div class="section-block ' + s.cls + '"><h2>' + esc(s.label) + '</h2><div class="groups-grid">';
      groups.forEach(function(g){
        if(DECIDED[g]){
          html += '<div class="group-card done"><span class="g">' + esc(g) + '</span>' +
            '<span class="c">Ya decidido 🎉</span></div>';
        } else if(!state.gruposAbiertos[g]){
          html += '<div class="group-card locked"><span class="g">' + esc(g) + '</span>' +
            '<span class="c">🔒 ' + (state.groups.find(function(item){return item.grupo===g;})?.completed_at ? 'Finalizado' : 'Aún no abre') + '</span></div>';
        } else {
          var count = state.allCandidates.filter(function(c){ return c.grupo === g; }).length;
          html += '<button class="group-card" data-section="' + s.id + '" data-group="' + esc(g) + '">' +
            '<span class="g">' + esc(g) + '</span><span class="c">' + count + ' candidatos</span></button>';
        }
      });
      html += '</div></div>';
    });
    app.innerHTML = html;
    app.querySelectorAll('[data-group]').forEach(function(btn){
      btn.addEventListener('click', function(){
        state.section = btn.getAttribute('data-section');
        state.group = btn.getAttribute('data-group');
        state.view = 'ballot';
        render();
      });
    });
  }

  function renderBallot(){
    if(!state.gruposAbiertos[state.group]){state.view='home';return renderHome();}
    var group = state.group;
    var html = '<div class="breadcrumbs">' +
      '<button data-crumb="home">Inicio</button><span class="sep">/</span>' + esc(group) + '</div>';

    var cands = state.allCandidates.filter(function(c){ return c.grupo === group; })
      .sort(function(a,b){ return a.orden - b.orden; });

    html += '<div class="ballot-banner"><div class="banner-inner">' +
      '<div class="banner-kicker">Elige al Ecofriend de</div>' +
      '<div class="banner-title">' + esc(group) + '</div></div></div>';
    html += '<div class="ballot-card"><div class="candidates-grid">';
    cands.forEach(function(c){
      html += '<button class="candidate-btn" data-id="' + c.id + '" data-name="' + esc(c.nombre) + '">' +
        avatar(c) +
        '<div class="cand-name">' + esc(c.nombre) + '</div>' +
        '</button>';
    });
    html += '</div></div>';
    app.innerHTML = html;
    bindCrumbs();
    app.querySelectorAll('.candidate-btn').forEach(function(btn){
      btn.addEventListener('click', function(){
        openConfirm(btn.getAttribute('data-id'), btn.getAttribute('data-name'));
      });
    });
  }

  function bindCrumbs(){
    var h = app.querySelector('[data-crumb="home"]');
    if(h) h.addEventListener('click', function(){ state.view='home'; render(); syncGroups(); });
  }

  function notice(message){document.getElementById('connection-status').textContent=message;}
  function readPending(){
    const raw=localStorage.getItem(PENDING_KEY);
    if(!raw) return null;
    const vote=JSON.parse(raw);
    if(!vote.id || !vote.device || !Number.isInteger(vote.candidate) || !['pending','saved'].includes(vote.status)) throw new Error('Invalid saved vote');
    return vote;
  }
  function storePending(vote){localStorage.setItem(PENDING_KEY,JSON.stringify(vote));}
  function closeModal(){if(modal){modal.remove();modal=null;}}
  function fatal(){
    closeModal();
    app.innerHTML='<div class="thanks"><h2>Este puesto necesita revisión</h2><p>No se pudo acceder al registro local del voto. Llama al responsable antes de volver a votar o borrar los datos del navegador.</p></div>';
    state.view='blocked';
  }
  function showPending(){
    closeModal();state.view='pending';
    app.innerHTML='<div class="thanks"><h2 tabindex="-1" id="pending-title">Vamos a comprobar tu voto</h2><p>La conexión no permitió confirmar el guardado.<br>No elijas otro candidato ni cambies de equipo hasta comprobarlo.</p><button class="recovery-button btn-confirm" id="retry-vote">Comprobar el mismo voto</button></div>';
    document.getElementById('pending-title').focus();
    document.getElementById('retry-vote').addEventListener('click',()=>withVoteLock(sendPending));
  }
  function showSaved(){
    closeModal();state.view='success';
    app.innerHTML='<div class="thanks"><div class="big-check">✓</div><h2 id="vote-success-title" tabindex="-1">¡Voto registrado!</h2><p>Gracias por participar. Tu voto ya quedó guardado.<br>Pulsa Aceptar cuando sea el turno del siguiente estudiante.</p><button type="button" class="btn-confirm btn-next-vote" id="next-vote">Aceptar y continuar con el siguiente voto</button></div>';
    document.getElementById('vote-success-title').focus();
    document.getElementById('next-vote').addEventListener('click',()=>withVoteLock(async()=>{
      const pending=readPending();
      if(pending && pending.status!=='saved') return showPending();
      localStorage.removeItem(PENDING_KEY);
      await syncGroups();
      if(!state.loaded) return load();
      state.view=state.gruposAbiertos[state.group]?'ballot':'home';render();
    }));
  }
  async function withVoteLock(action){
    if(state.sending) return;
    if(!navigator.locks || !crypto.randomUUID){notice('Abre el sitio con HTTPS en un Chromebook actualizado.');return;}
    try {
      await navigator.locks.request('ecofriends-vote',{ifAvailable:true},async lock=>{
        if(!lock){notice('Hay un voto en proceso en otra pestaña. Continúa en esa pestaña.');return;}
        state.sending=true;
        document.querySelectorAll('.confirm-box button, #retry-vote, #next-vote').forEach(button=>button.disabled=true);
        try{await action();}finally{state.sending=false;}
      });
    }catch(error){fatal();}
  }
  async function sendPending(){
    const vote=readPending();
    if(!vote){state.view='home';render();return;}
    if(vote.status==='saved') return showSaved();
    let result;
    try {
      result=await api.rpc('ecofriends_cast_vote',{p_request_id:vote.id,p_candidato_id:vote.candidate,p_dispositivo_id:vote.device});
    }catch(error){showPending();return;}
    if(result.status==='saved' && result.id===vote.id){
      vote.status='saved';storePending(vote);notice('');showSaved();
    }else if(result.status==='closed' || result.status==='invalid'){
      localStorage.removeItem(PENDING_KEY);closeModal();
      await syncGroups();state.view='home';render();
      notice(result.status==='closed'?'El salón fue cerrado. Este voto no se registró; avisa al responsable.':'El candidato ya no está disponible. Este voto no se registró; avisa al responsable.');
    }else{fatal();}
  }
  function openConfirm(candidatoId,nombre){
    if(state.sending || modal || !state.gruposAbiertos[state.group]) return;
    try {
      const pending=readPending();if(pending) return pending.status==='saved'?showSaved():showPending();
    }catch(error){fatal();return;}
    const candidate=state.allCandidates.find(c=>String(c.id)===String(candidatoId));
    if(!candidate) return;
    modal=document.createElement('div');modal.className='confirm-overlay';
    modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-labelledby','confirm-title');
    modal.innerHTML='<div class="confirm-box">'+avatar(candidate)+'<h3 id="confirm-title">¿Votar por '+esc(nombre)+'?</h3><p>Este voto no se puede cambiar después.</p><div class="confirm-actions"><button class="btn-cancel" id="cancel-vote">Cancelar</button><button class="btn-confirm" id="confirm-vote">Confirmar</button></div></div>';
    document.body.appendChild(modal);
    modal.querySelector('#cancel-vote').addEventListener('click',()=>{if(!state.sending) closeModal();});
    modal.addEventListener('click',event=>{if(event.target===modal && !state.sending) closeModal();});
    modal.addEventListener('keydown',event=>{
      if(event.key==='Escape' && !state.sending) closeModal();
      if(event.key==='Tab'){
        const buttons=[...modal.querySelectorAll('button:not(:disabled)')];
        if(!buttons.length){event.preventDefault();return;}
        if(event.shiftKey && document.activeElement===buttons[0]){event.preventDefault();buttons[buttons.length-1].focus();}
        else if(!event.shiftKey && document.activeElement===buttons[buttons.length-1]){event.preventDefault();buttons[0].focus();}
      }
    });
    modal.querySelector('#cancel-vote').focus();
    modal.querySelector('#confirm-vote').addEventListener('click',()=>withVoteLock(async()=>{
      if(!readPending()) storePending({id:crypto.randomUUID(),candidate:Number(candidatoId),device:deviceId(),group:state.group,status:'pending'});
      if(modal) modal.querySelector('#confirm-vote').textContent='Guardando…';
      await sendPending();
    }));
  }
  async function syncGroups(){
    if(syncing) return;
    syncing=true;
    try {
      const groups=await api.groups();
      const changed=JSON.stringify(groups)!==JSON.stringify(state.groups);
      state.groups=groups;
      state.gruposAbiertos=Object.fromEntries(groups.map(g=>[g.grupo,g.voting_open]));
      notice('');
      if(state.sending || ['success','pending','blocked'].includes(state.view)) return;
      if(state.view==='ballot' && !state.gruposAbiertos[state.group]){closeModal();state.view='home';render();notice('El salón se cerró. Espera a que el responsable habilite el siguiente.');}
      else if(changed && state.loaded && state.view==='home') render();
    }catch(error){notice('Sin conexión con el servidor. Revisa el wifi; los salones se actualizarán al reconectar.');}
    finally{syncing=false;}
  }
  async function load(){
    try{
      const pending=readPending();
      if(pending){state.group=pending.group;pending.status==='saved'?showSaved():showPending();}
      const candidates=await api.candidates();state.allCandidates=candidates;
      await syncGroups();state.loaded=true;
      if(!pending){state.view='home';render();}
    }catch(error){
      try{if(readPending()) return;}catch(storageError){fatal();return;}
      app.innerHTML='<div class="thanks"><h2>No se pudo cargar la votación</h2><p>Revisa la conexión a internet y vuelve a intentar.</p><button class="recovery-button" id="reload">Volver a cargar</button></div>';
      document.getElementById('reload').addEventListener('click',load);
    }
  }
  document.getElementById('nav-vote').addEventListener('click',()=>{
    if(state.sending || ['success','pending','blocked'].includes(state.view)) return;
    closeModal();state.view='home';render();syncGroups();
  });
  window.addEventListener('storage',event=>{
    if(event.key!==PENDING_KEY || state.sending) return;
    try{
      const pending=readPending();closeModal();
      if(pending){state.group=pending.group;pending.status==='saved'?showSaved():showPending();}
      else{state.view='home';render();syncGroups();}
    }catch(error){fatal();}
  });
  window.addEventListener('online',syncGroups);
  window.addEventListener('offline',()=>notice('Sin conexión a internet. Avisa al responsable antes de cambiar de equipo.'));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden) syncGroups();});
  setInterval(()=>{if(!document.hidden) syncGroups();},3000);
  load();
})();
