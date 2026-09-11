const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const output=process.env.TEST_OUTPUT || '/tmp/ecofriends-verification';fs.mkdirSync(output,{recursive:true});
const candidates=[{id:1,nombre:'Candidata de prueba con nombre y apellidos completos',grupo:'6° Bet',seccion:'Bachillerato',orden:1},{id:2,nombre:'Segundo candidato de prueba',grupo:'6° Bet',seccion:'Bachillerato',orden:2},{id:3,nombre:'Candidato del siguiente salón',grupo:'7° Alef',seccion:'Bachillerato',orden:1}];
let groups=[{grupo:'6° Bet',seccion:'Bachillerato',orden:1,voting_open:true,completed_at:null,expected_voters:null},{grupo:'7° Alef',seccion:'Bachillerato',orden:2,voting_open:false,completed_at:null,expected_voters:null}];
const votes=new Map();let writeCalls=0,delay=0,dropReply=false,validToken=true,reports=[];
function snapshot(){return {generated_at:new Date().toISOString(),groups:groups.map(g=>({...g,total:[...votes.values()].filter(v=>v.grupo===g.grupo).length,candidates:candidates.filter(c=>c.grupo===g.grupo).map(c=>({...c,votos:[...votes.values()].filter(v=>v.candidate===c.id).length}))})),decided:[{grupo:'K5 Bet',seccion:'Preescolar',nombre:'Jacob Goleburn'}],reports:reports.map(r=>({id:r.report_id,created_at:r.generated_at}))};}
async function route(request){
 const url=new URL(request.request().url());const name=url.pathname.split('/').pop();const payload=request.request().postDataJSON();
 const json=(data,status=200)=>request.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
 if(name==='ecofriends_candidatos')return json(candidates);
 if(name==='ecofriends_grupos')return json(groups);
 if(name==='ecofriends_login')return json(payload.p_code==='test-admin'?{token:'test-session'}:{error:'Código incorrecto.'});
 if(name.startsWith('ecofriends_admin') || name==='ecofriends_logout'){
  if(payload.p_token!=='test-session'||!validToken)return json({code:'42501',message:'Sesión vencida'},403);
  if(name==='ecofriends_logout'){validToken=false;return json(true);}
  if(name==='ecofriends_admin_snapshot')return json(snapshot());
  if(name==='ecofriends_admin_set_group'){
   const g=groups.find(g=>g.grupo===payload.p_grupo);
   g.voting_open=payload.p_open;g.completed_at=payload.p_open?null:new Date().toISOString();return json(true);
  }
  if(name==='ecofriends_admin_set_expected'){groups.find(g=>g.grupo===payload.p_grupo).expected_voters=payload.p_expected;return json(true);}
  if(name==='ecofriends_admin_open_all'){groups.forEach(g=>{g.voting_open=true;g.completed_at=null;});return json(true);}
  if(name==='ecofriends_admin_close_all'){groups.forEach(g=>{if(g.voting_open)g.completed_at=new Date().toISOString();g.voting_open=false;});return json(true);}
  if(name==='ecofriends_admin_report'){
   if(payload.p_report_id)return json(reports.find(r=>r.report_id===payload.p_report_id));
   if(groups.some(g=>g.voting_open))return json({message:'Cierra todos los salones'},400);
   const report={...snapshot(),report_id:'00000000-0000-4000-8000-000000000001'};reports.push(report);return json(report);
  }
 }
 if(name==='ecofriends_cast_vote'){
  writeCalls++;const existing=votes.get(payload.p_request_id);const c=candidates.find(c=>c.id===payload.p_candidato_id);
  if(!existing && !groups.find(g=>g.grupo===c.grupo).voting_open)return json({status:'closed'});
  votes.set(payload.p_request_id,existing||{id:payload.p_request_id,candidate:c.id,device:payload.p_dispositivo_id,grupo:c.grupo});
  if(delay)await new Promise(r=>setTimeout(r,delay));
  if(dropReply){dropReply=false;return request.abort('failed');}
  return json({status:'saved',id:payload.p_request_id,grupo:c.grupo});
 }
 throw new Error('Unexpected API request: '+url);
}
(async()=>{
 const server=http.createServer((req,res)=>{const filename=path.join(root,req.url==='/'?'index.html':req.url.split('?')[0]);try{res.setHeader('Content-Type',filename.endsWith('.js')?'application/javascript':filename.endsWith('.png')?'image/png':'text/html');res.end(fs.readFileSync(filename));}catch{res.writeHead(404);res.end();}}).listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_BIN?{executablePath:process.env.CHROME_BIN}:{})});const errors=[];
 async function create(){const context=await browser.newContext({viewport:{width:1365,height:900}});await context.route('**/rest/v1/**',route);await context.route('https://fonts.**/**',r=>r.abort());const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(base);await page.locator('[data-group="6° Bet"]').waitFor();return {context,page};}
 async function choose(page){await page.locator('[data-group="6° Bet"]').click();await page.locator('.candidate-btn[data-id="1"]').click();}
 try{
 const {context,page}=await create();await choose(page);delay=900;
 await page.getByRole('button',{name:'Confirmar',exact:true}).dblclick();
 await page.waitForFunction(()=>document.getElementById('confirm-vote')?.disabled);
 assert.equal(await page.getByRole('button',{name:'Cancelar',exact:true}).isDisabled(),true);
 await page.keyboard.press('Escape');assert.equal(await page.locator('.confirm-overlay').count(),1);
 await page.locator('#next-vote').waitFor();assert.equal(votes.size,1);assert.equal(writeCalls,1);delay=0;
 await page.reload();await page.locator('#next-vote').waitFor();assert.equal(await page.locator('.candidate-btn').count(),0);
 console.log('PASS: double click, in-flight cancel/Escape blocked, success survives reload.');
 await page.locator('#next-vote').click();await page.locator('.candidate-btn[data-id="1"]').click();dropReply=true;
 await page.locator('#confirm-vote').click();await page.locator('#retry-vote').waitFor();assert.equal(votes.size,2);
 await page.reload();await page.locator('#retry-vote').waitFor();await page.locator('#retry-vote').click();await page.locator('#next-vote').waitFor();assert.equal(votes.size,2);
 console.log('PASS: lost response and reload retry preserve one vote; next student uses same device.');
 const sibling=await context.newPage();await sibling.goto(base);await sibling.locator('#next-vote').waitFor();
 await page.locator('#next-vote').click();await sibling.locator('[data-group="6° Bet"]').waitFor();
 await page.locator('.candidate-btn[data-id="1"]').click();await sibling.locator('[data-group="6° Bet"]').click();await sibling.locator('.candidate-btn[data-id="1"]').click();delay=700;
 await Promise.all([page.evaluate(()=>document.getElementById('confirm-vote')?.click()),sibling.evaluate(()=>document.getElementById('confirm-vote')?.click())]);
 await page.locator('#next-vote').waitFor();await sibling.locator('#next-vote').waitFor();assert.equal(votes.size,3);delay=0;await sibling.close();
 console.log('PASS: two tabs share a vote lock and do not create duplicate submissions.');
 await page.locator('#next-vote').click();groups[0].voting_open=false;groups[0].completed_at=new Date().toISOString();groups[1].voting_open=true;
 await page.locator('[data-group="7° Alef"]').waitFor({timeout:7000});assert.equal(await page.locator('[data-group="6° Bet"]').count(),0);
 console.log('PASS: administrator group change reaches an already-open voter screen.');
 groups[0].voting_open=true;groups[1].voting_open=false;votes.clear();writeCalls=0;
 const clients=await Promise.all(Array.from({length:20},()=>create()));
 await Promise.all(clients.map(async({page})=>{await choose(page);await page.locator('#confirm-vote').click();await page.locator('#next-vote').waitFor();}));assert.equal(votes.size,20);
 await Promise.all(clients.map(async({page})=>{await page.locator('#next-vote').click();await page.locator('.candidate-btn[data-id="1"]').click();await page.locator('#confirm-vote').click();await page.locator('#next-vote').waitFor();}));assert.equal(votes.size,40);
 await Promise.all(clients.map(c=>c.context.close()));
 console.log('PASS: 20 isolated browser contexts, two students per device, 40 simulated votes.');
 const admin=await context.newPage();admin.on('pageerror',e=>errors.push(e.message));await admin.goto(base+'/admin.html');await admin.locator('#code-input').fill('test-admin');await admin.locator('#enter-btn').click();await admin.locator('#groups').waitFor();
 await admin.waitForFunction(()=>!document.querySelector('.group-control').disabled);
 assert.equal(await admin.locator('#final-report').isDisabled(),true);
 const row=admin.locator('.admin-group[data-group="6° Bet"]');await row.locator('input').fill('40');await row.locator('form button').click();await admin.waitForFunction(()=>document.querySelector('.participation').textContent.includes('40 esperados'));
 admin.on('dialog',dialog=>dialog.accept());
 const other=admin.locator('.admin-group[data-group="7° Alef"] .group-control');
 await other.click();await admin.waitForFunction(()=>document.querySelectorAll('.admin-group.open').length===2);
 assert.match(await admin.locator('#sync-status').innerText(),/Salones abiertos: 2 de 2/);
 assert.equal(await admin.locator('#open-all').isDisabled(),true);
 await admin.locator('#close-all').click();await admin.waitForFunction(()=>!document.querySelector('#final-report').disabled);
 await admin.locator('#open-all').click();await admin.waitForFunction(()=>document.querySelectorAll('.admin-group.open').length===2);
 assert.equal(votes.size,40);assert.ok(groups.every(g=>g.completed_at===null));
 await page.reload();await page.locator('[data-group="6° Bet"]').waitFor();await page.locator('[data-group="7° Alef"]').waitFor();
 await row.locator('.group-control').click();await admin.waitForFunction(()=>document.querySelectorAll('.admin-group.open').length===1);
 assert.equal(await admin.locator('#final-report').isDisabled(),true);
 await admin.locator('#close-all').click();
 console.log('PASS: multiple groups, open all preserves votes and reopens completed groups, voter access and close all.');await admin.waitForFunction(()=>!document.querySelector('#final-report').disabled);
 await admin.locator('#final-report').click();await admin.locator('#print-report').waitFor();
 assert.match(await admin.locator('#app').innerText(),/Total de votos: 40/);assert.match(await admin.locator('#app').innerText(),/Jacob Goleburn/);
 assert.match(await admin.locator('#app').innerText(),/Candidata de prueba con nombre y apellidos completos/);
 await admin.screenshot({path:output+'/report.png',fullPage:true});await admin.pdf({path:output+'/report.pdf',format:'A4',printBackground:true});
 const frozen=await admin.locator('#app .card').innerText();votes.clear();await admin.waitForTimeout(3300);assert.equal(await admin.locator('#app .card').innerText(),frozen);
 await admin.locator('#back-panel').click();await admin.locator('#groups').waitFor();await admin.setViewportSize({width:390,height:844});await admin.screenshot({path:output+'/admin-mobile.png',fullPage:true});
 assert.equal(await admin.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await admin.locator('#logout').click();await admin.locator('#code-input').waitFor();assert.equal(await admin.locator('#live-results').count(),0);
 console.log('PASS: admin counter/expected/save/close, private results, frozen report with K5 Bet, PDF, mobile width and logout.');
 assert.deepEqual(errors,[]);console.log('PASS: no JavaScript errors. Artifacts: '+output);
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
