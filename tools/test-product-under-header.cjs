// Product content scrolls UNDER the header sky like Chat/Globe and fades out gradually: Back and "Drag to spin" are
// visible at rest and never paint in the fully covered header band (down to the nav bottom) when scrolled. Pixel check: hiding the element must not change the band.
// MP_PLAYWRIGHT=<playwright(-core)> MP_BROWSER=webkit node tools/test-product-under-header.cjs   (catalog mocked)
const pw=require(process.env.MP_PLAYWRIGHT||'playwright'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const ROOT=path.resolve(__dirname,'..'),ORIGIN='https://misereperdue.com',OUT=process.env.MP_TEST_ARTIFACTS||'/tmp/mp-product-under-header';fs.mkdirSync(OUT,{recursive:true});
const T={'.html':'text/html','.css':'text/css','.js':'application/javascript','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.webp':'image/webp','.mp4':'video/mp4','.glb':'model/gltf-binary'};
const products=[{id:'gid://shopify/Product/1',handle:'membership',name:'Membership',price:10,currency:'CAD',available:true,sizes:['one'],image:'img/vip-card-light.jpg',images:['img/vip-card-light.jpg'],description:'<p>'+'Membership details. '.repeat(120)+'</p>'}];
(async()=>{const KIND=process.env.MP_BROWSER||'webkit';const browser=await pw[KIND].launch(KIND==='chromium'?{executablePath:process.env.MP_CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader']}:{});
for(const theme of ['dark','light']){
 const c=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,colorScheme:theme,serviceWorkers:'block'});
 await c.addInitScript(p=>{localStorage.setItem('mp_products_cache_v2',JSON.stringify(p));sessionStorage.setItem('rc_later','1');},products);
 await c.routeWebSocket(/api\.misereperdue\.com/,()=>{});
 await c.route('**/*',async r=>{const u=new URL(r.request().url());if(u.origin===ORIGIN){const f=path.join(ROOT,u.pathname==='/'?'index.html':decodeURIComponent(u.pathname));if(fs.existsSync(f)&&fs.statSync(f).isFile())return r.fulfill({path:f,contentType:T[path.extname(f)]||'application/octet-stream'});return r.fulfill({status:404,body:''});}return r.fulfill({json:u.hostname==='api.misereperdue.com'?{ok:true,user:null,messages:[],count:0}:{data:{products:{edges:[]}}},headers:{'access-control-allow-origin':'*'}});});
 const p=await c.newPage();await p.goto(ORIGIN+'/#shop');await p.locator('[data-product="membership"],[data-product="gid://shopify/Product/1"]').first().click();
 await p.locator('#product.on .vip-3d-hint').waitFor();await p.waitForTimeout(700);
 // Fully covered part of the header: down to the nav bottom; below that the sky fades (eased) over the content.
 const band=await p.evaluate(()=>document.querySelector('.nav').getBoundingClientRect().bottom);
 // Freeze the moving parts (rain/3D) so before/after pixels compare cleanly.
 await p.addStyleTag({content:'.hero *,.vip-3d canvas{visibility:hidden!important} *{animation-play-state:paused!important;transition:none!important}'});
 for(const y of [0,30,80,200]){
  await p.evaluate(y=>scrollTo(0,y),y);await p.waitForTimeout(250);
  if(theme==='dark')await p.screenshot({path:`${OUT}/scroll-${y}.png`});
  for(const sel of ['#shop-back','#product .vip-3d-hint']){
   const r=await p.locator(sel).evaluate(e=>{const q=e.getBoundingClientRect();return{x:q.x,y:q.y,w:q.width,h:q.height};});
   const top=Math.max(0,r.y),bot=Math.min(band,r.y+r.h);if(bot-top<2)continue; // not in the header band
   const clip={x:Math.max(0,r.x),y:top,width:Math.min(r.w,390-r.x),height:bot-top};
   const a=await p.screenshot({clip});await p.locator(sel).evaluate(e=>e.style.setProperty('visibility','hidden','important'));
   const b=await p.screenshot({clip});await p.locator(sel).evaluate(e=>e.style.removeProperty('visibility'));
   const shows=!a.equals(b);
   if(y===0&&sel==='#shop-back'){assert(shows,'Back must be visible at rest');assert.equal(await p.evaluate(()=>{const b=document.querySelector('#shop-back').getBoundingClientRect();return document.elementFromPoint(b.x+b.width/2,b.y+b.height/2).closest('#shop-back')?1:0;}),1,'Back not tappable at rest');}
   else if(r.y+r.h<=band+0.5||y>0)assert(!shows,`${theme}: ${sel} paints over the header band at scroll ${y}`);
  }}
 // Bag/checkout shares the same dark sky fade (light already fades through its rain mask).
 await p.goto(ORIGIN+'/#cart');await p.locator('#cart.on').waitFor();const m=await p.evaluate(()=>getComputedStyle(document.querySelector('.hero')).webkitMaskImage||getComputedStyle(document.querySelector('.hero')).maskImage);if(theme==='dark')assert(/linear-gradient/.test(m),'bag page lost the sky fade');
 console.log(JSON.stringify({kind:KIND,theme,passed:'Back visible at rest, Back and Drag to spin hidden under the header band at 30/80/200'}));await c.close();}
await browser.close();})().catch(e=>{console.error(e);process.exit(1)});
