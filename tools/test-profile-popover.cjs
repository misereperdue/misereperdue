// Profile mini popover anchors to the tap: stem on the tap point, 12px screen margin, flips at edges. APIs mocked.
const pw=require(process.env.MP_PLAYWRIGHT||'playwright'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const ROOT=path.resolve(__dirname,'..'),ORIGIN='https://misereperdue.com',OUT=process.env.MP_TEST_ARTIFACTS||'/tmp/mp-profile-popover';fs.mkdirSync(OUT,{recursive:true});
const T={'.html':'text/html','.css':'text/css','.js':'application/javascript','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.webp':'image/webp','.json':'application/json','.mp4':'video/mp4'};
const me={username:'tester',points:4,hasRecovery:true,hasPassword:true,member:true},other={username:'other',points:12,member:true,bio:'Hello there',createdAt:Date.now()-9e9};
(async()=>{const KIND=process.env.MP_BROWSER||'chromium';const browser=await pw[KIND].launch(KIND==='chromium'?{executablePath:process.env.MP_CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']}:{});const shots=[];
for(const[theme,width,height]of[['dark',390,844],['light',390,844],['dark',360,780],['light',360,780]]){
 const c=await browser.newContext({viewport:{width,height},deviceScaleFactor:2,hasTouch:true,colorScheme:theme,serviceWorkers:'block'});const errors=[];
 await c.addInitScript(()=>{localStorage.setItem('chat_token','test-only');sessionStorage.setItem('rc_later','1');});
 await c.routeWebSocket(/api\.misereperdue\.com/,s=>{setTimeout(()=>s.send(JSON.stringify({t:'hello',you:me,messages:[{id:'m1',user:'other',text:'hi',ts:Date.now()}],online:1,caps:{}})),40);});
 await c.route('**/*',async r=>{const u=new URL(r.request().url());if(u.origin===ORIGIN){const f=path.join(ROOT,u.pathname==='/'?'index.html':decodeURIComponent(u.pathname));if(fs.existsSync(f)&&fs.statSync(f).isFile())return r.fulfill({path:f,contentType:T[path.extname(f)]||'application/octet-stream'});return r.fulfill({status:404,body:''});}
  if(u.pathname.startsWith('/api/avatarimg/'))return r.fulfill({path:ROOT+'/img/icon-192.png',contentType:'image/png'});let d={ok:true,messages:[],count:0};if(u.pathname==='/api/me')d={ok:true,user:me};else if(u.pathname.startsWith('/api/user/'))d={ok:true,user:other};else if(u.pathname==='/api/ws-ticket')d={ticket:'t'};else if(u.pathname==='/api/messages')d={ok:true,messages:[],badges:{}};
  return r.fulfill({json:d,headers:{'access-control-allow-origin':'*'}});});
 const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(ORIGIN+'/#journal');await p.waitForFunction(()=>window.MPChat&&MPChat.openUserSheet);await p.waitForTimeout(1200);
 // Anchors near every edge; tap inside each at an off-centre point.
 const cases=[['top-left',8,110,40,30,.2],['top-right',width-48,110,40,30,.8],['bottom-left',8,height-60,40,30,.3],['bottom-right',width-48,height-60,40,30,.7],['mid-wide',20,400,width-40,24,.85],['left-edge-mid',0,300,30,30,.5],['right-edge-mid',width-30,300,30,30,.5]];
 for(const[name,x,y,w,h,fx]of cases){
  const res=await p.evaluate(async([x,y,w,h,fx])=>{document.querySelectorAll('.mp-test-anchor').forEach(e=>e.remove());const a=document.createElement('button');a.className='mp-test-anchor';a.style.cssText=`position:fixed;left:${x}px;top:${y}px;width:${w}px;height:${h}px;z-index:5;opacity:.5;background:#f0f;border:0`;document.body.appendChild(a);
   const tx=x+w*fx,ty=y+h/2;a.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,clientX:tx,clientY:ty,pointerType:'touch'}));MPChat.openUserSheet('other',a);
   await new Promise(r=>setTimeout(r,700));const b=document.querySelector('.mp-pb');if(!b)return null;const br=b.getBoundingClientRect(),ax=parseFloat(b.style.getPropertyValue('--ax')),ar=a.getBoundingClientRect();
   return{tx,ty,left:br.left,right:br.right,top:br.top,bottom:br.bottom,tip:br.left+ax,below:b.classList.contains('is-below'),anchorTop:ar.top,anchorBottom:ar.bottom,vw:document.documentElement.clientWidth,vh:innerHeight,inn:b.classList.contains('is-in'),pad:getComputedStyle(b.querySelector('.mp-pb-body')).padding};},[x,y,w,h,fx]);
  assert(res,'popover did not open for '+name);assert(res.inn,'popover not settled '+name);
  assert(res.left>=11.5&&res.right<=res.vw-11.5,`${name}: off the 12px margin ${JSON.stringify(res)}`);
  assert(res.top>=0&&res.bottom<=res.vh,`${name}: off screen vertically`);
  const reach=Math.abs(res.tip-res.tx);assert(reach<=0.6||(res.tx<res.left+18.5||res.tx>res.right-18.5),`${name}: stem ${res.tip} not on tap ${res.tx}`);assert(reach<=22,`${name}: stem far from tap`);
  if(res.below)assert(res.top>=res.anchorBottom,`${name}: overlaps anchor`);else assert(res.bottom<=res.anchorTop,`${name}: overlaps anchor`);
  if(name.startsWith('bottom'))assert(!res.below,`${name}: should flip above`);if(name.startsWith('top'))assert(res.below,`${name}: should open below`);
  // Jitter: geometry must stay put after opening.
  const later=await p.evaluate(()=>{const r=document.querySelector('.mp-pb').getBoundingClientRect();return{left:r.left,top:r.top};});await p.waitForTimeout(400);const after=await p.evaluate(()=>{const r=document.querySelector('.mp-pb').getBoundingClientRect();return{left:r.left,top:r.top};});assert.deepEqual(after,later,name+': moved after open');
  if(theme==='dark'&&width===390&&(name==='mid-wide'||name==='left-edge-mid'||name==='right-edge-mid'||name==='top-left'||name==='top-right')){const f=`${OUT}/pop-${name}.png`;await p.screenshot({path:f});shots.push(f);}
  await p.keyboard.press('Escape');await p.waitForTimeout(450);}
 assert.deepEqual(errors,[]);console.log(JSON.stringify({theme,width,passed:'stem on tap, 12px clamp, flip above/below, no overlap, no post-open shift, all edges'}));await c.close();}
await browser.close();})().catch(e=>{console.error(e);process.exit(1)});
