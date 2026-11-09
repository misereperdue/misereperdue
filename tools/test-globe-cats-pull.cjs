// Globe pull: category pills ride the pull with the list; top bar stays still. APIs mocked; no writes.
const pw=require(process.env.MP_PLAYWRIGHT||'playwright'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const ROOT=path.resolve(__dirname,'..'),ORIGIN='https://misereperdue.com',OUT=process.env.MP_TEST_ARTIFACTS||'/tmp/mp-globe-cats-pull';fs.mkdirSync(OUT,{recursive:true});
const T={'.html':'text/html','.css':'text/css','.js':'application/javascript','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.webp':'image/webp','.json':'application/json'};
const th={id:'t1',title:'Hello',pinned:false,content:'<p>x</p>',author:'tester',createdAt:Date.now()-9e4,lastActivity:Date.now()-3e3,category:'general',tags:[],excerpt:'x',replies:[]};
const user={username:'tester',points:4,hasRecovery:true,hasPassword:true,member:true};
(async()=>{const browser=await pw.chromium.launch({executablePath:process.env.MP_CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
for(const[theme,width,height]of[['dark',390,844],['light',390,844],['dark',360,780],['light',360,780]]){
 const c=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,colorScheme:theme,serviceWorkers:'block'});const posts=[];
 await c.addInitScript(()=>{localStorage.setItem('chat_token','test-only');sessionStorage.setItem('rc_later','1');});
 await c.routeWebSocket(/api\.misereperdue\.com/,()=>{});
 await c.route('**/*',async r=>{const u=new URL(r.request().url());if(u.origin===ORIGIN){const f=path.join(ROOT,u.pathname==='/'?'index.html':decodeURIComponent(u.pathname));if(fs.existsSync(f)&&fs.statSync(f).isFile())return r.fulfill({path:f,contentType:T[path.extname(f)]||'application/octet-stream'});return r.fulfill({status:404,body:''});}
  if(r.request().method()!=='GET')posts.push(u.pathname);let d={ok:true,messages:[],count:0};if(u.pathname==='/api/me')d={ok:true,user};else if(u.pathname==='/api/forum/categories')d={ok:true,categories:[{id:'general',name:'General'},{id:'music',name:'Music'},{id:'art',name:'Art'}]};else if(u.pathname==='/api/forum/threads')d={ok:true,threads:[th,{...th,id:'t2',title:'Two'}]};else if(u.pathname==='/api/ws-ticket')d={ticket:'t'};
  return r.fulfill({json:d,headers:{'access-control-allow-origin':'*'}});});
 const p=await c.newPage();await p.goto(ORIGIN+'/#globe');await p.locator('.forum-pullpost').waitFor();await p.waitForTimeout(1200);
 const pos=()=>p.evaluate(()=>({cats:document.querySelector('.forum-cats').getBoundingClientRect().y,list:document.querySelector('.forum-thread-row,.forum-thread').getBoundingClientRect().y,top:document.querySelector('.forum-topbar').getBoundingClientRect().y}));
 const r0=await pos();
 // Start the pull on a category pill.
 await p.locator('.forum-cats .forum-cat').nth(1).evaluate(el=>{const b=el.getBoundingClientRect();window.__pull=(type,y)=>{const t=new Touch({identifier:1,target:el,clientX:b.x+b.width/2,clientY:y});el.dispatchEvent(new TouchEvent(type,{bubbles:true,cancelable:true,touches:type==='touchend'?[]:[t],changedTouches:[t]}));};__pull('touchstart',b.y+5);__pull('touchmove',b.y+30);__pull('touchmove',b.y+60);});
 await p.waitForTimeout(120);const r1=await pos();if(width===390&&theme==='dark')await p.screenshot({path:OUT+'/mid-pull.png'});
 assert(r1.cats-r0.cats>10,'category pills did not follow the pull '+JSON.stringify({r0,r1}));assert(Math.abs((r1.cats-r0.cats)-(r1.list-r0.list))<0.5,'pills and list moved differently');assert.equal(r1.top,r0.top,'top bar moved');
 const st=()=>p.evaluate(()=>[...document.querySelectorAll('.forum-cats .forum-cat')].slice(0,4).map(c=>{const i=c.querySelector('.forum-cat-in');return{h:c.getBoundingClientRect().height/c.offsetHeight,lab:i?i.getBoundingClientRect().height/i.offsetHeight:1}}));const s1=await st();
 assert(s1.some(x=>x.h>1.08&&x.h<1.26),'pills did not stretch '+JSON.stringify(s1));assert(s1.every(x=>x.h>=1&&x.lab<1.04&&x.lab>0.96),'label distorted '+JSON.stringify(s1));assert(new Set(s1.map(x=>x.h.toFixed(3))).size>1,'no stagger');
 await p.locator('.forum-cats .forum-cat').nth(1).evaluate(()=>__pull('touchend',0));await p.waitForTimeout(900);const r2=await pos();assert((await st()).every(x=>Math.abs(x.h-1)<0.01),'pills did not spring back');
 if(!(await p.locator('#forum-title, .forum-compose, #forum-new').count())){assert(Math.abs(r2.cats-r0.cats)<0.5&&Math.abs(r2.list-r0.list)<0.5,'did not spring back together');}
 // A sideways drag on the pills still scrolls them, not the pull.
 await p.goto(ORIGIN+'/#globe');await p.locator('.forum-pullpost').waitFor();await p.waitForTimeout(800);const s0=await pos();
 await p.locator('.forum-cats .forum-cat').nth(1).evaluate(el=>{const b=el.getBoundingClientRect();const f=(type,x,y)=>{const t=new Touch({identifier:2,target:el,clientX:x,clientY:y});el.dispatchEvent(new TouchEvent(type,{bubbles:true,cancelable:true,touches:type==='touchend'?[]:[t],changedTouches:[t]}));};f('touchstart',b.x+40,b.y+5);f('touchmove',b.x+10,b.y+8);f('touchmove',b.x-30,b.y+10);f('touchend',0,0);});
 await p.waitForTimeout(150);assert.equal((await pos()).cats,s0.cats,'sideways drag pulled the page');assert.deepEqual(posts.filter(x=>x.startsWith('/api/forum')),[],'unexpected forum writes');
 console.log(JSON.stringify({theme,width,shift:+(r1.cats-r0.cats).toFixed(2),passed:'pills follow pull with list, top bar still, spring back, sideways drag ignored'}));await c.close();}
await browser.close();})().catch(e=>{console.error(e);process.exit(1)});
