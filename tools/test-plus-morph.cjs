// + menu submenu open timing and Back reverse-morph (dc t554u).
// WebKit, iPhone 14, dark. APIs mocked. serviceWorkers blocked.
// MP_PLUS_BASELINE=1 reports times only (for pre-change comparison).
const pw=require(process.env.MP_PLAYWRIGHT||'playwright'),path=require('path'),assert=require('assert/strict');
const ROOT=path.resolve(__dirname,'..'),ORIGIN='https://misereperdue.com';
const BASE=!!process.env.MP_PLUS_BASELINE;
const T={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp','.mp4':'video/mp4','.woff2':'font/woff2','.json':'application/json'};
(async()=>{
 const browser=await pw.webkit.launch();
 const c=await browser.newContext({...pw.devices['iPhone 14'],colorScheme:'dark',serviceWorkers:'block'});
 const user={username:'tester',member:true,owner:false,vip:true,points:40,hasRecovery:true,hasPassword:true};
 const messages=Array.from({length:20},(_,i)=>({id:'m'+i,user:i%3?'other':'tester',text:'Message '+i,ts:Date.now()-(20-i)*6e4}));
 await c.addInitScript(()=>{localStorage.setItem('chat_token','test-only');localStorage.setItem('theme','dark');sessionStorage.setItem('rc_later','1');});
 await c.routeWebSocket(/api\.misereperdue\.com/,s=>{if(!/\/api\/fm\//.test(s.url()))setTimeout(()=>s.send(JSON.stringify({t:'hello',you:user,messages,online:2,caps:{private:1,poll:1}})),40);});
 await c.route('**/*',async r=>{const u=new URL(r.request().url()),H={'access-control-allow-origin':'*'};
  if(u.origin===ORIGIN){const f=path.join(ROOT,u.pathname==='/'?'index.html':decodeURIComponent(u.pathname));const fs=require('fs');if(fs.existsSync(f)&&fs.statSync(f).isFile())return r.fulfill({path:f,contentType:T[path.extname(f)]||'application/octet-stream'});return r.fulfill({status:404,body:''});}
  if(u.hostname==='api.misereperdue.com'){if(r.request().method()==='OPTIONS')return r.fulfill({status:204,headers:H});let d={ok:true};
   if(u.pathname==='/api/me')d={ok:true,user};else if(u.pathname==='/api/messages')d={ok:true,messages,badges:{}};else if(u.pathname==='/api/ws-ticket')d={ticket:'t'};else if(u.pathname==='/api/forum/threads')d={ok:true,threads:[]};else if(u.pathname.startsWith('/api/fm/'))d={ok:true,fm:{live:false,paused:false,pos:0,idx:0,startedAt:0,v:1,now:Date.now(),list:[],q:[],upNext:[],hist:[],listeners:0,shuffle:false,repeat:'all',xf:0,note:'',sched:0}};
   return r.fulfill({json:d,headers:H});}
  if(u.hostname==='itunes.apple.com')return r.fulfill({json:{results:[]}});
  return r.fulfill({json:{}});});
 const p=await c.newPage();
 await p.goto(ORIGIN+'/#journal');
 await p.waitForSelector('[data-id="m19"]',{timeout:15000});
 await p.waitForTimeout(800);
 const tap=async sel=>{const b=await p.locator(sel).first().boundingBox();assert(b,'no '+sel);await p.touchscreen.tap(b.x+b.width/2,b.y+b.height/2);};
 const times={};
 for(const k of ['music','globe','poll','fm']){
  await tap('.chat-plus');
  await p.waitForSelector('.chat-plus-menu.is-in:not(.chat-pbig)',{timeout:5000});
  await p.waitForTimeout(200);
  const start=await p.evaluate(()=>performance.now());
  await tap(k==='fm'?'.chat-plus-menu .chat-misery-fm':`.chat-plus-menu [data-act="${k}"]`);
  await p.waitForSelector('.chat-plus-menu.chat-pbig',{timeout:5000});
  await p.waitForFunction(()=>{const m=document.querySelector('.chat-plus-menu.chat-pbig');if(!m)return false;const r=m.getBoundingClientRect();return r.height>200&&r.width>200;},{timeout:5000});
  const open=await p.evaluate(s=>performance.now()-s,start);
  times[k]={open:Math.round(open)};
  const idBefore=await p.evaluate(()=>{const m=document.querySelector('.chat-plus-menu');m&&(m.dataset.morphid='1');return !!m;});
  assert(idBefore);
  const backStart=await p.evaluate(()=>performance.now());
  const backSel='.chat-plus-menu [data-x="back"], .chat-plus-menu [aria-label="Back"]';
  if(await p.locator(backSel).count()) await tap(backSel);
  else await p.keyboard.press('Escape');
  try{
    await p.waitForFunction(()=>{const m=document.querySelector('.chat-plus-menu');return m&&!m.classList.contains('chat-pbig')&&(m.querySelector('[data-act="music"]')||m.querySelector('.chat-pmenu-row'));},{timeout:BASE?1500:5000});
  }catch(e){
    if(!BASE) throw e;
  }
  const back=await p.evaluate(s=>performance.now()-s,backStart);
  const same=await p.evaluate(()=>{const m=document.querySelector('.chat-plus-menu');return !!(m&&m.dataset.morphid==='1'&&!m.classList.contains('is-out'));});
  times[k].back=Math.round(back);
  times[k].sameNode=same;
  if(!BASE) assert(same,k+' Back replaced the menu instead of reverse-morphing');
  await p.keyboard.press('Escape');
  await p.waitForTimeout(300);
 }
 console.log(JSON.stringify({times,baseline:BASE}));
 if(!BASE){
  for(const k of Object.keys(times)){
   assert(times[k].open<1200,k+' open too slow: '+times[k].open+'ms');
   assert(times[k].sameNode,k+' lost the menu node on Back');
  }
 }
 await c.close();await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
