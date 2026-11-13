// Stars product art: shop tile shows the theme's hero coin (both themes, not the Shopify photo); the product page shows
// the selected pack's stack and swaps it when another pack is picked; unknown pack sizes fall back to the hero.
// MP_PLAYWRIGHT=<playwright(-core)> MP_BROWSER=chromium node tools/test-stars-images.cjs   (catalog mocked)
const pw=require(process.env.MP_PLAYWRIGHT||'playwright'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const ROOT=path.resolve(__dirname,'..'),ORIGIN='https://misereperdue.com',OUT=process.env.MP_TEST_ARTIFACTS||'/tmp/mp-stars-images';fs.mkdirSync(OUT,{recursive:true});
const T={'.html':'text/html','.css':'text/css','.js':'application/javascript','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.webp':'image/webp','.mp4':'video/mp4','.glb':'model/gltf-binary'};
const products=[{id:'gid://shopify/Product/9',handle:'stars',name:'Stars',price:2,currency:'CAD',available:true,sizes:['100','500','1,000','2500','7777'],priceBySize:{'100':2,'500':8,'1,000':15,'2500':30,'7777':80},image:'https://cdn.shopify.com/old-stars.jpg',images:['https://cdn.shopify.com/old-stars.jpg'],variantList:[{sku:'STARS-100'}]}];
(async()=>{const KIND=process.env.MP_BROWSER||'chromium';const browser=await pw[KIND].launch(KIND==='chromium'?{executablePath:process.env.MP_CHROMIUM_PATH||undefined,args:['--no-sandbox']}:{});
for(const theme of ['dark','light']){
 const c=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,colorScheme:theme,serviceWorkers:'block'});
 await c.addInitScript(p=>{localStorage.setItem('mp_products_cache_v2',JSON.stringify(p));sessionStorage.setItem('rc_later','1');},products);
 await c.routeWebSocket(/api\.misereperdue\.com/,()=>{});
 await c.route('**/*',async r=>{const u=new URL(r.request().url());if(u.origin===ORIGIN){const f=path.join(ROOT,u.pathname==='/'?'index.html':decodeURIComponent(u.pathname));if(fs.existsSync(f)&&fs.statSync(f).isFile())return r.fulfill({path:f,contentType:T[path.extname(f)]||'application/octet-stream'});return r.fulfill({status:404,body:''});}return r.fulfill({json:u.hostname==='api.misereperdue.com'?{ok:true,user:null,messages:[],count:0}:{data:{products:{edges:[]}}},headers:{'access-control-allow-origin':'*'}});});
 const p=await c.newPage();await p.goto(ORIGIN+'/#shop');
 const tile=p.locator('[data-product="gid://shopify/Product/9"] img');await tile.waitFor({timeout:10000});
 assert.match(await tile.getAttribute('src'),new RegExp('img/stars-'+theme+'\\.jpg'),theme+' tile hero');
 await p.waitForTimeout(1500);await p.screenshot({path:`${OUT}/grid-${theme}.png`});
 await p.locator('[data-product="gid://shopify/Product/9"]').click();
 const img=p.locator('#product-view .carousel-track img');await img.waitFor({timeout:6000});
 const src=()=>img.getAttribute('src');
 assert.match(await src(),new RegExp('img/stars-100-'+theme+'\\.jpg'),'first pack art');
 await p.locator('.stars-packs [data-size="1,000"]').click();assert.match(await src(),new RegExp('img/stars-1000-'+theme+'\\.jpg'),'1,000 pack art');
 await p.waitForFunction(()=>{const i=document.querySelector('#product-view .carousel-track img');return i&&i.complete&&i.naturalWidth>0;});
 await p.waitForTimeout(1200);await p.screenshot({path:`${OUT}/product-${theme}.png`});
 await p.locator('.stars-packs [data-size="7777"]').click();assert.match(await src(),new RegExp('img/stars-'+theme+'\\.jpg'),'unknown pack falls back to hero');
 console.log('ok',theme);await c.close();}
await browser.close();})().catch(e=>{console.error(e);process.exit(1);});
