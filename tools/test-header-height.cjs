// Browser regression checks: all site assets are local and all APIs/WebSockets are mocked.
// Requires Playwright (npm install --no-save playwright) and Chromium.
// Run: node tools/test-header-height.cjs
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const ORIGIN=process.env.MP_TEST_ORIGIN||'https://misereperdue.com';
const ROOT=path.resolve(__dirname,'..'),OUT=process.env.MP_TEST_ARTIFACTS||'/tmp/mp-globe-replies-test';fs.mkdirSync(OUT,{recursive:true});
(async()=>{const browser=await chromium.launch({executablePath:process.env.MP_CHROMIUM_PATH||(fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),headless:true,args:['--no-sandbox']});
for(const [theme,width,height] of [['dark',390,844],['light',390,844],['dark',360,780],['light',360,780],['dark',1440,900],['light',1440,900]]){
const c=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,colorScheme:theme,serviceWorkers:'block'});
const user={username:'tester',points:4,hasRecovery:true,hasPassword:true,member:true};
const reply=(id,content,parentId)=>({id,content,parentId,author:'tester',createdAt:Date.now()-3000,rich:false,stars:0});
let th={id:'t1',title:'Misery Globe',pinned:true,content:'<p>Original post</p>',rich:true,author:'tester',createdAt:Date.now()-90000,lastActivity:Date.now()-3000,thumb:'thumb123',category:'general',tags:[],excerpt:'A thread with live replies',replies:[reply('r1','Parent reply'),reply('c1','First child','r1'),reply('c2','Second child','r1')]};
const fallback={...th,id:'t2',title:'No thumbnail',thumb:'',content:'<p>Inline content image</p><img src="https://misereperdue.com/img/icon-192.png">',replies:[]};
let messages=[{id:'m1',user:'tester',text:'https://misereperdue.com/t/t1',ts:Date.now()-1000},{id:'m2',user:'other',text:'https://misereperdue.com/t/t2',ts:Date.now()}],ws,requests=[],errors=[];
await c.addInitScript(()=>{localStorage.setItem('chat_token','test-only');sessionStorage.setItem('rc_later','1');});
await c.routeWebSocket(/api\.misereperdue\.com/,s=>{ws=s;setTimeout(()=>s.send(JSON.stringify({t:'hello',you:user,messages,online:1,caps:{private:1,poll:1}})),40);});
await c.route('**/*',async r=>{const u=new URL(r.request().url());if(u.hostname==='api.misereperdue.com'){
requests.push({path:u.pathname,method:r.request().method()});let data={ok:true};
if(u.pathname.startsWith('/api/media/')||u.pathname.startsWith('/api/avatarimg/')){await r.fulfill({path:ROOT+'/img/icon-192.png',contentType:'image/png'});return;}
if(u.pathname==='/api/me')data={ok:true,user};else if(u.pathname==='/api/forum/categories')data={ok:true,categories:[{id:'general',name:'General'}]};else if(u.pathname==='/api/forum/threads')data={ok:true,threads:[{...th,id:'other',title:'Other pinned',pinned:true},{...th,id:'ordinary',pinned:false},{...th,replyCount:th.replies.length,lastReply:{author:'tester',text:th.replies.at(-1)?.content,createdAt:Date.now()-1000}}]};
else if(u.pathname==='/api/forum/thread/t1/replies'&&r.request().method()==='POST'){let body=r.request().postDataJSON();th={...th,replies:[...th.replies,reply('own','Own reply sent',body.parentId)]};await new Promise(resolve=>setTimeout(resolve,500));data={ok:true};}
else if(u.pathname==='/api/forum/thread/t1')data={ok:true,thread:th};else if(u.pathname==='/api/forum/thread/t2')data={ok:true,thread:fallback};else if(u.pathname==='/api/messages')data={messages,badges:{}};else if(u.pathname==='/api/ws-ticket')data={ticket:'test'};else if(u.pathname==='/api/online')data={users:[user],count:1};else if(u.pathname==='/api/notifications')data={notifications:[],unread:0};else if(u.pathname==='/api/forum/tags')data={tags:[]};
await r.fulfill({json:data,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*'}});return;}
if(process.env.MP_TEST_ORIGIN&&u.origin===ORIGIN){await r.continue();return;}
if(u.hostname!=='misereperdue.com'){await r.fulfill({json:{data:{products:{edges:[]}}}});return;}
let f=path.join(ROOT,u.pathname==='/'?'index.html':decodeURIComponent(u.pathname));if(!fs.existsSync(f)){await r.fulfill({status:404,body:''});return;}
await r.fulfill({path:f,contentType:({'.html':'text/html','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.json':'application/json'})[path.extname(f)]||'application/octet-stream'});});
const p=await c.newPage();
await p.goto(ORIGIN+'/#journal');await p.locator('#chat-bell').waitFor();await p.waitForFunction(()=>window.MP&&window.MPNav);await p.evaluate(()=>{MP.PRODUCTS.test={id:'test',name:'Test',handle:'test',price:10,sizes:['one'],available:true};MP.addItem('test','one');MPNav.refreshPostBtn();});await p.waitForTimeout(200);
const metrics=()=>p.evaluate(()=>{const read=(selector)=>{const e=document.querySelector(selector),s=getComputedStyle(e),r=e.getBoundingClientRect();return {y:r.y,height:r.height,width:r.width,mask:s.maskImage,background:s.backgroundImage,overflow:s.overflow,ext:s.getPropertyValue('--sky-ext')};};return {hero:read('.hero'),rain:read('.hero-rain'),fade:read('.hero-fade'),nav:read('.nav')};});
const baseline=await metrics();const titlebar=await p.locator('#journal .chat-head').boundingBox();
for(const hash of ['#globe','#cart','#shop','#product/test','#journal']){await p.evaluate(h=>{location.hash=h;},hash);await p.waitForTimeout(650);const current=await metrics();if(hash==='#globe')assert.equal(await p.locator('#forum').evaluate(e=>getComputedStyle(e,'::before').content),'none','extra Globe header underlay');if(hash==='#cart')assert((await p.locator('#cart-lines').boundingBox()).y>=156,'cart must clear shared fade');if(hash==='#globe'){const bar=await p.locator('#forum .chat-head').boundingBox();assert.equal(bar.height,titlebar.height,'Globe titlebar height');assert.equal(bar.y,titlebar.y,'Globe titlebar position');}assert.equal(await p.locator('.panel.on').getAttribute('id'),hash.startsWith('#product')?'product':hash==='#globe'?'forum':hash.slice(1));assert.deepEqual(current,baseline,'full header differs on '+hash);await p.screenshot({path:OUT+'/header-'+hash.slice(1).replaceAll('/','-')+'-'+theme+'-'+width+'.png'});}
console.log(JSON.stringify({theme,width,passed:'identical hero, canvas, fade and nav geometry across chat, globe, cart, shop and product'}));await p.evaluate(()=>document.body.classList.add('crop-hero-auth'));assert.deepEqual(await metrics(),baseline,'auth crop must not change header');await c.close();}await browser.close();})().catch(e=>{console.error(e);process.exit(1)});
