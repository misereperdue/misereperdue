// Tap-anchored profile popover (default; ?pop=0 = old popover, persisted): WebKit iPhone 14, real touch taps near every edge/corner and on
// chat avatars in a scrolled chat, dark/light. On by default; ?pop=0 persists the old popover; ?pop=2 back on.
// Local assets, mocked APIs/WebSockets, service worker blocked. MP_PLAYWRIGHT=<playwright[-core]> node tools/test-profile-pop2.cjs
const pw=require(process.env.MP_PLAYWRIGHT||'playwright'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const ROOT=path.resolve(__dirname,'..'),ORIGIN='https://misereperdue.com',OUT=process.env.MP_TEST_ARTIFACTS||'/tmp/mp-profile-pop2';fs.mkdirSync(OUT,{recursive:true});
const T={'.html':'text/html','.css':'text/css','.js':'application/javascript','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.webp':'image/webp','.json':'application/json','.mp4':'video/mp4'};
const me={username:'tester',points:4,hasRecovery:true,hasPassword:true,member:true},other={username:'other',points:12,member:true,bio:'Hello there',createdAt:Date.now()-9e9};
const msgs=Array.from({length:40},(_,i)=>({id:'m'+i,user:i%3?'other':'tester',text:'message '+i,ts:Date.now()-(40-i)*6e4}));
(async()=>{const browser=await pw.webkit.launch();const shots=[];
for(const theme of ['dark','light']){
 const c=await browser.newContext({...pw.devices['iPhone 14'],colorScheme:theme,serviceWorkers:'block'});const errors=[];
 await c.addInitScript(()=>{localStorage.setItem('chat_token','test-only');sessionStorage.setItem('rc_later','1');});
 await c.routeWebSocket(/api\.misereperdue\.com/,s=>{setTimeout(()=>s.send(JSON.stringify({t:'hello',you:me,messages:msgs,online:1,caps:{}})),40);});
 await c.route('**/*',async r=>{const u=new URL(r.request().url());if(u.origin===ORIGIN){const f=path.join(ROOT,u.pathname==='/'?'index.html':decodeURIComponent(u.pathname));if(fs.existsSync(f)&&fs.statSync(f).isFile())return r.fulfill({path:f,contentType:T[path.extname(f)]||'application/octet-stream'});return r.fulfill({status:404,body:''});}
  if(u.pathname.startsWith('/api/avatarimg/'))return r.fulfill({path:ROOT+'/img/icon-192.png',contentType:'image/png'});let d={ok:true,messages:[],count:0};
  if(u.pathname==='/api/me')d={ok:true,user:me};else if(u.pathname.startsWith('/api/user/'))d={ok:true,user:other};else if(u.pathname==='/api/ws-ticket')d={ticket:'t'};else if(u.pathname==='/api/messages')d={ok:true,messages:msgs,badges:{}};
  return r.fulfill({json:d,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*'}});});
 const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));
 const state=()=>p.evaluate(()=>{const b=document.querySelector('.mp-pb:not(.is-out)');if(!b)return null;const q=b.getBoundingClientRect(),ax=parseFloat(b.style.getPropertyValue('--ax')),below=b.classList.contains('is-below');
  const hdr=Math.max(0,...[...document.querySelectorAll('.panel.on .chat-head,.nav')].map(h=>h.getBoundingClientRect()).filter(r=>r.height&&r.bottom<innerHeight/2).map(r=>r.bottom));return{hdr,inn:b.classList.contains('is-in'),below,l:q.left,r:q.right,t:q.top,b:q.bottom,w:q.width,h:q.height,tipX:q.left+ax,tipY:below?q.top-13:q.bottom+13,vw:innerWidth,vh:innerHeight};});
 const close=async()=>{await p.keyboard.press('Escape');await p.waitForTimeout(450);assert.equal(await p.locator('.mp-pb:not(.is-out)').count(),0,'did not close');};
 const check=(s,x,y,name)=>{assert(s&&s.inn,name+': did not open');const M=10;
  assert(s.l>=M-.5&&s.r<=s.vw-M+.5&&s.t>=M-.5&&s.b<=s.vh-M+.5,name+': outside the viewport margin '+JSON.stringify(s));
  const clampX=Math.max(s.l+26,Math.min(x,s.r-26));assert(Math.abs(s.tipX-clampX)<=1.5,name+`: stem x ${s.tipX} not at tap ${x}`);
  const roomB=s.vh-M-(y+32),roomA=y-32-Math.max(M,s.hdr+8);/* t529u: the card never covers the top bars */if(roomB>=s.h+13)assert(s.below,name+': should open below');else if(roomA>=s.h+13)assert(!s.below,name+': should flip above');
  if((s.below&&roomB>=s.h+13)||(!s.below&&roomA>=s.h+13))assert(Math.abs(s.tipY-y)<=36,name+`: stem tip ${s.tipY} far from tap ${y}`);};
 const flag=()=>p.evaluate(()=>document.documentElement.getAttribute('data-pop'));
 // 1) on by default; 2) ?pop=0 = old popover and survives a relaunch; ?pop=2 back on
 await p.goto(ORIGIN+'/?pop=0#journal');await p.waitForTimeout(500);await p.goto(ORIGIN+'/#journal');await p.waitForTimeout(800);
 assert.equal(await flag(),null,'?pop=0 not persisted');
 await p.goto(ORIGIN+'/?pop=2#journal');await p.waitForTimeout(500);assert.equal(await p.evaluate(()=>localStorage.getItem('mp-pop')),null,'?pop=2 did not clear');
 await p.evaluate(()=>localStorage.removeItem('mp-pop'));await p.goto(ORIGIN+'/#journal');await p.locator('#chat .chat-avatar-click').first().waitFor({timeout:15000});await p.waitForTimeout(800);
 assert.equal(await flag(),'2','not on by default');
 // 3) taps near every edge/corner (fixed test targets, real touch)
 await p.evaluate(()=>{const W=innerWidth,H=innerHeight,X=[4,W/2-24,W-52],Y=[56,H/2-20,H-44],pts={};['t','m','b'].forEach((r,i)=>['l','c','r'].forEach((q,j)=>pts[r+q]=[X[j],Y[i]]));
  for(const[k,[x,y]]of Object.entries(pts)){const e=document.createElement('button');e.id='pt-'+k;e.textContent=k;e.style.cssText=`position:fixed;left:${x}px;top:${y}px;width:48px;height:40px;z-index:2147482000;opacity:.6`;
   e.addEventListener('click',ev=>{ev.stopPropagation();MPChat.openUserSheet('other',e);});document.body.appendChild(e);}});
 for(const k of ['tl','tc','tr','ml','mc','mr','bl','bc','br'])for(const fx of [.15,.85]){const bb=await p.locator('#pt-'+k).boundingBox();const x=bb.x+bb.width*fx,y=bb.y+bb.height*.5;
  await p.touchscreen.tap(x,y);await p.waitForTimeout(700);const s=await state();if(!s&&process.env.DBG)console.log(k,fx,await p.evaluate(([x,y])=>{const e=document.elementFromPoint(x,y);return e&&(e.id||e.className)+' pb='+document.querySelectorAll('.mp-pb').length+' '+innerHeight},[x,y]));check(s,x,y,`${theme} ${k} ${fx}`);
  if(fx===.15){const f=`${OUT}/${theme}-${k}.png`;await p.screenshot({path:f});shots.push(f);}await close();}
 await p.evaluate(()=>document.querySelectorAll('[id^=pt-]').forEach(e=>e.remove()));
 // 4) real chat avatars in a scrolled chat: top, middle and bottom of the visible list
 const avs=await p.locator('#chat .chat-avatar-click').evaluateAll(es=>es.map(e=>{const q=e.getBoundingClientRect();const x=q.x+q.width*.6,y=q.y+q.height*.4,h=document.elementFromPoint(x,y);return h&&e.contains(h)?[x,y]:null;}).filter(Boolean));
 assert(avs.length>=3,'not enough visible avatars');
 for(const[x,y]of [avs[0],avs[avs.length>>1],avs[avs.length-1]]){await p.touchscreen.tap(x,y);await p.waitForTimeout(700);check(await state(),x,y,theme+' avatar@'+Math.round(y));await close();}
 await p.evaluate(()=>{const l=document.querySelector('#chat .chat-messages, #chat .chat-list, #chat [class*=messages]');l&&(l.scrollTop=Math.max(0,l.scrollTop-300));});await p.waitForTimeout(400);
 const av2=await p.locator('#chat .chat-avatar-click').evaluateAll(es=>es.map(e=>{const q=e.getBoundingClientRect();const x=q.x+q.width*.5,y=q.y+q.height*.5,h=document.elementFromPoint(x,y);return h&&e.contains(h)?[x,y]:null;}).filter(Boolean));
 {const[x,y]=av2[av2.length>>1];await p.touchscreen.tap(x,y);await p.waitForTimeout(700);check(await state(),x,y,theme+' scrolled avatar');if(theme==='dark'){await p.screenshot({path:OUT+'/dark-avatar.png'});shots.push(OUT+'/dark-avatar.png');}await close();}
 // 5) ?pop=0 escape hatch: old popover, still opens on screen
 await p.goto(ORIGIN+'/?pop=0#journal');await p.locator('#chat .chat-avatar-click').first().waitFor({timeout:15000});await p.waitForTimeout(800);
 assert.equal(await p.evaluate(()=>[document.documentElement.getAttribute('data-pop'),localStorage.getItem('mp-pop')].join()),',0','pop=0 did not switch back');
 {const[x,y]=av2[av2.length>>1];await p.touchscreen.tap(x,y);await p.waitForTimeout(700);const s=await state();assert(s&&s.inn&&s.l>=0&&s.r<=s.vw,'old popover broken');await close();}
 assert.deepEqual(errors,[]);console.log(JSON.stringify({theme,passed:'on by default, ?pop=0 persists old popover, ?pop=2 back on, 18 edge/corner touch taps, scrolled chat avatars'}));await c.close();}
await browser.close();fs.writeFileSync(OUT+'/shots.json',JSON.stringify(shots));})().catch(e=>{console.error(e);process.exit(1)});
