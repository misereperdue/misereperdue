// Shop page Globe card: tapping your avatar opens the Globe, then your profile view (expanded) there.
// APIs mocked; Chromium (MP_CHROMIUM_PATH to override). Run: node tools/test-globe-avatar.cjs
const pw=require(process.env.MP_PLAYWRIGHT||'playwright'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const ROOT=path.resolve(__dirname,'..'),ORIGIN='https://misereperdue.com';
const T={'.html':'text/html','.css':'text/css','.js':'application/javascript','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.webp':'image/webp','.json':'application/json','.mp4':'video/mp4','.woff2':'font/woff2'};
(async()=>{const browser=await pw.chromium.launch({executablePath:process.env.MP_CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 for(const width of [390,360]){
  const me={username:'tester',points:7,member:true,badges:['member'],hasRecovery:true,hasPassword:true};const errors=[];
  const c=await browser.newContext({viewport:{width,height:844},serviceWorkers:'block'});
  await c.addInitScript(()=>{localStorage.setItem('chat_token','test-only');sessionStorage.setItem('rc_later','1');localStorage.setItem('mp_products_cache_v2',JSON.stringify([{id:'p1',handle:'misery-07-jersey',name:'Misery 07 Jersey',title:'Misery 07 Jersey',price:40,currency:'CAD',img:'/img/og-image.jpg',image:'/img/og-image.jpg',images:['/img/og-image.jpg'],sizes:[]}]));});
  await c.routeWebSocket(/api\.misereperdue\.com/,s=>{setTimeout(()=>s.send(JSON.stringify({t:'hello',you:me,messages:[],online:1,caps:{}})),40);});
  await c.route('**/*',async r=>{const u=new URL(r.request().url());
   if(u.origin===ORIGIN){const f=path.join(ROOT,u.pathname==='/'?'index.html':decodeURIComponent(u.pathname));if(fs.existsSync(f)&&fs.statSync(f).isFile())return r.fulfill({path:f,contentType:T[path.extname(f)]||'application/octet-stream'});return r.fulfill({status:404,body:''});}
   if(u.hostname.endsWith('myshopify.com')||u.hostname==='shop.misereperdue.com')return r.fulfill({json:{data:{products:{edges:[]}}}});
   let d={ok:true,messages:[],threads:[],categories:[]};if(u.pathname==='/api/me'||u.pathname==='/api/user/tester')d={ok:true,user:me};else if(u.pathname==='/api/ws-ticket')d={ticket:'t'};
   return r.fulfill({json:d,headers:{'access-control-allow-origin':'*'}});});
  const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(ORIGIN+'/#shop');
  const av=p.locator('.gp-me');await av.waitFor({state:'visible',timeout:15000});await p.waitForTimeout(400);await av.click();
  await p.waitForFunction(()=>document.querySelector('#forum.on')&&document.querySelector('#forum.on .chat-head.is-profile-expanded'),null,{timeout:8000});
  assert.match(await p.evaluate(()=>location.hash),/globe|forum/,'on the Globe');
  assert.equal(await p.locator('#forum .mp-profile-bar-head strong').innerText(),'Profile');assert.equal(await p.locator('#forum .mp-pb-name-t').innerText(),'tester');
  assert.equal(await p.locator('.rc-back').count(),0,'no settings sheet');assert.deepEqual(errors,[]);await c.close();console.log('passed',width);
 }
 await browser.close();console.log('Globe card avatar -> Globe + profile view passed');})().catch(e=>{console.error(e);process.exit(1);});
