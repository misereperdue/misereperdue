// "+artist song" now-playing cards (dc t632u): all APIs mocked, no production requests.
// Covers: typed + sent, extra spaces, zero-width/no-break space, full-width plus, Worker search first with
// iTunes fallback, "+1 ..." / mid-text + stay plain, no eq/waveform on the card.
// Run: PW=<playwright module> CHROME=<chromium path> node tools/test-plus-embed.cjs
const pw=require(process.env.PW||'playwright'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const ROOT=path.resolve(__dirname,'..'),ORIGIN='https://misereperdue.com';
const T={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.json':'application/json'};
const URL1='https://music.apple.com/ca/album/blonde/1146195596?i=100';
const track={trackId:100,trackName:'Nights',artistName:'Frank Ocean',collectionName:'Blonde',trackViewUrl:URL1,artworkUrl100:ORIGIN+'/img/icon-192.png',kind:'song',wrapperType:'track'};
(async()=>{const b=await pw.chromium.launch({executablePath:process.env.CHROME||'/usr/bin/chromium',args:['--no-sandbox']});
 const me={username:'tester',points:5,hasRecovery:true,hasPassword:true};const errors=[],hits={worker:0,itunes:0};let ws,workerDown=false;
 const c=await b.newContext({viewport:{width:390,height:844},serviceWorkers:'block',isMobile:true,hasTouch:true});
 await c.addInitScript(()=>{localStorage.setItem('chat_token','test-only');sessionStorage.setItem('rc_later','1');});
 await c.routeWebSocket(/api\.misereperdue\.com/,s=>{ws=s;s.onMessage(m=>{try{const j=JSON.parse(m);j.t==='send'&&setTimeout(()=>s.send(JSON.stringify({t:'msg',m:{id:'s'+Date.now(),cid:j.cid,user:'tester',text:j.text,ts:Date.now()}})),30);}catch(_){}});setTimeout(()=>s.send(JSON.stringify({t:'hello',you:me,messages:[],online:1,caps:{}})),40);});
 await c.route('**/*',async r=>{const u=new URL(r.request().url());
  if(u.origin===ORIGIN){const f=path.join(ROOT,u.pathname==='/'?'index.html':decodeURIComponent(u.pathname));if(fs.existsSync(f)&&fs.statSync(f).isFile())return r.fulfill({path:f,contentType:T[path.extname(f)]||'application/octet-stream'});return r.fulfill({status:404,body:''});}
  if(u.hostname==='itunes.apple.com'){hits.itunes++;return r.fulfill({json:{resultCount:1,results:[track]},headers:{'access-control-allow-origin':'*'}});}
  if(u.hostname==='musicbrainz.org')return r.fulfill({json:{recordings:[]},headers:{'access-control-allow-origin':'*'}});
  let d={ok:true,messages:[]};
  if(u.pathname==='/api/me')d={ok:true,user:me};else if(u.pathname==='/api/ws-ticket')d={ok:true,ticket:'t'};
  else if(u.pathname==='/api/music/search'){hits.worker++;if(workerDown)return r.fulfill({status:503,json:{ok:false},headers:{'access-control-allow-origin':'*'}});d={ok:true,tracks:[track]};}
  else if(u.pathname==='/api/profile/music')d={ok:true,listening:{title:'Nights',artist:'Frank Ocean',url:URL1,provider:'apple'}};
  return r.fulfill({json:d,headers:{'access-control-allow-origin':'*'}});});
 const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));
 await p.goto(ORIGIN+'/#journal');await p.locator('.chat-plus').waitFor({timeout:15000});await p.waitForTimeout(800);
 const inp=p.locator('#chat .chat-inputbar input').first();
 async function send(text,typed){await p.evaluate(()=>localStorage.clear()||localStorage.setItem('chat_token','test-only'));
  if(typed){await inp.click();await inp.pressSequentially(text,{delay:5});}else await inp.fill(text);
  await p.locator('#chat .chat-inputbar .chat-send').click();await p.waitForTimeout(900);
  return p.evaluate(()=>{const m=[...document.querySelectorAll('#chat .chat-msg')].pop();const np=m&&m.querySelector('.chat-np');return {np:!!np,loaded:!!np&&!np.classList.contains('is-loading'),eq:!!(m&&m.querySelector('.chat-np-eq')),line:np?np.textContent:''};});}
 let r=await send('+frank ocean nights',true);assert(r.np&&r.loaded,'typed +song makes a card');assert.match(r.line,/Nights/);assert(!r.eq,'no waveform on the card');
 assert(hits.worker>=1,'Worker search used first');
 for(const t of ['+   frank    ocean   nights two','\u200b+\u00a0frank ocean nights three','\uff0bfrank ocean nights four']){r=await send(t);assert(r.np,'card for '+JSON.stringify(t));}
 workerDown=true;const it=hits.itunes;r=await send('+frank ocean nights five');assert(r.np&&r.loaded,'falls back to iTunes');assert(hits.itunes>it,'iTunes fallback hit');
 for(const t of ['+1 555 0100','2+2 is 4','hello +frank ocean']){r=await send(t);assert(!r.np,'plain: '+t);}
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:'typed, spaces, zero-width/nbsp, full-width plus, worker first + iTunes fallback, plain + texts, no waveform'}));await b.close();})().catch(e=>{console.error(e);process.exit(1)});
