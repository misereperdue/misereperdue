// Profile mini popover opens from a real touch tap (WebKit, iPhone emulation): chat avatar and Globe author pill,
// repeated taps (cache path), dark/light. Local assets, mocked APIs/WebSockets only.
// MP_PLAYWRIGHT=<playwright or playwright-core> MP_BROWSER=webkit node tools/test-profile-tap-touch.cjs
const pw=require(process.env.MP_PLAYWRIGHT||'playwright'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const ROOT=path.resolve(__dirname,'..'),ORIGIN='https://misereperdue.com',OUT=process.env.MP_TEST_ARTIFACTS||'/tmp/mp-profile-tap-touch';fs.mkdirSync(OUT,{recursive:true});
const T={'.html':'text/html','.css':'text/css','.js':'application/javascript','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.webp':'image/webp','.json':'application/json','.mp4':'video/mp4'};
const me={username:'tester',points:4,hasRecovery:true,hasPassword:true,member:true},other={username:'other',points:12,member:true,bio:'Hello there',createdAt:Date.now()-9e9};
const th={id:'t1',title:'Hello',pinned:false,content:'<p>x</p>',author:'other',createdAt:Date.now()-9e4,lastActivity:Date.now()-3e3,category:'general',tags:[],excerpt:'x',replies:[]};
(async()=>{const KIND=process.env.MP_BROWSER||'webkit';const browser=await pw[KIND].launch(KIND==='chromium'?{executablePath:process.env.MP_CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']}:{});
for(const theme of ['dark','light']){
 const dev=KIND==='webkit'?pw.devices['iPhone 14']:{viewport:{width:390,height:844},deviceScaleFactor:2,hasTouch:true,isMobile:true};
 const c=await browser.newContext({...dev,colorScheme:theme,serviceWorkers:'block'});const errors=[];
 await c.addInitScript(()=>{localStorage.setItem('chat_token','test-only');sessionStorage.setItem('rc_later','1');});
 await c.routeWebSocket(/api\.misereperdue\.com/,s=>{setTimeout(()=>s.send(JSON.stringify({t:'hello',you:me,messages:[{id:'m1',user:'other',text:'hi there',ts:Date.now()}],online:1,caps:{}})),40);});
 await c.route('**/*',async r=>{const u=new URL(r.request().url());if(u.origin===ORIGIN){const f=path.join(ROOT,u.pathname==='/'?'index.html':decodeURIComponent(u.pathname));if(fs.existsSync(f)&&fs.statSync(f).isFile())return r.fulfill({path:f,contentType:T[path.extname(f)]||'application/octet-stream'});return r.fulfill({status:404,body:''});}
  if(u.pathname.startsWith('/api/avatarimg/'))return r.fulfill({path:ROOT+'/img/icon-192.png',contentType:'image/png'});let d={ok:true,messages:[],count:0};
  if(u.pathname==='/api/me')d={ok:true,user:me};else if(u.pathname.startsWith('/api/user/'))d={ok:true,user:other};else if(u.pathname==='/api/ws-ticket')d={ticket:'t'};else if(u.pathname==='/api/forum/categories')d={ok:true,categories:[{id:'general',name:'General'}]};else if(u.pathname==='/api/forum/threads')d={ok:true,threads:[th,{...th,id:'t2',title:'Two'}]};else if(u.pathname.startsWith('/api/forum/thread/'))d={ok:true,thread:th,replies:[]};
  return r.fulfill({json:d,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*'}});});
 const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));
 const tapOpen=async(sel,name)=>{const el=p.locator(sel).first();await el.waitFor({timeout:15000});const bb=await el.boundingBox();
  await p.touchscreen.tap(bb.x+bb.width*.4,bb.y+bb.height/2);await p.waitForTimeout(800);
  const r=await p.evaluate(()=>{const b=document.querySelector('.mp-pb');if(!b)return null;const q=b.getBoundingClientRect(),cs=getComputedStyle(b);return{inn:b.classList.contains('is-in'),out:b.classList.contains('is-out'),vis:cs.visibility,l:q.left,r:q.right,t:q.top,b:q.bottom,w:q.width,h:q.height,vw:innerWidth,vh:innerHeight,name:(b.querySelector('.mp-pb-body')||b).textContent};});
  assert(r,`${name}: popover did not open from a touch tap`);assert(r.inn&&!r.out&&r.vis==='visible',`${name}: popover not shown ${JSON.stringify(r)}`);
  assert(r.w>100&&r.h>100&&r.l>=0&&r.r<=r.vw&&r.t>=0&&r.b<=r.vh,`${name}: popover off screen ${JSON.stringify(r)}`);assert(/other/.test(r.name),name+': wrong profile');
  if(theme==='dark')await p.screenshot({path:`${OUT}/${name}.png`});
  await p.waitForTimeout(400);await p.touchscreen.tap(r.vw/2,8);await p.waitForTimeout(500);await p.keyboard.press('Escape');await p.waitForTimeout(400);
  assert.equal(await p.locator('.mp-pb:not(.is-out)').count(),0,name+': popover did not close');};
 await p.goto(ORIGIN+'/#journal');await p.waitForTimeout(1500);
 for(const i of [1,2,3])await tapOpen('#chat .chat-avatar-click','chat-avatar-'+i);
 await p.goto(ORIGIN+'/#globe');await p.locator('.forum-thread-row').first().waitFor({timeout:15000});await p.locator('.forum-thread-row').first().tap();await p.waitForTimeout(1200);
 for(const i of [1,2])await tapOpen('.forum-author-pill-btn[data-username]','globe-author-'+i);
 assert.deepEqual(errors,[]);console.log(JSON.stringify({kind:KIND,theme,passed:'touch tap opens profile popover in chat and Globe, repeat taps, closes'}));await c.close();}
await browser.close();})().catch(e=>{console.error(e);process.exit(1)});
