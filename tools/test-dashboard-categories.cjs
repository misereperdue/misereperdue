// Mocked browser regression for the owner dashboard (#383): no production API requests or writes.
const {chromium}=require(process.env.PW||'playwright'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const ROOT=path.resolve(__dirname,'..');
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROME||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
for(const [theme,width,height] of [['dark',390,844],['light',360,780]]){
const context=await browser.newContext({viewport:{width,height},colorScheme:theme});
await context.addInitScript(()=>{
 window.testOrders=[];window.calls=[];
 const categories=['general','a','b','c'].map(id=>({id,name:id==='general'?'General':id.toUpperCase(),ownerOnly:id==='c'}));
 window.MPChat={closeMsgPopup:()=>document.querySelector('#msg-popup')?.remove(),isPaused:()=>false,getMe:()=>({username:'tester'}),avatarNode:()=>{const s=document.createElement('span');s.className='chat-avatar-wrap';return s;},
 api:async(route,options)=>{calls.push(route);
  if(route==='/api/analytics/stats'){if(window.deferStats)return new Promise(resolve=>window.resolveStats=()=>resolve({ok:true,stats:{days:[{active:3}],summary:{members:9,vip:2}}}));return {ok:true,stats:{days:[],summary:{members:5,vip:1}}};}
  if(route==='/api/forum/categories')return {ok:true,categories};
  if(route==='/api/forum/categories/reorder'){testOrders.push(options.body.order);await new Promise(r=>setTimeout(r,60));if(window.failNext){window.failNext=false;return {ok:false,error:'Test failure'};}return {ok:true};}
  if(route==='/api/users')return {ok:true,users:[{username:'Ana',createdAt:Date.now()-864e5,points:12,member:true,catAccess:[]},{username:'bo',createdAt:Date.now()-2*864e5,banned:true}]};
  if(route.startsWith('/api/admin/'))throw Object.assign(new Error('Request failed (404)'),{status:404});
  return {ok:true,users:[]};
 }};
});
await context.route('**/*',async route=>{const url=new URL(route.request().url());if(url.pathname==='/test'){await route.fulfill({contentType:'text/html; charset=utf-8',body:`<!doctype html><html data-theme="${theme}"><head><link rel="stylesheet" href="/css/site.css"></head><body><script src="/js/dashboard-v2.js"></script></body></html>`});return;}const file=path.join(ROOT,url.pathname);if(url.hostname==='misereperdue.com'&&fs.existsSync(file)){await route.fulfill({path:file,contentType:file.endsWith('.js')?'application/javascript; charset=utf-8':'text/css; charset=utf-8'});return;}await route.fulfill({body:''});});
const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('https://misereperdue.com/test');
await page.evaluate(()=>openAnalytics());
assert.equal(await page.title(),'Misère Perdue · Dashboard');
await page.locator('.dz-stat').first().waitFor();
assert.equal(await page.locator('.dz-card:has-text("Orders")').isHidden(),true,'orders hidden until the Worker endpoint is live');
await page.getByRole('tab',{name:'Globe'}).click();await page.locator('[data-cat-id="c"]').waitFor();
const ids=()=>page.locator('[data-cat-id]').evaluateAll(rows=>rows.map(row=>row.dataset.catId));
await page.getByRole('button',{name:'Move down: General'}).click();await page.waitForTimeout(100);
assert.deepEqual(await ids(),['a','general','b','c']);assert.deepEqual(await page.evaluate(()=>testOrders),[['a','general','b','c']]);
await page.evaluate(()=>window.failNext=true);await page.getByRole('button',{name:'Move up: C'}).click();await page.waitForTimeout(150);
assert.deepEqual(await ids(),['a','general','b','c'],'failed save did not restore order');
assert.match(await page.locator('.dz-pane:not([hidden]) .pow-status').textContent(),/Test failure/);
// Fresh stats swap in place: the open tab and editor survive.
await page.evaluate(()=>{deferStats=true;openAnalytics();});await page.getByRole('tab',{name:'Globe'}).click();await page.locator('[data-cat-id="a"]').waitFor();
await page.locator('.dz').evaluate(el=>el.dataset.testIdentity='same');await page.evaluate(()=>resolveStats());await page.waitForTimeout(120);
assert.equal(await page.locator('.dz').getAttribute('data-test-identity'),'same','fresh stats replaced the editor');
await page.getByRole('tab',{name:'Overview'}).click();assert.match(await page.locator('.dz-stat').first().textContent(),/9/);
// People: lowercase names, filter, actions.
await page.getByRole('tab',{name:'People'}).click();await page.locator('.dz-person').first().waitFor();
assert.deepEqual(await page.locator('.dz-person .dz-row-main b').allTextContents(),['ana','bo']);
const fs16=await page.locator('.dz-search .dz-in').evaluate(e=>getComputedStyle(e).fontSize);assert.equal(fs16,'16px');
await page.getByRole('button',{name:'Banned',exact:true}).click();assert.deepEqual(await page.locator('.dz-person .dz-row-main b').allTextContents(),['bo']);
await page.getByRole('button',{name:'All',exact:true}).click();await page.locator('.dz-person .dz-row').first().click();
for(const n of ['Add','Rename','Open profile','Remove VIP','Ban','Clear messages','Clear forum posts','Delete account','C'])assert.equal(await page.getByRole('button',{name:n,exact:true}).count()>0,true,n);
assert.deepEqual(errors,[]);console.log(JSON.stringify({theme,width,passed:'title, hidden orders, reorder + rollback, refresh keeps editor, people filter + actions'}));await context.close();}
await browser.close();})().catch(e=>{console.error(e);process.exit(1)});
