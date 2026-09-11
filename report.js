(function(){
  'use strict';
  const esc=window.EcoAPI.esc;
  const sections=['Preescolar','Primaria','Bachillerato'];
  function date(value){return new Date(value).toLocaleString('es-CO',{timeZone:'America/Bogota',dateStyle:'long',timeStyle:'short'});}
  function markup(data,final){
    const total=data.groups.reduce((sum,g)=>sum+Number(g.total),0);
    let html='<h2>'+(final?'Informe final de votación':'Resultados para administración')+'</h2><p class="report-meta">Ecofriends 2026–2027 · Colegio Theodoro Herzl<br>Corte: '+esc(date(data.generated_at))+' (Colombia)<br>Total de votos: <strong>'+total+'</strong>'+(final?'<br>Informe: '+esc(data.report_id):'')+'</p>';
    sections.forEach(section=>{
      html+='<h2 class="report-section">'+esc(section)+'</h2>';
      const voted=data.groups.filter(g=>g.seccion===section).map(g=>({orden:g.orden,decided:false,g}));
      const decided=(data.decided||[]).filter(g=>g.seccion===section).map(g=>({orden:g.orden,decided:true,g}));
      voted.concat(decided).sort((a,b)=>a.orden-b.orden).forEach(entry=>{
        if(entry.decided){
          const g=entry.g;
          html+='<article class="report-group"><h3>'+esc(g.grupo)+'</h3><p class="report-winner">'+esc(g.nombre)+'</p><p>Designado sin votación. No se asignan votos ni porcentajes.</p></article>';
          return;
        }
        const g=entry.g;
        const count=Number(g.total);
        const max=Math.max(0,...g.candidates.map(c=>Number(c.votos)));
        const winners=g.candidates.filter(c=>Number(c.votos)===max && max>0);
        html+='<article class="report-group"><h3>'+esc(g.grupo)+'</h3><p>'+count+' votos recibidos · '+(g.voting_open?'Abierto':g.completed_at?'Finalizado':'Pendiente / cerrado')+(g.expected_voters===null?' · Cantidad esperada sin definir':' · Esperados: '+Number(g.expected_voters))+'</p>';
        if(g.expected_voters!==null && count!==Number(g.expected_voters)) html+='<p class="mismatch">Revisar participación: diferencia de '+Math.abs(count-Number(g.expected_voters))+' respecto a lo esperado.</p>';
        html+='<table class="report-table"><thead><tr><th>Candidato</th><th>Votos</th><th>%</th></tr></thead><tbody>';
        g.candidates.forEach(c=>{html+='<tr><td>'+esc(c.nombre)+'</td><td>'+Number(c.votos)+'</td><td>'+(count?(Number(c.votos)*100/count).toFixed(1):'0.0')+' %</td></tr>';});
        html+='</tbody></table><p class="report-winner">'+(!count?'Sin votos; no hay ganador.':winners.length>1?'Empate: '+winners.map(c=>esc(c.nombre)).join(' · '):(final?'Ganador: ':'Mayor votación: ')+esc(winners[0].nombre))+'</p></article>';
      });
    });
    return html;
  }
  window.EcoReport={markup,date};
})();
