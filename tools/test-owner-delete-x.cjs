// Owner-only chat delete: thin rounded-stroke X, soft glow on hover / focus / touch press; non-owners get no button. APIs mocked.
const pw=require(process.env.MP_PLAYWRIGHT||'playwright'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const ROOT=path.resolve(__dirname,'..'),ORIGIN='https://misereperdue.com',OUT=process.env.MP_TEST_ARTIFACTS||'/tmp/mp-owner-delete-x';fs.mkdirSync(OUT,{recursive:true});
const T={'.html':'text/html','.css':'text/css','.js':'application/javascript','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.webp':'image/webp','.json':'application/json','.mp4':'video/mp4'};
(async()=>{const KIND=process.env.MP_BROWSER||'chromium';const browser=await pw[KIND].launch(KIND==='chromium'?{executablePath:process.env.MP_CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']}:{});
for(const[theme,owner]of[['dark',true],['light',true],['dark',false]]){
 const me={username:'tester',points:4,hasRecovery:true,hasPassword:true,member:true,owner};
 const c=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,colorScheme:theme,serviceWorkers:'block'});const errors=[];
 await c.addInitScript(()=>{localStorage.setItem('chat_token','test-only');sessionStorage.setItem('rc_later','1');});
 await c.routeWebSocket(/api\.misereperdue\.com/,s=>{setTimeout(()=>s.send(JSON.stringify({t:'hello',you:me,messages:[{id:'m1',user:'other',text:'hello there friend',ts:Date.now()}],online:1,caps:{}})),40);});
 await c.route('**/*',async r=>{const u=new URL(r.request().url());if(u.origin===ORIGIN){const f=path.join(ROOT,u.pathname==='/'?'index.html':decodeURIComponent(u.pathname));if(fs.existsSync(f)&&fs.statSync(f).isFile())return r.fulfill({path:f,contentType:T[path.extname(f)]||'application/octet-stream'});return r.fulfill({status:404,body:''});}
  if(u.pathname.startsWith('/api/avatarimg/'))return r.fulfill({path:ROOT+'/img/icon-192.png',contentType:'image/png'});let d={ok:true,messages:[],count:0};if(u.pathname==='/api/me')d={ok:true,user:me};else if(u.pathname==='/api/ws-ticket')d={ticket:'t'};else if(u.pathname==='/api/messages')d={ok:true,messages:[],badges:{}};
  return r.fulfill({json:d,headers:{'access-control-allow-origin':'*'}});});
 const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(ORIGIN+'/#journal');
 const bubble=p.locator('#chat .chat-bubble').first();await bubble.waitFor({timeout:15000});await p.waitForTimeout(600);
 const bb=await bubble.boundingBox();await p.mouse.move(bb.x+bb.width/2,bb.y+bb.height/2);await p.mouse.down();await p.waitForTimeout(700);await p.mouse.up();
 await p.locator('.chat-react-picker').first().waitFor({timeout:5000});await p.waitForTimeout(300);
 const del=p.locator('.chat-react-delete');
 if(!owner){assert.equal(await del.count(),0,'non-owner must not get a delete button');console.log(JSON.stringify({theme,owner,passed:'no delete button'}));await c.close();continue;}
 assert.equal(await del.count(),1);
 const svg=await del.evaluate(b=>{const s=b.querySelector('svg'),pth=s.querySelector('path');return{d:pth.getAttribute('d'),sw:s.getAttribute('stroke-width'),cap:s.getAttribute('stroke-linecap'),w:s.getBoundingClientRect().width,label:b.getAttribute('aria-label')};});
 assert.equal(svg.d,'M7 7l10 10M17 7L7 17');assert.equal(svg.sw,'1.6');assert.equal(svg.cap,'round');assert.equal(svg.label,'Delete message');assert(Math.abs(svg.w-19)<0.6);
 const shadow=()=>del.evaluate(b=>getComputedStyle(b).boxShadow);
 assert.equal(await shadow(),'none','no glow at rest');
 const db=await del.boundingBox();await p.mouse.move(db.x+db.width/2,db.y+db.height/2);await p.waitForTimeout(350);
 const hov=await shadow();assert(/rgba\(240, 68, 92, 0\.38\)/.test(hov),'hover glow '+hov);
 await p.screenshot({path:`${OUT}/hover-${theme}.png`,clip:{x:0,y:Math.max(0,db.y-120),width:390,height:240}});
 await p.mouse.move(5,5);await p.waitForTimeout(350);
 // touch press class (iOS has no :hover): pointerdown adds, pointerup removes
 const pr=await del.evaluate(b=>{b.dispatchEvent(new PointerEvent('pointerdown',{bubbles:false,pointerType:'touch'}));const on=b.classList.contains('is-press');b.dispatchEvent(new PointerEvent('pointerup',{bubbles:false,pointerType:'touch'}));return{on,off:!b.classList.contains('is-press')};});
 assert(pr.on&&pr.off,'press class toggles');
 await del.evaluate(b=>{b.classList.add('is-press');});await p.waitForTimeout(300);assert(/0\.38/.test(await shadow()),'press glow');await del.evaluate(b=>b.classList.remove('is-press'));
 await del.focus();await p.keyboard.press('Shift');await p.waitForTimeout(300);
 assert.deepEqual(errors,[]);console.log(JSON.stringify({theme,owner,passed:'thin X, hover glow, press glow, owner guard'}));await c.close();}
await browser.close();})().catch(e=>{console.error(e);process.exit(1)});
