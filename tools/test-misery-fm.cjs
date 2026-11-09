// Misery FM: WebKit iPhone 14, owner vs listener, dark/light. Owner panel (LIVE pill, Stop/Skip, upload query + type,
// playlist rows), live bar under the chat header, tap-to-listen seeks to now - startedAt, WS {t:"fm"} off-air hides it.
// Local assets, mocked APIs/WebSockets (no real writes), service worker blocked. MP_PLAYWRIGHT=<playwright[-core]> node tools/test-misery-fm.cjs
const pw=require(process.env.MP_PLAYWRIGHT||'playwright'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const ROOT=path.resolve(__dirname,'..'),ORIGIN='https://misereperdue.com',OUT=process.env.MP_TEST_ARTIFACTS||'/tmp/mp-misery-fm';fs.mkdirSync(OUT,{recursive:true});
const T={'.html':'text/html','.css':'text/css','.js':'application/javascript','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp','.json':'application/json'};
// 240 s of silent 8 kHz mono WAV so real seeking works without codecs
const wav=(()=>{const n=8000*240,b=Buffer.alloc(44+n,128);b.write('RIFF',0);b.writeUInt32LE(36+n,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(8000,24);b.writeUInt32LE(8000,28);b.writeUInt16LE(1,32);b.writeUInt16LE(8,34);b.write('data',36);b.writeUInt32LE(n,40);return b;})();
const list=[{id:'aaaaaaaa01',title:'Blinding Lights',artist:'The Weeknd',dur:200,type:'audio/mpeg'},{id:'bbbbbbbb02',title:'Pink + White',artist:'Frank Ocean',dur:184,type:'audio/mp4'},{id:'cccccccc03',title:'Halo',artist:'Beyoncé',dur:261,type:'audio/mpeg'}];
const live=()=>({live:true,idx:0,startedAt:Date.now()-30e3,v:5,now:Date.now(),list});
(async()=>{const browser=await pw.webkit.launch();const shots=[];
for(const [role,theme] of [['owner','dark'],['owner','light'],['listener','dark']]){
 const me={username:role==='owner'?'dc':'fan',points:4,hasRecovery:true,hasPassword:true,member:true,owner:role==='owner'};
 const c=await browser.newContext({...pw.devices['iPhone 14'],colorScheme:theme,serviceWorkers:'block'});const errors=[],ctl=[],ups=[];let ws=null;
 await c.addInitScript(t=>{localStorage.setItem('chat_token','test-only');localStorage.setItem('theme',t);sessionStorage.setItem('rc_later','1');},theme);
 await c.routeWebSocket(/api\.misereperdue\.com/,s=>{ws=s;setTimeout(()=>s.send(JSON.stringify({t:'hello',you:me,messages:[{id:'m1',user:'fan',text:'is it on yet',ts:Date.now()-6e4}],online:2,caps:{}})),40);});
 await c.route('**/*',async r=>{const q=r.request(),u=new URL(q.url());if(u.origin===ORIGIN){const f=path.join(ROOT,u.pathname==='/'?'index.html':decodeURIComponent(u.pathname));if(fs.existsSync(f)&&fs.statSync(f).isFile())return r.fulfill({path:f,contentType:T[path.extname(f)]||'application/octet-stream'});return r.fulfill({status:404,body:''});}
  const H={'access-control-allow-origin':'*','access-control-allow-headers':'*'};
  if(u.pathname.startsWith('/api/fm/audio/'))return r.fulfill({body:wav,contentType:'audio/wav',headers:H});
  if(q.method()==='OPTIONS')return r.fulfill({status:204,headers:H});
  let d={ok:true,messages:[],count:0};
  if(u.pathname==='/api/me')d={ok:true,user:me};else if(u.pathname==='/api/ws-ticket')d={ticket:'t'};
  else if(u.pathname==='/api/fm/state')d={ok:true,fm:live()};
  else if(u.pathname==='/api/fm/control'){const b=JSON.parse(q.postData()||'{}');ctl.push(b);d={ok:true,fm:{...live(),idx:b.action==='skip'?1:0,startedAt:Date.now(),v:6}};}
  else if(u.pathname==='/api/fm/upload'){ups.push({q:Object.fromEntries(u.searchParams),type:q.headers()['content-type'],auth:!!q.headers()['authorization']});d={ok:true,id:'dddddddd04',fm:{...live(),v:7,list:[...list,{id:'dddddddd04',title:u.searchParams.get('title'),artist:u.searchParams.get('artist'),dur:180,type:'audio/mpeg'}]}};}
  return r.fulfill({json:d,headers:H});});
 const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));
 await p.goto(ORIGIN+'/#journal');await p.locator('#chat .chat-fm-bar:not([hidden])').waitFor({timeout:15000});await p.waitForTimeout(400);
 // live bar sits under the header, inside the viewport, shows the current track
 const g=await p.evaluate(()=>{const b=document.querySelector('.chat-fm-bar').getBoundingClientRect(),h=document.querySelector('#chat .chat-head').getBoundingClientRect();return{bt:b.top,bb:b.bottom,hb:h.bottom,l:b.left,r:b.right,vw:innerWidth,txt:document.querySelector('.chat-fm-bar').innerText};});
 assert(g.bt>=g.hb+2&&g.bt<=g.hb+16&&g.l>=8&&g.r<=g.vw-8,'bar position '+JSON.stringify(g));assert.match(g.txt,/LIVE[\s\S]*Blinding Lights[\s\S]*The Weeknd[\s\S]*Listen/);
 // tap to listen (iOS gesture): plays track 0, seeks ~30 s in
 await p.locator('.chat-fm-play').tap();await p.waitForFunction(()=>{const a=document.querySelector('.chat-fm-audio');return a&&a.readyState>0&&a.currentTime>20;},null,{timeout:8000});
 const a1=await p.evaluate(()=>{const a=document.querySelector('.chat-fm-audio');return{src:a.src,t:a.currentTime,paused:a.paused,lbl:document.querySelector('.chat-fm-play').getAttribute('aria-label'),ms:navigator.mediaSession&&navigator.mediaSession.metadata&&navigator.mediaSession.metadata.title};});
 assert(a1.src.endsWith('/api/fm/audio/aaaaaaaa01')&&Math.abs(a1.t-30)<3&&!a1.paused&&a1.lbl==='Mute Misery FM','listen '+JSON.stringify(a1));if(a1.ms!=null)assert.equal(a1.ms,'Blinding Lights');
 // + menu: LIVE pill on the Misery FM row, then the panel
 await p.locator('#chat .chat-plus').tap();await p.waitForTimeout(350);assert.equal(await p.locator('.chat-misery-fm em.chat-fm-pill').innerText(),'LIVE');
 await p.locator('.chat-misery-fm').tap();await p.waitForTimeout(500);
 if(role==='owner'){
  const pan=await p.evaluate(()=>{const m=document.querySelector('.chat-pbig-fm'),q=m.getBoundingClientRect();return{btn:[...m.querySelectorAll('.chat-fm-ctl button')].map(b=>b.textContent.trim()),rows:m.querySelectorAll('.chat-fm-list li').length,cur:m.querySelector('.chat-fm-list li.is-cur b').textContent,t:q.top,b:q.bottom,vh:innerHeight,bar:document.querySelector('.chat-fm-bar').getBoundingClientRect().bottom};});
  assert.deepEqual(pan.btn,['Stop','Skip','Add songs']);assert.equal(pan.rows,3);assert.equal(pan.cur,'Blinding Lights');assert(pan.t>=pan.bar+4&&pan.b<=pan.vh&&pan.b-pan.t>=300,'panel covers the bar or off screen '+JSON.stringify(pan));
  const f=`${OUT}/${role}-${theme}-panel.png`;await p.screenshot({path:f});shots.push(f);
  await p.locator('.chat-fm-ctl [data-fm="skip"]').tap();await p.waitForTimeout(400);assert.deepEqual(ctl.pop(),{action:'skip'});
  assert.equal(await p.locator('.chat-fm-list li.is-cur b').innerText(),'Pink + White');assert.equal(await p.locator('.chat-fm-np b').innerText(),'Pink + White');
  await p.locator('.chat-fm-list li').nth(2).locator('[data-fm="up"]').tap();await p.waitForTimeout(300);assert.deepEqual(ctl.pop(),{action:'move',id:'cccccccc03',dir:-1});
  await p.locator('.chat-fm-file').setInputFiles({name:'Drake - Hotline Bling.mp3',mimeType:'audio/mpeg',buffer:Buffer.from('ID3 not really audio')});
  await p.waitForFunction(()=>/Added 1 song/.test((document.querySelector('.chat-fm-msg')||{}).textContent||''),null,{timeout:12000});
  assert.deepEqual(ups,[{q:{title:'Hotline Bling',artist:'Drake',dur:'0'},type:'audio/mpeg',auth:true}]);assert.equal(await p.locator('.chat-fm-list li').count(),4);
 }else{
  const pan=await p.evaluate(()=>{const m=document.querySelector('.chat-pbig-fm');return{txt:m.innerText,owner:m.querySelectorAll('.chat-fm-ctl,.chat-fm-file,.chat-fm-list').length};});
  assert.equal(pan.owner,0,'listener sees owner controls');assert.match(pan.txt,/Blinding Lights[\s\S]*Mute/);
  const f=`${OUT}/${role}-${theme}-panel.png`;await p.screenshot({path:f});shots.push(f);
 }
 await p.keyboard.press('Escape');await p.waitForTimeout(300);
 if(theme==='dark'||role==='owner'){const f=`${OUT}/${role}-${theme}-bar.png`;await p.screenshot({path:f,clip:{x:0,y:0,width:390,height:300}});shots.push(f);}
 // WS broadcast: off air -> bar hides, audio pauses
 ws.send(JSON.stringify({t:'fm',fm:{live:false,idx:0,startedAt:0,v:99,now:Date.now(),list}}));await p.waitForTimeout(400);
 assert.equal(await p.locator('.chat-fm-bar').isHidden(),true);assert.equal(await p.evaluate(()=>document.querySelector('.chat-fm-audio').paused),true);
 assert.deepEqual(errors,[]);console.log(JSON.stringify({role,theme,passed:'bar under header, tap-to-listen seek ~30s, Media Session, LIVE pill, '+(role==='owner'?'Stop/Skip/move/upload':'no owner controls')+', WS off-air'}));await c.close();}
await browser.close();fs.writeFileSync(OUT+'/shots.json',JSON.stringify(shots));})().catch(e=>{console.error(e);process.exit(1)});
