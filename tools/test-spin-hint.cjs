// "Drag to spin" pill sits at the same place on every 3D product viewer. Catalog mocked; no writes.
const pw=require(process.env.MP_PLAYWRIGHT||'playwright'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const ROOT=path.resolve(__dirname,'..'),ORIGIN='https://misereperdue.com',OUT=process.env.MP_TEST_ARTIFACTS||'/tmp/mp-spin-hint';fs.mkdirSync(OUT,{recursive:true});
const T={'.html':'text/html','.css':'text/css','.js':'application/javascript','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.webp':'image/webp','.mp4':'video/mp4','.glb':'model/gltf-binary'};
const products=[{id:'gid://shopify/Product/1',handle:'membership',name:'Membership',price:10,currency:'CAD',available:true,sizes:['one'],image:'img/vip-card-light.jpg',images:['img/vip-card-light.jpg']},{id:'gid://shopify/Product/8161016414310',handle:'misery-v_v-sleeping-mask',name:'Sleeping mask',price:12,currency:'CAD',available:true,sizes:['one'],image:'img/mask-front-light.jpg',images:['img/mask-front-light.jpg']}];
(async()=>{const KIND=process.env.MP_BROWSER||'chromium';const browser=await pw[KIND].launch(KIND==='chromium'?{executablePath:process.env.MP_CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader']}:{});
for(const[theme,width,height]of[['dark',390,844],['light',390,844],['dark',360,780],['light',360,780]]){
 const c=await browser.newContext({viewport:{width,height},hasTouch:true,colorScheme:theme,serviceWorkers:'block'});
 await c.addInitScript(p=>{localStorage.setItem('mp_products_cache_v2',JSON.stringify(p));sessionStorage.setItem('rc_later','1');},products);
 await c.routeWebSocket(/api\.misereperdue\.com/,()=>{});
 await c.route('**/*',async r=>{const u=new URL(r.request().url());if(u.origin===ORIGIN){const f=path.join(ROOT,u.pathname==='/'?'index.html':decodeURIComponent(u.pathname));if(fs.existsSync(f)&&fs.statSync(f).isFile())return r.fulfill({path:f,contentType:T[path.extname(f)]||'application/octet-stream'});return r.fulfill({status:404,body:''});}return r.fulfill({json:u.hostname==='api.misereperdue.com'?{ok:true,user:null,messages:[],count:0}:{data:{products:{edges:[]}}},headers:{'access-control-allow-origin':'*'}});});
 const p=await c.newPage();await p.goto(ORIGIN+'/#shop');const seen=[];
 for(const prod of products){await p.locator(`[data-product="${prod.id}"],[data-product="${prod.handle}"]`).first().click();const hint=p.locator('#product.on .vip-3d-hint');await hint.waitFor();await p.waitForTimeout(400);
  const m=await hint.evaluate(h=>{const v=h.closest('.vip-3d').getBoundingClientRect(),r=h.getBoundingClientRect(),s=getComputedStyle(h);return{top:Math.round(r.top-v.top),right:Math.round(v.right-r.right),w:Math.round(r.width),h:Math.round(r.height),font:s.fontSize,pad:s.padding};});seen.push(m);
  await p.screenshot({path:`${OUT}/${prod.handle}-${theme}-${width}.png`});await p.locator('#shop-back').click();await p.locator('#shop.on').waitFor();await p.waitForTimeout(300);}
 assert.deepEqual(seen[0],seen[1],'Drag to spin pill differs between viewers '+JSON.stringify(seen));assert.equal(seen[0].top,12);assert.equal(seen[0].right,12);
 console.log(JSON.stringify({theme,width,pill:seen[0],passed:'same Drag to spin placement on VIP card and mask'}));await c.close();}
await browser.close();})().catch(e=>{console.error(e);process.exit(1)});
