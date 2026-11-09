// Misery FM v2: WebKit iPhone 14, owner dark+light, listener dark+light, reduced motion. The mock API runs the REAL Worker
// FM logic (worker/misery-chat/src/fm*.js) against in-memory R2/DO storage, so pause/seek/shuffle/queue/edit/upload
// behave exactly like production; no real API, no accounts, service worker blocked.
// Covers: top-bar live state on Shop/Globe/Chat/product/cart (+ off), morph open/back, chat live bar, listener sheet,
// studio (transport, seek, shuffle, repeat, drag reorder, play next, edit sheet + cover, ID3 upload), station tab,
// reactions, sync after pause/seek, stop clears every bar. MP_PLAYWRIGHT=<playwright[-core]> node tools/test-misery-fm.cjs
const pw=require(process.env.MP_PLAYWRIGHT||'playwright'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const ROOT=path.resolve(__dirname,'..'),ORIGIN='https://misereperdue.com',OUT=process.env.MP_TEST_ARTIFACTS||'/tmp/mp-misery-fm';fs.mkdirSync(OUT,{recursive:true});
const T={'.html':'text/html','.css':'text/css','.js':'application/javascript','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.webp':'image/webp','.json':'application/json'};
const SRC=ROOT+'/worker/misery-chat/src/',top=fs.readFileSync(SRC+'fm.js','utf8'),d=fs.readFileSync(SRC+'fm_do.js','utf8');
const methods=d.slice(d.indexOf('  /* ---------- Misery FM ---------- */'),d.lastIndexOf('\n}')).replace(/\n  fmCast\(obj\) \{[\s\S]*?\n  \}\n/,'\n');
const json=(x,st)=>new Response(JSON.stringify(x),{status:st||200,headers:{'Content-Type':'application/json'}}),err=(m,st)=>json({ok:false,error:m},st||400);
const COVER=fs.readFileSync(ROOT+'/tools/fixtures/fm-cover.jpg'),COVER2=fs.readFileSync(ROOT+'/tools/fixtures/fm-cover2.png');
const wav=(()=>{const n=8000*300,b=Buffer.alloc(44+n,128);b.write('RIFF',0);b.writeUInt32LE(36+n,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(8000,24);b.writeUInt32LE(8000,28);b.writeUInt16LE(1,32);b.writeUInt16LE(8,34);b.write('data',36);b.writeUInt32LE(n,40);return b;})();
function mkServer(){const objs=new Map(),bucket={put:async(k,b,o)=>{objs.set(k,{b:Buffer.from(b instanceof ArrayBuffer?new Uint8Array(b):b),ct:o&&o.httpMetadata&&o.httpMetadata.contentType})},delete:async k=>objs.delete(k),
  get:async k=>{const x=objs.get(k);return x?{size:x.b.length,body:x.b,httpEtag:'"e"',writeHttpMetadata:h=>h.set('Content-Type',x.ct||'application/octet-stream')}:null}};
 const socks=new Set(),R=new Function('json','err','bucket','socks',top+'\nreturn [fmAudio,class R{constructor(){this.state={storage:{m:new Map(),get:async k=>this.state.storage.m.get(k),put:async(k,v)=>this.state.storage.m.set(k,structuredClone(v)),setAlarm:async t=>{this.alarmAt=t},deleteAlarm:async()=>{this.alarmAt=null}}};this.env={FM_BUCKET:bucket};this.sent=[];}fmCast(o){this.sent.push(o);const s=JSON.stringify(o);for(const w of socks)try{w.send(s)}catch(e){}}async bearerUser(req){const a=req.headers.get("Authorization")||"";return a==="Bearer owner-tok"?{username:"dc",owner:true}:a==="Bearer fan-tok"?{username:"fan"}:null}deviceIdFromReq(req){return req.headers.get("X-Device-Id")||"dev"}clientIp(){return "1.1.1.1"}\n'+methods+'}];')(json,err,bucket,socks);
 return {fmAudio:R[0],r:new R[1](),objs,socks,bucket};}
const OWN={headers:{Authorization:'Bearer owner-tok'}};
async function seed(srv){const r=srv.r,call=(p,init)=>r.fmRoute(new Request('https://x'+p,init),p.split('?')[0]).then(x=>x.json());
 const up=(q)=>call('/api/fm/upload?'+q,{method:'POST',headers:{...OWN.headers,'Content-Type':'audio/mpeg'},body:new Uint8Array(400)});
 const a=await up('title=Blinding%20Lights&artist=The%20Weeknd&album=After%20Hours&year=2020&genre=R%26B&explicit=&dur=200'),b=await up('title=Pink%20%2B%20White&artist=Frank%20Ocean&album=Blonde&year=2016&dur=184'),
  c=await up('title=SOME%20MORE&artist=Future&album=Mixtape%20Pluto&year=2024&genre=Hip-Hop&explicit=1&dur=215'),e=await up('title=Halo&artist=Beyonc%C3%A9&album=I%20Am...%20Sasha%20Fierce&year=2008&dur=261');
 await call('/api/fm/art?id='+a.id,{method:'POST',headers:{...OWN.headers,'Content-Type':'image/jpeg'},body:COVER});
 await call('/api/fm/art?id='+c.id,{method:'POST',headers:{...OWN.headers,'Content-Type':'image/png'},body:COVER2});
 const w=new Uint8Array(2150);for(let i=0;i<w.length;i++)w[i]=Math.round(120+100*Math.abs(Math.sin(i/3))*Math.random());
 await call('/api/fm/wave?id='+a.id,{method:'POST',headers:{...OWN.headers,'Content-Type':'application/octet-stream'},body:w});
 const ctl=b2=>call('/api/fm/control',{method:'POST',headers:{...OWN.headers,'Content-Type':'application/json'},body:JSON.stringify(b2)});
 await ctl({action:'live'});await ctl({action:'skip'});await ctl({action:'skip'});await ctl({action:'skip'});await ctl({action:'play',id:a.id});
 r._fm.startedAt=Date.now()-42e3;await ctl({action:'note',text:'New Future album at midnight. Stay up.'});
 return {ids:[a.id,b.id,c.id,e.id],ctl,call};}
function id3(){const fr=(id,data)=>{const h=Buffer.alloc(10);h.write(id,0);h.writeUInt32BE(data.length,4);return Buffer.concat([h,data]);},tx=(id,s)=>fr(id,Buffer.concat([Buffer.from([3]),Buffer.from(s,'utf8')]));
 const body=Buffer.concat([tx('TIT2','Mask Off'),tx('TPE1','Future'),tx('TALB','FUTURE'),tx('TYER','2017'),tx('TCON','Trap'),tx('TLEN','204000'),fr('TXXX',Buffer.concat([Buffer.from([3]),Buffer.from('ITUNESADVISORY\u00001')])),
  fr('APIC',Buffer.concat([Buffer.from([0]),Buffer.from('image/jpeg\u0000'),Buffer.from([3,0]),COVER]))]);
 const ss=n=>Buffer.from([(n>>21)&127,(n>>14)&127,(n>>7)&127,n&127]);return Buffer.concat([Buffer.from('ID3'),Buffer.from([3,0,0]),ss(body.length),body,Buffer.alloc(3000,0x55)]);}
const shots={};
async function ctx(browser,{role,theme,reduced}){
 const srv=mkServer(),c=await browser.newContext({...pw.devices['iPhone 14'],colorScheme:theme,reducedMotion:reduced?'reduce':'no-preference',serviceWorkers:'block'});const errors=[];
 await c.addInitScript(([tok,theme])=>{localStorage.setItem('chat_token',tok);localStorage.setItem('chat_device','dev-'+tok);localStorage.setItem('theme',theme);sessionStorage.setItem('rc_later','1');},[role==='owner'?'owner-tok':'fan-tok',theme]);
 const me={username:role==='owner'?'dc':'fan',points:50,hasRecovery:true,hasPassword:true,member:true,owner:role==='owner'};
 await c.routeWebSocket(/api\.misereperdue\.com/,s=>{if(/\/api\/fm\/ws/.test(s.url())){srv.socks.add(s);s.onClose(()=>srv.socks.delete(s));srv.r.fmGet().then(fm=>s.send(JSON.stringify({t:'fm',fm:srv.r.fmPublic(fm)})));}
  else setTimeout(()=>s.send(JSON.stringify({t:'hello',you:me,messages:[{id:'m1',user:'fan',text:'is it on yet',ts:Date.now()-6e4}],online:3,caps:{}})),40);});
 await c.route('**/*',async rt=>{const q=rt.request(),u=new URL(q.url());if(u.origin===ORIGIN){const f=path.join(ROOT,u.pathname==='/'?'index.html':decodeURIComponent(u.pathname));if(fs.existsSync(f)&&fs.statSync(f).isFile())return rt.fulfill({path:f,contentType:T[path.extname(f)]||'application/octet-stream'});return rt.fulfill({status:404,body:''});}
  const H={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*'};
  if(u.hostname!=='api.misereperdue.com')return rt.fulfill({json:{data:{products:{edges:[]}}}});
  if(q.method()==='OPTIONS')return rt.fulfill({status:204,headers:H});
  if(u.pathname.startsWith('/api/fm/audio/'))return rt.fulfill({body:wav,contentType:'audio/wav',headers:H});
  if(/^\/api\/fm\/(art|wave)\//.test(u.pathname)){const res=await srv.fmAudio(new Request(q.url()),srv.r.env);return rt.fulfill({status:res.status,body:Buffer.from(await res.arrayBuffer()),headers:{...H,'content-type':res.headers.get('content-type')||''}});}
  if(u.pathname.startsWith('/api/fm/')){const hd={};for(const[k,v]of Object.entries(q.headers()))hd[k]=v;const res=await srv.r.fmRoute(new Request(q.url(),{method:q.method(),headers:hd,body:q.method()==='POST'?q.postDataBuffer():undefined}),u.pathname);
   return rt.fulfill({status:res?res.status:404,body:res?await res.text():'{}',contentType:'application/json',headers:H});}
  let dd={ok:true,messages:[],count:0};if(u.pathname==='/api/me')dd={ok:true,user:me};else if(u.pathname==='/api/ws-ticket')dd={ticket:'t'};else if(u.pathname==='/api/forum/threads')dd={ok:true,threads:[]};else if(u.pathname==='/api/forum/categories')dd={ok:true,categories:[]};
  return rt.fulfill({json:dd,headers:H});});
 const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource|WebSocket/.test(m.text()))errors.push('console: '+m.text());});
 return {c,p,srv,errors};}
const shot=async(p,name,clip)=>{await p.evaluate(()=>{document.querySelectorAll('.fm-sheet,.fm-sh-body,.fm-edit,.fm-edit *').forEach(b=>{if(b.scrollTop)b.scrollTop=0;});});await p.waitForTimeout(120);const f=`${OUT}/${name}.png`;await p.screenshot(clip?{path:f,clip}:{path:f});shots[name]=f;};
const hbState=p=>p.evaluate(()=>{const b=document.querySelector('.fm-on');if(!b)return null;const r=b.getBoundingClientRect(),rc=b.querySelector('.fm-ring rect');return{cls:b.className,w:r.width,h:r.height,rw:+rc.getAttribute('width'),anim:getComputedStyle(rc).animationName,txt:b.querySelector('.fm-hb-in').innerText.replace(/\s+/g,' ')};});
async function openPanel(p,h){await p.evaluate(h=>{location.hash='#'+h;},h);await p.waitForTimeout(900);}
(async()=>{const browser=await pw.webkit.launch();
// ---------- owner, dark: everything ----------
{const {c,p,srv,errors}=await ctx(browser,{role:'owner',theme:'dark'}),S=await seed(srv),[A,B,C,D]=S.ids;
 await p.goto(ORIGIN+'/#shop');await p.waitForSelector('.nav.fm-on',{timeout:15000});
 let h=await hbState(p);assert(h&&/nav/.test(h.cls)&&Math.abs(h.rw-(h.w-3))<1.5,'shop: nav ring '+JSON.stringify(h));assert.match(h.txt,/MISERY\s*FM\s*IS LIVE/);assert.equal(h.anim,'fmDash');
 await p.waitForTimeout(1200);await shot(p,'owner-dark-shop-collapsed',{x:0,y:0,width:390,height:200});
 await p.waitForSelector('.nav.fm-on.is-fm',{timeout:5000});await p.waitForTimeout(700);await shot(p,'owner-dark-shop-islive',{x:0,y:0,width:390,height:200});
 // other page types
 for(const pg of ['forum','journal','cart']){await openPanel(p,pg);const hs=await hbState(p);assert(hs,pg+': no live top bar');assert.equal(/chat-head/.test(hs.cls),pg!=='cart',pg+' targets '+hs.cls);}
 await p.evaluate(()=>{location.hash='#product';});await p.waitForTimeout(700);assert(await hbState(p),'product: no live top bar');
 // chat: morph the chat header
 await openPanel(p,'journal');await p.waitForSelector('#chat .fm-bar:not([hidden])');
 await p.locator('#journal .chat-head .chat-title').tap();await p.waitForSelector('.fm-morph');await p.waitForTimeout(600);
 const m=await p.evaluate(()=>{const e=document.querySelector('.fm-morph'),r=e.getBoundingClientRect();return{t:e.querySelector('.fm-m-t').textContent,img:!!e.querySelector('.fm-m-art img'),top:r.top,h:r.height,away:!!document.querySelector('.chat-head.fm-away'),pg:e.querySelector('.fm-pbar i').style.transform};});
 assert.equal(m.t,'Blinding Lights');assert(m.img&&m.away&&m.h>120,'morph '+JSON.stringify(m));await shot(p,'owner-dark-morphed',{x:0,y:0,width:390,height:360});
 await p.locator('.fm-morph [data-a="collapse"]').tap();await p.waitForTimeout(600);assert.equal(await p.locator('.fm-morph').count(),0);assert.equal(await p.locator('.chat-head.fm-away').count(),0);
 await shot(p,'owner-dark-back',{x:0,y:0,width:390,height:260});
 // studio via morph → sheet
 await p.locator('#journal .chat-head .chat-title').tap();await p.waitForSelector('.fm-morph [data-a="sheet"]');await p.locator('.fm-morph [data-a="sheet"]').tap();
 await p.waitForSelector('.fm-sheet .fm-tabs');await p.waitForTimeout(700);
 // listen: plays the right song at the right spot
 await p.locator('.fm-sheet [data-a="listen"]').tap();
 await p.waitForFunction(()=>{const a=[...document.querySelectorAll('.fm-audio')].find(x=>!x.paused);return a&&a.readyState>0&&a.currentTime>30;},null,{timeout:8000});
 const au=()=>p.evaluate(()=>{const a=[...document.querySelectorAll('.fm-audio')].find(x=>x._id);return a&&{id:a._id,t:a.currentTime,paused:a.paused};});
 const srvPos=async()=>{const f=await srv.r.fmGet();return f.paused?f.pos:(Date.now()-f.startedAt)/1e3;};
 let a1=await au(),sp=await srvPos();assert.equal(a1.id,A);assert(sp>40&&Math.abs(a1.t-sp)<2,'listen seek '+sp+' '+JSON.stringify(a1));
 await shot(p,'owner-dark-now');
 // pause for everyone → audio pauses; resume from the same spot
 await p.locator('.fm-sheet [data-a="pause"]').tap();await p.waitForTimeout(500);let st=await srv.r.fmGet();assert(st.paused);const pos=st.pos;
 assert.equal((await au()).paused,true,'audio did not pause');assert.equal(await p.locator('#chat .fm-bar .fm-live b').textContent(),'PAUSED');
 await p.waitForTimeout(2200);await p.locator('.fm-sheet [data-a="resume"]').tap();await p.waitForTimeout(1200);a1=await au();assert(!a1.paused&&Math.abs(a1.t-pos)<2.5,'resume spot '+pos+' '+JSON.stringify(a1));
 // seek (scrub) → audio jumps
 await p.evaluate(()=>{const s=document.querySelector('.fm-scrub');s.value=150;s.dispatchEvent(new Event('input',{bubbles:true}));s.dispatchEvent(new Event('change',{bubbles:true}));});await p.waitForTimeout(1200);
 a1=await au();sp=await srvPos();assert(Math.abs(a1.t-sp)<2&&sp>150,'seek '+sp+' '+JSON.stringify(a1));
 // skip / prev / restart / shuffle / repeat
 await p.locator('.fm-sheet [data-a="skip"]').tap();await p.waitForTimeout(500);st=await srv.r.fmGet();assert.equal(st.list[st.idx].id,B);await p.waitForTimeout(700);assert.equal((await au()).id,B,'audio follows skip');
 await p.locator('.fm-sheet [data-a="prev"]').tap();await p.waitForTimeout(500);st=await srv.r.fmGet();assert.equal(st.list[st.idx].id,A);
 await p.waitForTimeout(3200);await p.locator('.fm-sheet [data-a="restart"]').tap();await p.waitForTimeout(400);st=await srv.r.fmGet();assert(Date.now()-st.startedAt<1500,'restart');
 await p.locator('.fm-sheet [data-a="shuffle"]').tap();await p.waitForTimeout(400);assert((await srv.r.fmGet()).shuffle);assert.match(await p.locator('.fm-sheet .fm-h').first().innerText(),/shuffled/i);
 await p.locator('.fm-sheet [data-a="shuffle"]').tap();await p.waitForTimeout(300);
 for(const mode of ['one','off','all']){await p.locator('.fm-sheet [data-a="repeat"]').tap();await p.waitForTimeout(350);assert.equal((await srv.r.fmGet()).repeat,mode);}
 // reactions float + broadcast
 await p.locator('.fm-sheet [data-a="react"]').first().tap();await p.waitForTimeout(150);assert(await p.locator('.fm-float').count()>=1);assert(srv.r.sent.some(x=>x.t==='fmr'));
 // queue: drag reorder, play next, edit sheet, cover, ID3 upload
 await p.locator('.fm-sheet [data-tab="queue"]').tap();await p.waitForTimeout(400);
 const hd=await p.locator('.fm-q li').nth(3).locator('.fm-drag').boundingBox(),row0=await p.locator('.fm-q li').nth(0).boundingBox();
 await p.mouse.move(hd.x+hd.width/2,hd.y+hd.height/2);await p.mouse.down();for(let k=1;k<=8;k++)await p.mouse.move(hd.x+hd.width/2,hd.y+hd.height/2-(hd.y-row0.y)*k/8-4);await p.mouse.up();await p.waitForTimeout(600);
 st=await srv.r.fmGet();assert.equal(st.list[0].id,D,'drag to top');assert.equal(await p.locator('.fm-q li').first().getAttribute('data-id'),D);
 await p.locator(`.fm-q li[data-id="${C}"] [data-a="playnext"]`).tap();await p.waitForTimeout(400);assert.equal((await srv.r.fmGet()).q[0],C);assert.equal(await p.locator(`.fm-q li[data-id="${C}"] .fm-chip-q`).count(),1);
 await p.locator(`.fm-q li[data-id="${B}"] [data-a="edit"]`).tap();await p.waitForSelector('.fm-edit');await p.waitForTimeout(400);
 assert.equal(await p.inputValue('.fm-edit [name="title"]'),'Pink + White');assert.equal(await p.inputValue('.fm-edit [name="album"]'),'Blonde');
 await p.fill('.fm-edit [name="title"]','Pink + White (Live)');await p.fill('.fm-edit [name="genre"]','Soul');await p.fill('.fm-edit [name="notes"]','Recorded at the Blonded session.');await p.locator('.fm-edit .fm-sw').tap();
 await p.locator('.fm-edit .fm-cover-in').setInputFiles({name:'cover.png',mimeType:'image/png',buffer:COVER2});await p.waitForFunction(id=>{const t=MPFM.state().list.find(x=>x.id===id);return t&&t.art;},B,{timeout:8000});
 await p.waitForSelector('.fm-edit img');await p.waitForTimeout(300);await shot(p,'owner-dark-edit');
 await p.locator('.fm-edit [data-a="edsave"]').tap();await p.waitForTimeout(500);
 let tb=(await srv.r.fmGet()).list.find(t=>t.id===B);assert.deepEqual([tb.title,tb.genre,tb.notes,tb.explicit,!!tb.art],['Pink + White (Live)','Soul','Recorded at the Blonded session.',true,true]);
 assert.equal(await p.locator(`.fm-q li[data-id="${B}"] .fm-e`).count(),1,'E badge in queue');
 await p.locator(`.fm-q li[data-id="${B}"] [data-a="edit"]`).tap();await p.waitForSelector('.fm-edit [data-a="coverdel"]');await p.locator('.fm-edit [data-a="coverdel"]').tap();await p.waitForTimeout(500);assert.equal((await srv.r.fmGet()).list.find(t=>t.id===B).art,'');
 await p.locator('.fm-edit [data-a="edclose"]').tap();await p.waitForTimeout(300);
 await p.locator('.fm-sheet .fm-file').setInputFiles({name:'track01.mp3',mimeType:'audio/mpeg',buffer:id3()});
 await p.waitForFunction(()=>/Added/.test((document.querySelector('.fm-ups li small')||{}).textContent||''),null,{timeout:15000});
 const nt=(await srv.r.fmGet()).list.at(-1);assert.deepEqual([nt.title,nt.artist,nt.album,nt.year,nt.genre,nt.explicit,nt.dur,!!nt.art],['Mask Off','Future','FUTURE','2017','Trap',true,204,true],'ID3 tags '+JSON.stringify(nt));
 await shot(p,'owner-dark-queue');
 // station: note, schedule, crossfade, stats
 await p.locator('.fm-sheet [data-tab="station"]').tap();await p.waitForTimeout(300);
 await p.fill('.fm-note-in','Taking requests in chat');await p.locator('.fm-sheet [data-a="note"]').tap();await p.waitForTimeout(400);assert.equal((await srv.r.fmGet()).note,'Taking requests in chat');
 await p.evaluate(()=>{const s=document.querySelector('.fm-sheet input[data-a="xf"]');s.value=3;s.dispatchEvent(new Event('input',{bubbles:true}));s.dispatchEvent(new Event('change',{bubbles:true}));});await p.waitForTimeout(400);assert.equal((await srv.r.fmGet()).xf,3);
 const later=new Date(Date.now()+3*3600e3),pad=n=>String(n).padStart(2,'0');await p.fill('.fm-sched-in',`${later.getFullYear()}-${pad(later.getMonth()+1)}-${pad(later.getDate())}T${pad(later.getHours())}:${pad(later.getMinutes())}`);
 await p.locator('.fm-sheet [data-a="sched"]').tap();await p.waitForTimeout(400);assert(Math.abs((await srv.r.fmGet()).sched-later.getTime())<61e3,'schedule');
 assert.match(await p.locator('.fm-stats').innerText(),/Listening now[\s\S]*1[\s\S]*Songs played/);await shot(p,'owner-dark-station');
 // stop (confirm) → every live bar off immediately
 await p.locator('.fm-sheet [data-a="stop"]').last().tap();await p.locator('.fm-cf [data-c="1"]').tap();await p.waitForTimeout(500);
 assert.equal((await srv.r.fmGet()).live,false);assert.equal(await p.locator('.fm-on').count(),0,'top bar still live');assert.equal(await p.locator('#chat .fm-bar:not([hidden])').count(),0);
 assert.equal(await p.evaluate(()=>[...document.querySelectorAll('.fm-audio')].every(a=>a.paused)),true);
 // go live again with confirm from the Station tab
 await p.locator('.fm-sheet [data-a="golive"]').tap();await p.locator('.fm-cf [data-c="1"]').tap();await p.waitForTimeout(500);assert((await srv.r.fmGet()).live);
 assert.deepEqual(errors,[]);console.log(JSON.stringify({role:'owner',theme:'dark',passed:'top bar live on shop/globe/chat/product/cart, morph+back, listen seek, pause/resume sync, seek sync, skip/prev/restart/shuffle/repeat, reaction, drag reorder, play next, edit sheet+cover+remove cover, ID3 upload (tags+art+dur), note/crossfade/schedule/stats, stop clears bars, go live'}));await c.close();}
// ---------- owner, light ----------
{const {c,p,srv,errors}=await ctx(browser,{role:'owner',theme:'light'});await seed(srv);
 await p.goto(ORIGIN+'/#shop');await p.waitForSelector('.nav.fm-on');await p.waitForTimeout(1200);await shot(p,'owner-light-shop-collapsed',{x:0,y:0,width:390,height:200});
 await p.locator('.fm-hb-dot').tap();await p.waitForSelector('.fm-morph');await p.waitForTimeout(600);await shot(p,'owner-light-morphed',{x:0,y:0,width:390,height:360});
 await p.locator('.fm-morph [data-a="sheet"]').tap();await p.waitForSelector('.fm-sheet .fm-tabs');await p.waitForTimeout(700);await shot(p,'owner-light-now');
 await p.locator('.fm-sheet [data-tab="queue"]').tap();await p.waitForTimeout(300);await shot(p,'owner-light-queue');
 assert.deepEqual(errors,[]);console.log(JSON.stringify({role:'owner',theme:'light',passed:'shop live bar, dot opens morph, studio now/queue'}));await c.close();}
// ---------- listeners ----------
for(const theme of ['dark','light']){const {c,p,srv,errors}=await ctx(browser,{role:'listener',theme}),S=await seed(srv);
 await p.goto(ORIGIN+'/#journal');await p.waitForSelector('#chat .fm-bar:not([hidden])',{timeout:15000});await p.waitForTimeout(500);
 const hs=await hbState(p);assert(hs&&/chat-head/.test(hs.cls));
 const bar=await p.evaluate(()=>{const b=document.querySelector('#chat .fm-bar'),h=document.querySelector('#journal .chat-head').getBoundingClientRect(),r=b.getBoundingClientRect();return{top:r.top,hb:h.bottom,txt:b.innerText,pg:b.querySelector('.fm-bar-pg i').style.transform};});
 assert(bar.top>=bar.hb&&/LIVE[\s\S]*Blinding Lights/.test(bar.txt)&&/scaleX\(0\.2/.test(bar.pg),'chat bar '+JSON.stringify(bar));
 await shot(p,`listener-${theme}-chat-collapsed`,{x:0,y:0,width:390,height:260});
 // morph from the chat header → Listen inside → back
 await p.locator('#journal .chat-head .chat-title').tap();await p.waitForSelector('.fm-morph');await p.waitForTimeout(600);await shot(p,`listener-${theme}-morphed`,{x:0,y:0,width:390,height:360});
 await p.locator('.fm-morph [data-a="listen"]').tap();await p.waitForFunction(()=>[...document.querySelectorAll('.fm-audio')].some(a=>!a.paused&&a.currentTime>30),null,{timeout:8000});
 await p.locator('.fm-morph [data-a="collapse"]').tap();await p.waitForTimeout(500);await shot(p,`listener-${theme}-back`,{x:0,y:0,width:390,height:260});
 // sheet: listener view, no owner controls
 await p.locator('#chat .fm-bar-np').tap();await p.waitForSelector('.fm-sheet');await p.waitForTimeout(800);
 const v=await p.evaluate(()=>{const s=document.querySelector('.fm-sheet');return{tabs:!!s.querySelector('.fm-tabs'),owner:s.querySelectorAll('[data-a="pause"],[data-a="skip"],.fm-scrub,[data-a="edit"],.fm-file').length,up:s.querySelectorAll('.fm-list:not(.fm-hist) li').length,hist:s.querySelectorAll('.fm-hist li').length,note:(s.querySelector('.fm-note')||{}).textContent,img:!!s.querySelector('.fm-cover img'),viz:s.querySelector('.fm-viz').getAttribute('data-src'),lc:s.querySelector('.fm-lc').textContent};});
 assert(!v.tabs&&v.owner===0&&v.up===3&&v.hist>=3&&v.img&&/midnight/.test(v.note)&&/1 listening/.test(v.lc),'listener sheet '+JSON.stringify(v));assert.match(v.viz,/map/,'iOS visualizer should follow the loudness map');
 // owner pauses from another device → this listener pauses; seek → this listener jumps
 await S.ctl({action:'pause'});await p.waitForTimeout(600);assert(await p.evaluate(()=>[...document.querySelectorAll('.fm-audio')].every(a=>a.paused)),'listener did not pause');
 assert.equal(await p.locator('.fm-sheet .fm-paused').count(),1);await S.ctl({action:'resume'});await S.ctl({action:'seek',pos:120});await p.waitForTimeout(1500);
 const t2=await p.evaluate(()=>{const a=[...document.querySelectorAll('.fm-audio')].find(x=>!x.paused);return a&&a.currentTime;});assert(t2&&Math.abs(t2-121)<2.5,'listener seek sync '+t2);
 // owner edits the song → listeners see it live (title + E badge in sheet, bar)
 await S.ctl({action:'edit',id:S.ids[0],title:'Blinding Lights (Remix)',explicit:true});await p.waitForTimeout(500);
 assert.equal(await p.locator('.fm-sheet .fm-ttl b').innerText(),'Blinding Lights (Remix)');assert.equal(await p.locator('.fm-sheet .fm-ttl .fm-e').count(),1);assert.equal(await p.locator('#chat .fm-bar .fm-e').count(),1);
 await p.locator('.fm-sheet [data-a="react"]').nth(1).tap();await p.waitForTimeout(250);await shot(p,`listener-${theme}-sheet`);
 // off air: other pages turn off immediately
 await p.locator('.fm-sheet [data-a="close"]').tap();await p.waitForTimeout(500);await openPanel(p,'shop');assert(await hbState(p));
 await S.ctl({action:'stop'});await p.waitForTimeout(400);assert.equal(await p.locator('.fm-on').count(),0,'shop still live after stop');
 for(const pg of ['forum','journal','cart']){await openPanel(p,pg);assert.equal(await p.locator('.fm-on').count(),0,pg+' live while off');}
 assert.deepEqual(errors,[]);console.log(JSON.stringify({role:'listener',theme,passed:'chat bar + mini progress, morph+listen+back, sheet (no owner controls, up next, history, DJ note, cover, map visualizer), pause/seek sync from owner, live edit + E badge, reaction, stop clears every page'}));await c.close();}
// ---------- reduced motion ----------
{const {c,p,srv,errors}=await ctx(browser,{role:'listener',theme:'dark',reduced:true});await seed(srv);
 await p.goto(ORIGIN+'/#forum');await p.waitForSelector('.fm-on');await p.waitForTimeout(5000);
 const h=await hbState(p);assert(h&&!/is-fm/.test(h.cls)&&h.anim==='none','reduced motion must stay static '+JSON.stringify(h));assert(await p.locator('.fm-hb-dot').isVisible());
 await shot(p,'reduced-globe',{x:0,y:0,width:390,height:200});
 await p.locator('.fm-hb-dot').tap();await p.waitForSelector('.fm-morph');const an=await p.evaluate(()=>document.querySelector('.fm-morph').getAnimations().map(a=>Object.keys(a.effect.getKeyframes()[0]).filter(k=>!/offset|easing|composite|computedOffset/.test(k)).join()));
 assert.deepEqual(an,['opacity'],'reduced motion morph should only crossfade '+an);
 await p.locator('.fm-morph [data-a="sheet"]').tap();await p.waitForSelector('.fm-sheet');await p.locator('.fm-sheet [data-a="react"]').first().tap();
 assert.equal(await p.evaluate(()=>getComputedStyle(document.querySelector('.fm-float')).animationName),'fmFade');
 assert.deepEqual(errors,[]);console.log(JSON.stringify({role:'listener',theme:'dark',reduced:true,passed:'static ring + dot, no crossfade cycling, morph = opacity only, reactions fade'}));await c.close();}
await browser.close();fs.writeFileSync(OUT+'/shots.json',JSON.stringify(shots,null,1));})().catch(e=>{console.error(e);process.exit(1)});
