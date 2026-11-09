// Mocked browser regression: no production API requests or writes.
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const ROOT=path.resolve(__dirname,'..');
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
for(const [theme,width,height] of [['dark',390,844],['light',390,844],['dark',360,780],['light',360,780]]){
const context=await browser.newContext({viewport:{width,height},colorScheme:theme});
await context.addInitScript(({theme})=>{
 document.documentElement?.setAttribute('data-theme',theme);
 window.testOrders=[];window.testAlerts=[];window.alert=message=>testAlerts.push(message);
 const categories=['general','a','b','c'].map(id=>({id,name:id==='general'?'General':id.toUpperCase()}));
 window.MPChat={closeMsgPopup:()=>document.querySelector('#msg-popup')?.remove(),isPaused:()=>false,getMe:()=>({username:'tester'}),avatarNode:()=>document.createElement('span'),
 api:async(route,options)=>{
  if(route==='/api/analytics/stats'){if(window.deferStats)return new Promise(resolve=>window.resolveStats=()=>resolve({ok:true,stats:{days:[],totalNewUsers:1}}));return {ok:true,stats:{days:[]}};}
  if(route==='/api/forum/categories')return {ok:true,categories};
  if(route==='/api/forum/categories/reorder'){testOrders.push(options.body.order);await new Promise(r=>setTimeout(r,120));if(window.failNext){window.failNext=false;return {ok:false,error:'Test failure'};}return {ok:true};}
  return {ok:true,users:[],days:[]};
 }};
},{theme});
await context.route('**/*',async route=>{const url=new URL(route.request().url());if(url.pathname==='/test'){await route.fulfill({contentType:'text/html',body:`<!doctype html><html data-theme="${theme}"><head><link rel="stylesheet" href="/css/site.css"></head><body><script src="/js/dashboard-v2.js"></script></body></html>`});return;}const file=path.join(ROOT,url.pathname);if(url.hostname==='misereperdue.com'&&fs.existsSync(file)){await route.fulfill({path:file,contentType:file.endsWith('.js')?'application/javascript':'text/css'});return;}await route.fulfill({body:''});});
const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('https://misereperdue.com/test');await page.evaluate(()=>openAnalytics());await page.getByRole('button',{name:'Forum',exact:true}).click();await page.locator('[data-cat-id="c"]').waitFor();
const ids=()=>page.locator('[data-cat-id]').evaluateAll(rows=>rows.map(row=>row.dataset.catId));
async function drag(from,to,cancel=false){const row=page.locator(`[data-cat-id="${from}"]`),grip=row.locator('.cat-grip'),start=await grip.boundingBox(),target=await page.locator(`[data-cat-id="${to}"]`).boundingBox(),before=await ids();const movingDown=before.indexOf(from)<before.indexOf(to),endY=target.y+target.height/2+(movingDown?8:-8);await grip.dispatchEvent('pointerdown',{pointerId:7,pointerType:'touch',clientX:start.x+12,clientY:start.y+18});await page.evaluate(({x,y})=>document.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,cancelable:true,pointerId:7,pointerType:'touch',clientX:x,clientY:y})),{x:start.x+12,y:endY});const draggedGrip=await grip.boundingBox();assert(Math.abs(draggedGrip.y+18-endY)<2,'dragged row jumped away from pointer');await page.evaluate(cancel=>document.dispatchEvent(new PointerEvent(cancel?'pointercancel':'pointerup',{bubbles:true,pointerId:7,pointerType:'touch'})),cancel);await page.waitForTimeout(160);assert.equal(await row.evaluate(el=>el.style.transform),'');}
await drag('general','c');assert.deepEqual(await ids(),['a','b','c','general']);assert.deepEqual(await page.evaluate(()=>testOrders),[['a','b','c','general']]);
await drag('general','a');assert.deepEqual(await ids(),['general','a','b','c']);
const saved=await page.evaluate(()=>testOrders.length);await drag('a','c',true);assert.deepEqual(await ids(),['general','a','b','c']);assert.equal(await page.evaluate(()=>testOrders.length),saved,'cancel saved an order');
await page.evaluate(()=>window.failNext=true);await drag('a','c');assert.deepEqual(await ids(),['general','a','b','c'],'failed save did not restore order');assert.deepEqual(await page.evaluate(()=>testAlerts),['Test failure']);
await page.locator('[data-cat-id="b"] .cat-grip').focus();await page.keyboard.press('ArrowUp');await page.waitForTimeout(160);assert.deepEqual(await ids(),['general','b','a','c']);
// Real mouse events also cross DOM reorders without losing the release.
const gripBox=await page.locator('[data-cat-id="general"] .cat-grip').boundingBox(),lastBox=await page.locator('[data-cat-id="c"]').boundingBox();
await page.mouse.move(gripBox.x+12,gripBox.y+18);await page.mouse.down();await page.mouse.move(gripBox.x+12,lastBox.y+lastBox.height/2+8,{steps:8});await page.mouse.up();await page.waitForTimeout(160);assert.deepEqual(await ids(),['b','a','c','general']);
await page.evaluate(()=>{deferStats=true;openAnalytics();});await page.getByRole('button',{name:'Forum',exact:true}).click();await page.locator('[data-cat-id="a"]').waitFor();await page.locator('.dashboard-sheet').evaluate(el=>el.dataset.testIdentity='same');await page.evaluate(()=>resolveStats());await page.waitForTimeout(180);assert.equal(await page.locator('.dashboard-sheet').getAttribute('data-test-identity'),'same','fresh stats replaced category editor');
assert.deepEqual(errors,[]);console.log(JSON.stringify({theme,width,passed:'drag both directions, pointer alignment, cancellation, rollback, keyboard reorder, refresh preserves editor'}));await context.close();}
await browser.close();})().catch(e=>{console.error(e);process.exit(1)});
