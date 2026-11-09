// Music picker idle state: recently picked songs per user (newest first, deduped, max 10), empty state with waveform.
// iTunes + chat APIs mocked; no writes.
const pw=require(process.env.MP_PLAYWRIGHT||'playwright'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const ROOT=path.resolve(__dirname,'..'),ORIGIN='https://misereperdue.com',OUT=process.env.MP_TEST_ARTIFACTS||'/tmp/mp-music-recent';fs.mkdirSync(OUT,{recursive:true});
const T={'.html':'text/html','.css':'text/css','.js':'application/javascript','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.webp':'image/webp','.json':'application/json','.mp4':'video/mp4'};
const url=id=>`https://music.apple.com/ca/album/example/100?i=${id}`,track=(id,n)=>({trackId:id,trackName:n,artistName:'Artist '+id,collectionName:'Album',trackTimeMillis:200000,trackViewUrl:url(id),artworkUrl100:ORIGIN+'/img/icon-192.png'});
(async()=>{const KIND=process.env.MP_BROWSER||'chromium';const browser=await pw[KIND].launch(KIND==='chromium'?{executablePath:process.env.MP_CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']}:{});
for(const theme of ['dark','light']){
 const user={username:'Tester',points:4,hasRecovery:true,hasPassword:true,member:true};
 const c=await browser.newContext({viewport:{width:390,height:844},isMobile:KIND==='chromium',hasTouch:true,colorScheme:theme,serviceWorkers:'block'});const errors=[];
 await c.addInitScript(()=>{localStorage.setItem('chat_token','test-only');sessionStorage.setItem('rc_later','1');});
 await c.routeWebSocket(/api\.misereperdue\.com/,s=>{setTimeout(()=>s.send(JSON.stringify({t:'hello',you:user,messages:[],online:1,caps:{}})),40);});
 await c.route('**/*',async r=>{const u=new URL(r.request().url());
  if(u.hostname==='itunes.apple.com')return r.fulfill({json:{results:[track(1,'First song'),track(2,'Second song'),track(3,'Third song')]}});
  if(u.origin===ORIGIN){const f=path.join(ROOT,u.pathname==='/'?'index.html':decodeURIComponent(u.pathname));if(fs.existsSync(f)&&fs.statSync(f).isFile())return r.fulfill({path:f,contentType:T[path.extname(f)]||'application/octet-stream'});return r.fulfill({status:404,body:''});}
  if(u.pathname.startsWith('/api/avatarimg/'))return r.fulfill({path:ROOT+'/img/icon-192.png',contentType:'image/png'});
  let d={ok:true,messages:[],count:0};if(u.pathname==='/api/me')d={ok:true,user};else if(u.pathname==='/api/ws-ticket')d={ticket:'t'};else if(u.pathname==='/api/messages')d={ok:true,messages:[],badges:{}};
  return r.fulfill({json:d,headers:{'access-control-allow-origin':'*'}});});
 const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(ORIGIN+'/#journal');await p.locator('.chat-plus').waitFor();await p.waitForTimeout(800);
 const menu=p.getByRole('dialog',{name:'Share music'});
 const open=async()=>{await p.locator('.chat-plus').click();await p.locator('[data-act="music"]').click();await menu.waitFor();await p.waitForTimeout(450);};
 const pick=async name=>{await p.locator('.chat-music-q').fill('song');await menu.locator('.chat-music-track',{hasText:name}).first().click();const g=p.getByRole('group',{name:'Music preview'});await g.waitFor();await p.waitForTimeout(450);await g.getByRole('button',{name:'Cancel',exact:true}).click();await p.waitForTimeout(300);};
 await open();
 await menu.getByText('No recently played songs',{exact:true}).waitFor();
 assert.equal(await menu.locator('.chat-music-idle-wave i').count(),5,'empty state lost the waveform');
 assert.notEqual(await menu.locator('.chat-music-idle-wave i').first().evaluate(e=>getComputedStyle(e).animationName),'none','waveform not animated');
 if(theme==='dark')await p.screenshot({path:`${OUT}/empty.png`});
 await pick('First song');await open();await pick('Second song');await open();await pick('First song');
 await open();
 assert.equal(await menu.locator('.chat-music-status').textContent(),'RECENT');assert.equal(await menu.locator('.chat-music-branding').count(),1,'Apple Music footer missing on recents');
 assert.deepEqual(await menu.locator('.chat-music-track strong').allTextContents(),['First song','Second song'],'recent order/dedupe');
 assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('mp-music-recent-v1:tester')).length),2,'stored per user (lowercased)');
 if(theme==='dark')await p.screenshot({path:`${OUT}/recent.png`});
 await menu.locator('.chat-music-track').nth(1).click();const g=p.getByRole('group',{name:'Music preview'});await g.waitFor();await p.waitForTimeout(450);
 assert.match(await g.textContent(),/Second song/,'recent row did not drop into the bar');await g.getByRole('button',{name:'Cancel',exact:true}).click();await p.waitForTimeout(300);
 // cap at 10
 await p.evaluate(()=>{const l=[];for(let i=0;i<14;i++)l.push({trackId:100+i,trackName:'S'+i,artistName:'A',trackViewUrl:'https://music.apple.com/ca/album/x/100?i='+(100+i)});localStorage.setItem('mp-music-recent-v1:tester',JSON.stringify(l));});
 await open();assert.equal(await menu.locator('.chat-music-track').count(),10,'max 10 recents');
 assert.deepEqual(errors,[]);console.log(JSON.stringify({kind:KIND,theme,passed:'empty state + waveform, recent newest-first, dedupe, per-user, tap drops into bar, max 10'}));await c.close();}
await browser.close();})().catch(e=>{console.error(e);process.exit(1)});
