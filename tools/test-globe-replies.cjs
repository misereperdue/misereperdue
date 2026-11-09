// Browser regression checks: all site assets are local and all APIs/WebSockets are mocked.
// Requires Playwright (npm install --no-save playwright) and Chromium.
// Run: node tools/test-globe-replies.cjs
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const ORIGIN=process.env.MP_TEST_ORIGIN||'https://misereperdue.com';
const ROOT=path.resolve(__dirname,'..'),OUT=process.env.MP_TEST_ARTIFACTS||'/tmp/mp-globe-replies-test';fs.mkdirSync(OUT,{recursive:true});
(async()=>{const browser=await chromium.launch({executablePath:process.env.MP_CHROMIUM_PATH||(fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),headless:true,args:['--no-sandbox']});
for(const theme of ['dark','light']){
const c=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,colorScheme:theme,serviceWorkers:'block'});
const user={username:'tester',points:4,hasRecovery:true,hasPassword:true,member:true};
const reply=(id,content,parentId)=>({id,content,parentId,author:'tester',createdAt:Date.now()-3000,rich:false,stars:0});
let th={id:'t1',title:'Live reply thread',content:'<p>Original post</p>',rich:true,author:'tester',createdAt:Date.now()-90000,lastActivity:Date.now()-3000,thumb:'thumb123',category:'general',tags:[],excerpt:'A thread with live replies',replies:[reply('r1','Parent reply'),reply('c1','First child','r1'),reply('c2','Second child','r1')]};
const fallback={...th,id:'t2',title:'No thumbnail',thumb:'',content:'<p>Inline content image</p><img src="https://misereperdue.com/img/icon-192.png">',replies:[]};
let messages=[{id:'m1',user:'tester',text:'https://misereperdue.com/t/t1',ts:Date.now()-1000},{id:'m2',user:'other',text:'https://misereperdue.com/t/t2',ts:Date.now()}],ws,requests=[],errors=[];
await c.addInitScript(()=>{localStorage.setItem('chat_token','test-only');sessionStorage.setItem('rc_later','1');});
await c.routeWebSocket(/api\.misereperdue\.com/,s=>{ws=s;setTimeout(()=>s.send(JSON.stringify({t:'hello',you:user,messages,online:1,caps:{private:1,poll:1}})),40);});
await c.route('**/*',async r=>{const u=new URL(r.request().url());if(u.hostname==='api.misereperdue.com'){
requests.push({path:u.pathname,method:r.request().method()});let data={ok:true};
if(u.pathname.startsWith('/api/media/')||u.pathname.startsWith('/api/avatarimg/')){await r.fulfill({path:ROOT+'/img/icon-192.png',contentType:'image/png'});return;}
if(u.pathname==='/api/me')data={ok:true,user};else if(u.pathname==='/api/forum/categories')data={ok:true,categories:[{id:'general',name:'General'}]};else if(u.pathname==='/api/forum/threads')data={ok:true,threads:[{...th,replyCount:th.replies.length,lastReply:{author:'tester',text:th.replies.at(-1)?.content,createdAt:Date.now()-1000}}]};
else if(u.pathname==='/api/forum/thread/t1/replies'&&r.request().method()==='POST'){let body=r.request().postDataJSON();th={...th,replies:[...th.replies,reply('own','Own reply sent',body.parentId)]};await new Promise(resolve=>setTimeout(resolve,500));data={ok:true};}
else if(u.pathname==='/api/forum/thread/t1')data={ok:true,thread:th};else if(u.pathname==='/api/forum/thread/t2')data={ok:true,thread:fallback};else if(u.pathname==='/api/messages')data={messages,badges:{}};else if(u.pathname==='/api/ws-ticket')data={ticket:'test'};else if(u.pathname==='/api/online')data={users:[user],count:1};else if(u.pathname==='/api/notifications')data={notifications:[],unread:0};else if(u.pathname==='/api/forum/tags')data={tags:[]};
await r.fulfill({json:data,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*'}});return;}
if(process.env.MP_TEST_ORIGIN&&u.origin===ORIGIN){await r.continue();return;}
if(u.hostname!=='misereperdue.com'){await r.fulfill({json:{data:{products:{edges:[]}}}});return;}
if(u.pathname==='/js/shop.js')await new Promise(resolve=>setTimeout(resolve,350));
let f=path.join(ROOT,u.pathname==='/'?'index.html':decodeURIComponent(u.pathname));if(!fs.existsSync(f)){await r.fulfill({status:404,body:''});return;}
await r.fulfill({path:f,contentType:({'.html':'text/html','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.json':'application/json'})[path.extname(f)]||'application/octet-stream'});});
const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(ORIGIN+'/#globe');await p.locator('.forum-thread-connector').waitFor();await p.waitForTimeout(1000);await p.screenshot({path:OUT+'/thread-elbow-'+theme+'.png'});
await p.locator('.forum-thread[data-id="t1"]').click();await p.locator('.forum-replybox').waitFor();await p.waitForTimeout(700);
const editor=()=>p.locator('#forum-reply').count().then(n=>n?p.locator('#forum-reply'):p.locator('#forum-reply-editor [contenteditable=true]'));
await (await editor()).fill('Keep this draft');
await p.evaluate(()=>{window.keep={op:document.querySelector('.forum-op'),box:document.querySelector('.forum-replybox'),first:document.querySelector('[data-reply-key="r1"]'),child:document.querySelector('[data-reply-key="c1"]')};});
await p.locator('[data-showreplies="r1"]').click();await p.locator('[data-reply-key="c2"]').waitFor();await p.waitForTimeout(300);
await p.locator('[data-hidereplies="r1"]').click();await p.waitForTimeout(300);assert.equal(await p.locator('[data-reply-key="c2"]').count(),0);
assert(await p.evaluate(()=>keep.op===document.querySelector('.forum-op')&&keep.box===document.querySelector('.forum-replybox')&&keep.first===document.querySelector('[data-reply-key="r1"]')&&keep.child===document.querySelector('[data-reply-key="c1"]')),'collapse remounted existing DOM');
// Rapid collapse/reopen must cancel removal instead of deleting a revived reply.
await p.locator('[data-showreplies="r1"]').click();await p.locator('[data-hidereplies="r1"]').click();await p.locator('[data-showreplies="r1"]').click();await p.waitForTimeout(400);assert.equal(await p.locator('[data-reply-key="c2"]').count(),1);
assert.equal(await p.locator('.forum-skel').count(),0);assert((await (await editor()).inputValue().catch(()=> (editor()).then(e=>e.innerText()))).includes('Keep this draft'));
// New replies arrive while a draft is focused and leave editor and existing cards intact.
await (await editor()).focus();const composerTop=await p.locator('.forum-replybox').evaluate(el=>el.getBoundingClientRect().top);th={...th,replies:[...th.replies,reply('r2','Remote arrived live'),reply('c3','New nested child','r1')]};ws.send(JSON.stringify({t:'forum',kind:'reply',threadId:'t1'}));await p.locator('[data-reply-key="r2"]').waitFor({timeout:2500});assert(await p.locator('[data-reply-key="r2"]').evaluate(n=>!!n._replyAnimation),'new reply not animated');await p.locator('[data-reply-key="c3"]').waitFor();
assert(await p.evaluate(()=>keep.box===document.querySelector('.forum-replybox')&&keep.op===document.querySelector('.forum-op')),'live update remounted composer/post');
assert((await (await editor()).inputValue().catch(()=> (editor()).then(e=>e.innerText()))).includes('Keep this draft'));
await p.waitForTimeout(350);assert(Math.abs((await p.locator('.forum-replybox').evaluate(el=>el.getBoundingClientRect().top))-composerTop)<2,'live reply moved active composer');await p.screenshot({path:OUT+'/live-replies-'+theme+'.png'});
// Existing per-reply handlers must also work on newly inserted cards.
await p.locator('[data-replyto="r2"]').click();await p.locator('.forum-replying-to').waitFor();await p.locator('#forum-cancel-reply').click();
const sent=p.waitForResponse(r=>r.url().includes('/api/forum/thread/t1/replies')&&r.request().method()==='POST');await p.locator('#forum-send').click();await (await editor()).fill('Typed during send');await sent;await p.locator('[data-reply-key="own"]').waitFor({timeout:3000});assert(await p.evaluate(()=>keep.box===document.querySelector('.forum-replybox')),'own send remounted editor');assert.equal(await p.locator('.forum-skel').count(),0);
assert((await (await editor()).inputValue().catch(()=> (editor()).then(e=>e.innerText()))).includes('Typed during send'),'send erased newer text');
// Unchanged polls and extra events must retain existing card identity.
await p.locator('[data-reply-key="r2"]').evaluate(n=>n.dataset.sentinel='keep');ws.send(JSON.stringify({t:'forum',kind:'reply',threadId:'t1'}));await p.waitForTimeout(400);assert.equal(await p.locator('[data-reply-key="r2"]').getAttribute('data-sentinel'),'keep');
// Polling alone catches an event missed by the socket.
th={...th,replies:[...th.replies,reply('poll','Polling recovery reply')]};await p.locator('[data-reply-key="poll"]').waitFor({timeout:7000});
// A nested reply inserted above the reader must preserve the visible card.
await p.locator('[data-reply-key="r2"]').evaluate(el=>{document.dispatchEvent(new WheelEvent('wheel',{bubbles:true}));scrollTo(0,scrollY+el.getBoundingClientRect().top-170);});await p.waitForTimeout(100);const readingTop=await p.locator('[data-reply-key="r2"]').evaluate(el=>el.getBoundingClientRect().top);
th={...th,replies:[...th.replies,reply('c4','Nested above the reader','r1')]};ws.send(JSON.stringify({t:'forum',kind:'reply',threadId:'t1'}));await p.locator('[data-reply-key="c4"]').waitFor();await p.waitForTimeout(400);assert(Math.abs((await p.locator('[data-reply-key="r2"]').evaluate(el=>el.getBoundingClientRect().top))-readingTop)<2,'live insertion moved reading position');
// Server edits/deletions update the keyed reply without remounting the thread.
th={...th,replies:th.replies.map(r=>r.id==='r2'?{...r,content:'Updated live reply'}:r)};ws.send(JSON.stringify({t:'forum',kind:'reply',threadId:'t1'}));await p.getByText('Updated live reply',{exact:true}).waitFor({timeout:2500});assert.equal(await p.locator('[data-reply-key="r2"]').getAttribute('data-sentinel'),'keep');
th={...th,replies:th.replies.filter(r=>r.id!=='r2')};ws.send(JSON.stringify({t:'forum',kind:'reply',threadId:'t1'}));await p.locator('[data-reply-key="r2"]').waitFor({state:'detached',timeout:2500});assert(await p.evaluate(()=>keep.box===document.querySelector('.forum-replybox')));
// Explicit thumbnails win; content images do not substitute for a missing thumbnail.
await p.goto(ORIGIN+'/#journal');await p.locator('.chat-ge').first().waitFor();await p.waitForTimeout(1200);
assert.equal(await p.locator('canvas.chat-ge-globe').count(),2);const globe=p.locator('canvas.chat-ge-globe').first();const frame=await globe.evaluate(el=>el.toDataURL());await p.waitForTimeout(100);assert.notEqual(await globe.evaluate(el=>el.toDataURL()),frame,'embed globe does not spin');
const navSpacing=await p.evaluate(()=>{const nav=document.querySelector('.nav'),split=nav.querySelector('.split'),cart=document.querySelector('#cart-btn');split.style.display='block';cart.classList.remove('hidden');const a=nav.querySelector('[data-view="journal"]').getBoundingClientRect(),b=cart.getBoundingClientRect();return b.left-a.right;});assert(navSpacing>=10&&navSpacing<=16,'cart spacing is uneven');
const thumb=p.locator('.chat-ge[href="/#globe/t1"] .chat-ge-pic');assert.equal(await thumb.locator(':scope > img').getAttribute('src'),'https://api.misereperdue.com/api/media/thumb123');assert.equal(await thumb.evaluate(el=>el.classList.contains('is-av')),false);
assert(await p.locator('.chat-ge[href="/#globe/t2"] .chat-ge-pic').evaluate(el=>el.classList.contains('is-av')),'missing thumbnail should use avatar');await p.screenshot({path:OUT+'/embed-thumbnail-'+theme+'.png'});
assert.equal(errors.length,0,errors.join('\n'));console.log(JSON.stringify({theme,passed:'collapse, rapid toggle, drafts, instant/nested/own/polled replies, animation, DOM identity, thumbnail fallback',errors}));await c.close();}
await browser.close();console.log('PASS Globe reply suite');})().catch(e=>{console.error(e);process.exit(1)});
