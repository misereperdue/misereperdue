// + menu scroll lock (dc): the chat must not scroll behind the + menu or any of its panels (iOS PWA).
// WebKit, iPhone 14 touch profile, dark + light. All APIs mocked; no real account writes.
const pw=require(process.env.MP_PLAYWRIGHT||'playwright'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const ROOT=path.resolve(__dirname,'..'),ORIGIN='https://misereperdue.com',OUT=process.env.MP_TEST_ARTIFACTS||'/tmp/mp-scroll-lock';fs.mkdirSync(OUT,{recursive:true});
const T={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp','.mp4':'video/mp4','.woff2':'font/woff2','.json':'application/json'};
(async()=>{const browser=await pw.webkit.launch();
for(const theme of ['dark','light']){
 const c=await browser.newContext({...pw.devices['iPhone 14'],colorScheme:theme,serviceWorkers:'block'}),errors=[];
 const user={username:'tester',member:true,owner:false,vip:true,points:40,hasRecovery:true,hasPassword:true};
 const messages=Array.from({length:70},(_,i)=>({id:'m'+i,user:i%3?'other':'tester',text:'Message number '+i+' in a long chat so the page scrolls',ts:Date.now()-(70-i)*6e4}));
 await c.addInitScript(([th])=>{localStorage.setItem('chat_token','test-only');localStorage.setItem('theme',th);sessionStorage.setItem('rc_later','1');},[theme]);
 await c.routeWebSocket(/api\.misereperdue\.com/,s=>{if(!/\/api\/fm\//.test(s.url()))setTimeout(()=>s.send(JSON.stringify({t:'hello',you:user,messages,online:2,caps:{private:1,poll:1}})),40);});
 await c.route('**/*',async r=>{const u=new URL(r.request().url()),H={'access-control-allow-origin':'*','access-control-allow-headers':'*'};
  if(u.origin===ORIGIN){const f=path.join(ROOT,u.pathname==='/'?'index.html':decodeURIComponent(u.pathname));if(fs.existsSync(f)&&fs.statSync(f).isFile())return r.fulfill({path:f,contentType:T[path.extname(f)]||'application/octet-stream'});return r.fulfill({status:404,body:''});}
  if(u.hostname==='api.misereperdue.com'){if(r.request().method()==='OPTIONS')return r.fulfill({status:204,headers:H});let d={ok:true};
   if(u.pathname==='/api/me')d={ok:true,user};else if(u.pathname==='/api/messages')d={ok:true,messages,badges:{}};else if(u.pathname==='/api/ws-ticket')d={ticket:'t'};else if(u.pathname==='/api/forum/threads')d={ok:true,threads:Array.from({length:30},(_,i)=>({id:'t'+i,title:'Thread '+i,user:'other',ts:Date.now()-i*36e5,replies:i,cat:'general'}))};else if(u.pathname==='/api/forum/categories')d={ok:true,categories:[]};else if(u.pathname.startsWith('/api/fm/'))d={ok:true,fm:{live:false,paused:false,pos:0,idx:0,startedAt:0,v:1,now:Date.now(),list:[],q:[],upNext:[],hist:[],listeners:0,shuffle:false,repeat:'all',xf:0,note:'',sched:0}};
   return r.fulfill({json:d,headers:H});}
  if(u.hostname==='itunes.apple.com')return r.fulfill({json:{results:[]}});
  return r.fulfill({json:{data:{products:{edges:[]}}}});});
 const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));
 await p.goto(ORIGIN+'/#journal');await p.waitForSelector('[data-id="m69"]',{timeout:15000});await p.waitForTimeout(3500);
 const Y=()=>p.evaluate(()=>Math.round(window.scrollY));
 // tap at the element's on-screen point like a finger (locator.tap() would scroll it into view first)
 const ftap=async sel=>{const b=await p.locator(sel).first().boundingBox();assert(b,'no '+sel);await p.touchscreen.tap(b.x+b.width/2,b.y+b.height/2);};
 // synthetic iOS touch drag (WebKit desktop has no Touch constructor): returns whether the page cancelled it
 const drag=(sel,dy)=>p.evaluate(([sel,dy])=>{const el=typeof sel==='string'?document.querySelector(sel):null;if(!el)return'missing '+sel;const r=el.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+Math.min(r.height/2,40);
  const ev=(type,yy)=>{const e=new Event(type,{bubbles:true,cancelable:true});const t=[{clientX:x,clientY:yy,identifier:1,target:el}];Object.defineProperty(e,'touches',{value:t});Object.defineProperty(e,'changedTouches',{value:t});el.dispatchEvent(e);return e.defaultPrevented;};
  ev('touchstart',y);const a=ev('touchmove',y+dy/2),b=ev('touchmove',y+dy);ev('touchend',y+dy);return a||b;},[sel,dy]);
 // a user's finger cancels the chat's stick-to-bottom-while-media-loads (as on a phone)
 await drag('[data-id="m40"] .chat-bubble',-60);
 const panels=[['menu',null],['music','[data-act="music"]'],['fm','.chat-misery-fm'],['poll','[data-act="poll"]'],['globe','[data-act="globe"]']];
 for(const[name,act]of panels){
  await p.evaluate(()=>window.scrollTo(0,Math.round((document.documentElement.scrollHeight-innerHeight)/2)));let y0=-1;for(let k=0;k<20;k++){await p.waitForTimeout(250);const y=await Y();if(y===y0)break;y0=y;}assert(y0>200,'chat must be scrollable '+y0);
  await ftap('.chat-plus');await p.waitForSelector('.chat-plus-menu.is-in');if(act){await ftap('.chat-plus-menu '+act);await p.waitForSelector('.chat-plus-menu.chat-pbig');}await p.waitForTimeout(500);
  {const L=await p.evaluate(()=>window.mpScrollLockState&&window.mpScrollLockState());assert(L&&L.end===false&&Math.abs(L.y-y0)<=2,name+' lock state '+JSON.stringify(L)+' '+y0);y0=L.y;assert.equal(await Y(),y0,name+' moved while opening');}
  assert.equal(await p.evaluate(()=>document.documentElement.classList.contains('mp-noscroll')&&getComputedStyle(document.documentElement).overscrollBehaviorY),'none',name+' overscroll');
  // touch drags on the chat behind (up and down) are cancelled; wheel too; a stray page scroll is pinned back
  assert.equal(await drag('[data-id="m30"] .chat-bubble',-160),true,name+': touch drag up on the chat must be cancelled');
  assert.equal(await drag('[data-id="m30"] .chat-bubble',160),true,name+': touch drag down on the chat must be cancelled');
  assert.equal(await p.evaluate(()=>{const e=new WheelEvent('wheel',{deltaY:400,bubbles:true,cancelable:true});document.querySelector('[data-id="m30"] .chat-bubble').dispatchEvent(e);return e.defaultPrevented;}),true,name+': wheel on the chat must be cancelled');
  // iOS may scroll to reveal a focused field in the panel (allowed while typing; touch is still blocked); otherwise any stray page scroll is pinned back
  await p.evaluate(()=>{const a=document.activeElement;a&&a.blur&&a.blur();});  await p.evaluate(()=>window.scrollTo(0,0));await p.waitForTimeout(150);assert.equal(await Y(),y0,name+': stray scroll not pinned');
  // non-scrollable parts of the panel don't chain to the chat either
  assert.equal(await drag('.chat-plus-menu .chat-pbig-hd, .chat-plus-menu .chat-pmenu-row',-120),true,name+': drag on the panel chrome must not scroll the chat');
  if(name==='fm'||name==='globe'){
   // the panel's own list still scrolls; at its top a downward drag doesn't chain to the page
   const sc=name==='fm'?'.chat-plus-menu .fm-sh-body':'.chat-plus-menu .chat-gp-list';
   if(name==='fm')await p.evaluate(s=>{const b=document.querySelector(s);for(let i=0;i<30;i++){const d=document.createElement('p');d.className='fm-hint';d.textContent='Filler row '+i;b.appendChild(d);}b.scrollTop=0;},sc);
   await p.waitForFunction(s=>{const b=document.querySelector(s);return b&&b.scrollHeight>b.clientHeight+40;},sc,{timeout:8000});
   assert.equal(await drag(sc,-120),false,name+': the panel list must stay scrollable');
   await p.evaluate(s=>{document.querySelector(s).scrollTop=0;},sc);assert.equal(await drag(sc,120),true,name+': overscroll at the panel top must not reach the chat');
   await p.evaluate(s=>{const b=document.querySelector(s);b.scrollTop=b.scrollHeight;},sc);assert.equal(await drag(sc,-120),true,name+': overscroll at the panel bottom must not reach the chat');
   await p.evaluate(s=>{const b=document.querySelector(s);b.scrollTop=40;},sc);assert.equal(await drag(sc,80),false,name+': scrolling back up inside the panel');
   assert.equal(await p.evaluate(s=>getComputedStyle(document.querySelector(s)).overscrollBehaviorY,sc),'contain');
  }
  if(name==='fm'&&theme==='dark'||name==='music'&&theme==='light'||name==='globe')await p.screenshot({path:`${OUT}/lock-${theme}-${name}.png`});
  // close (outside tap) → unlocked, position restored
  await p.touchscreen.tap(195,330);await p.waitForTimeout(450);
  if(await p.locator('.chat-plus-menu.is-in').count()){await p.keyboard.press('Escape');await p.waitForTimeout(400);}
  assert.equal(await p.locator('.chat-plus-menu.is-in').count(),0,name+' closed');
  assert.equal(await p.evaluate(()=>document.documentElement.classList.contains('mp-noscroll')),false,name+' unlocked');assert.equal(await Y(),y0,name+': scroll position restored');
  assert.equal(await drag('[data-id="m30"] .chat-bubble',-160),false,name+': chat scrolls normally again');
 }
 // opened at the bottom → stays at the bottom after close even if the chat grew
 await p.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));await p.waitForTimeout(200);
 await ftap('.chat-plus');await ftap('.chat-plus-menu [data-act="music"]');await p.waitForTimeout(400);
 assert.equal((await p.evaluate(()=>mpScrollLockState())).end,true);
 await p.evaluate(()=>{const s=document.createElement('div');s.style.height='300px';s.id='grow';document.querySelector('#chat').appendChild(s);});
 await ftap('.chat-plus-menu [data-x="close"]');await p.waitForTimeout(400);
 assert(await p.evaluate(()=>Math.abs(window.scrollY+innerHeight-document.documentElement.scrollHeight)<4),'kept at the bottom');
 assert.deepEqual(errors,[]);console.log(JSON.stringify({engine:'webkit',device:'iPhone 14',theme,passed:'menu/music/fm/poll/globe: touch up+down and wheel on the chat cancelled, stray scroll pinned, panel chrome cancelled, panel lists scroll with edges contained, position restored on close, bottom kept'}));await c.close();}
await browser.close();})().catch(e=>{console.error(e);process.exit(1)});
