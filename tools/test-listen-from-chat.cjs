// Sharing a song in public chat sets your profile Listening (per dc): via the + Music picker and via a
// pasted song link (whispers are skipped in code: !mpPM.to). All APIs mocked; Chromium (MP_CHROMIUM_PATH to override).
// Run: node tools/test-listen-from-chat.cjs
const pw=require(process.env.MP_PLAYWRIGHT||'playwright'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const ROOT=path.resolve(__dirname,'..'),ORIGIN='https://misereperdue.com';
const T={'.html':'text/html','.css':'text/css','.js':'application/javascript','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.webp':'image/webp','.json':'application/json','.mp4':'video/mp4','.woff2':'font/woff2'};
const URL1='https://music.apple.com/ca/album/blonde/1146195596?i=100',URL2='https://open.spotify.com/track/4iV5W9uYEdYUVa79Axb7Rh';
const track={trackId:100,trackName:'Nights',artistName:'Frank Ocean',collectionName:'Blonde',trackViewUrl:URL1,artworkUrl100:ORIGIN+'/img/icon-192.png',kind:'song',wrapperType:'track',trackExplicitness:'notExplicit'};
(async()=>{const browser=await pw.chromium.launch({executablePath:process.env.MP_CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 const me={username:'tester',points:5,member:true,hasRecovery:true,hasPassword:true,listening:null};const saved=[],sends=[],errors=[];
 const c=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
 await c.addInitScript(()=>{localStorage.setItem('chat_token','test-only');sessionStorage.setItem('rc_later','1');});
 await c.routeWebSocket(/api\.misereperdue\.com/,s=>{setTimeout(()=>s.send(JSON.stringify({t:'hello',you:me,messages:[],online:1,caps:{}})),40);});
 await c.route('**/*',async r=>{const u=new URL(r.request().url()),body=r.request().method()==='POST'?r.request().postDataJSON():null;
  if(u.origin===ORIGIN){const f=path.join(ROOT,u.pathname==='/'?'index.html':decodeURIComponent(u.pathname));if(fs.existsSync(f)&&fs.statSync(f).isFile())return r.fulfill({path:f,contentType:T[path.extname(f)]||'application/octet-stream'});return r.fulfill({status:404,body:''});}
  if(u.hostname==='itunes.apple.com')return r.fulfill({json:{results:[track]}});
  let d={ok:true,messages:[]};
  if(u.pathname==='/api/me')d={ok:true,user:me};else if(u.pathname==='/api/ws-ticket')d={ticket:'t'};else if(u.pathname==='/api/music/search')d={ok:true,tracks:[]};
  else if(u.pathname==='/api/send'){sends.push(body);d={ok:true};}
  else if(u.pathname==='/api/profile/music'){const url=u.searchParams.get('url');d={ok:true,listening:{title:url===URL2?'Pink + White':'Nights',artist:'Frank Ocean',url,art:null,provider:url===URL2?'spotify':'apple'}};}
  else if(u.pathname==='/api/profile'){saved.push(body);me.listening=body.listening;d={ok:true,user:{...me}};}
  return r.fulfill({json:d,headers:{'access-control-allow-origin':'*'}});});
 const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(ORIGIN+'/#journal');await p.locator('.chat-plus').waitFor({timeout:15000});await p.waitForTimeout(600);

 // 1. + Music picker: pick and send -> Listening saved.
 await p.locator('.chat-plus').click();await p.waitForTimeout(350);await p.locator('[data-act="music"]').click();await p.locator('.chat-music-q').fill('nights');
 await p.locator('.chat-music-track').first().click();const send=p.locator('.chat-gp-prev-send');await send.waitFor({timeout:8000});await p.waitForTimeout(400);await send.click();
for(let i=0;i<40&&!saved.length;i++)await p.waitForTimeout(100);
 assert.equal(sends.at(-1).text,URL1);assert.equal(saved.length,1,'profile saved once');assert.equal(saved[0].listening.title,'Nights');assert.equal(saved[0].listening.url,URL1);

 // 2. Pasted song link sent as a message -> Listening updated.
 const inp=p.locator('#chat .chat-inputbar input');await inp.fill(URL2);await p.locator('#chat .chat-inputbar .chat-send').click();
 for(let i=0;i<40&&saved.length<2;i++)await p.waitForTimeout(100);assert.equal(saved.length,2);assert.equal(saved[1].listening.title,'Pink + White');

 // 3. Same song again: no redundant save. Plain text: none.
 await inp.fill(URL2);await p.locator('#chat .chat-inputbar .chat-send').click();await inp.fill('hello there');await p.locator('#chat .chat-inputbar .chat-send').click();await p.waitForTimeout(1200);
 assert.equal(saved.length,2,'no save for repeat song or plain text');

 assert.deepEqual(errors,[]);await browser.close();console.log('Listening from chat passed (picker, pasted link, dedupe, plain text)');
})().catch(e=>{console.error(e);process.exit(1);});
