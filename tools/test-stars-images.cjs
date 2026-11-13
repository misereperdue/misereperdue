// Stars product art: shop tile shows the theme's hero coin (both themes, not the Shopify photo); the product page shows
// the selected pack's stack and swaps it when another pack is picked; the product page shows a real 3D coin stack (stars3d.js) for the selected pack and re-stacks on pick.
// MP_PLAYWRIGHT=<playwright(-core)> MP_BROWSER=chromium node tools/test-stars-images.cjs   (catalog mocked)
const pw=require(process.env.MP_PLAYWRIGHT||'playwright'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const ROOT=path.resolve(__dirname,'..'),ORIGIN='https://misereperdue.com',OUT=process.env.MP_TEST_ARTIFACTS||'/tmp/mp-stars-images';fs.mkdirSync(OUT,{recursive:true});
const T={'.html':'text/html','.css':'text/css','.js':'application/javascript','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.webp':'image/webp','.mp4':'video/mp4','.glb':'model/gltf-binary'};
const products=[{id:'gid://shopify/Product/9',handle:'stars',name:'Stars',price:2,currency:'CAD',available:true,sizes:['100','500','1,100','2400','6500','7777'],priceBySize:{'100':2,'500':8,'1,100':10,'2400':30,'6500':70,'7777':80},image:'https://cdn.shopify.com/old-stars.jpg',images:['https://cdn.shopify.com/old-stars.jpg'],variantList:[{sku:'STARS-100'}]}];
(async()=>{const KIND=process.env.MP_BROWSER||'chromium';const browser=await pw[KIND].launch(KIND==='chromium'?{executablePath:process.env.MP_CHROMIUM_PATH||undefined,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']}:{});
for(const theme of ['dark','light']){
 const c=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,colorScheme:theme,serviceWorkers:'block'});
 await c.addInitScript(p=>{localStorage.setItem('mp_products_cache_v2',JSON.stringify(p));sessionStorage.setItem('rc_later','1');},products);
 await c.routeWebSocket(/api\.misereperdue\.com/,()=>{});
 await c.route('**/*',async r=>{const u=new URL(r.request().url());if(u.origin===ORIGIN){const f=path.join(ROOT,u.pathname==='/'?'index.html':decodeURIComponent(u.pathname));if(fs.existsSync(f)&&fs.statSync(f).isFile())return r.fulfill({path:f,contentType:T[path.extname(f)]||'application/octet-stream'});return r.fulfill({status:404,body:''});}return r.fulfill({json:u.hostname==='api.misereperdue.com'?{ok:true,user:null,messages:[],count:0}:{data:{products:{edges:[]}}},headers:{'access-control-allow-origin':'*'}});});
 const p=await c.newPage();await p.goto(ORIGIN+'/#shop');
 const tile=p.locator('[data-product="gid://shopify/Product/9"] img');await tile.waitFor({timeout:10000});
 assert.match(await tile.getAttribute('src'),new RegExp('img/stars-'+theme+'\\.jpg'),theme+' tile hero');
 assert.ok(await tile.evaluate(el=>el.closest('.tile-wrap')&&el.closest('.tile-wrap').classList.contains('is-stars')),theme+' is-stars');
 assert.equal(await tile.evaluate(el=>getComputedStyle(el).objectFit),'contain',theme+' tile contain');
 await p.waitForTimeout(1500);await p.screenshot({path:`${OUT}/grid-${theme}.png`});
 await p.locator('[data-product="gid://shopify/Product/9"]').click();
 const stage=p.locator('#product-view .stars-3d .vip-3d-stage');await stage.waitFor({timeout:6000});
 const pack=()=>stage.getAttribute('data-pack');
 assert.equal(await pack(),'100','first pack on the 3D stage');
 await stage.locator('canvas').waitFor({timeout:15000});
 await p.waitForTimeout(1500);await p.screenshot({path:`${OUT}/product-100-${theme}.png`});
 for(const sz of ['500','1,100','2400','6500']){await p.locator(`.stars-packs [data-size="${sz}"]`).click();assert.equal(await pack(),sz,sz+' on stage');
  await p.waitForTimeout(1800);await p.screenshot({path:`${OUT}/product-${sz.replace(',','')}-${theme}.png`});}
 // drag to spin
 const bb=await stage.boundingBox();await p.mouse.move(bb.x+bb.width*0.3,bb.y+bb.height/2);await p.mouse.down();await p.mouse.move(bb.x+bb.width*0.8,bb.y+bb.height*0.35,{steps:8});await p.mouse.up();
 await p.waitForTimeout(400);await p.screenshot({path:`${OUT}/product-spun-${theme}.png`});
 const errs=await p.evaluate(()=>window.__mpErr||null);assert.equal(errs,null);
 console.log('ok',theme);await c.close();}
await browser.close();})().catch(e=>{console.error(e);process.exit(1);});
