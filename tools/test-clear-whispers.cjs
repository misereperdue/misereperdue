// Mocked regression (dc t639u): a whisper from history disappears on the live "clear" broadcast and is not
// re-rendered from any client cache on reload. (Root cause was the Worker keeping pm:* through a clear.)
const {chromium}=require(process.env.PW||'playwright'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const ROOT=path.resolve(__dirname,'..'),ORIGIN='https://misereperdue.com';
const T={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'application/javascript; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.jpg':'image/jpeg'};
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROME||'/usr/bin/chromium',args:['--no-sandbox']});
const me={username:'dc',points:5,hasRecovery:true,hasPassword:true,owner:true},now=Date.now();
const whisper={id:'pm1',user:'dc',to:'spill',private:true,text:'Ur a goof',ts:now-15*864e5};
let history=[whisper,{id:'m1',user:'dc',text:'Test',ts:now-60000}],sock=null;
const c=await b.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
await c.addInitScript(()=>{localStorage.setItem('chat_token','test-only');sessionStorage.setItem('rc_later','1');});
await c.routeWebSocket(/api\.misereperdue\.com/,s=>{sock=s;setTimeout(()=>s.send(JSON.stringify({t:'hello',you:me,messages:history,online:1,caps:{private:1}})),40);});
await c.route('**/*',async r=>{const u=new URL(r.request().url());
 if(u.origin===ORIGIN){const f=path.join(ROOT,u.pathname==='/'?'index.html':decodeURIComponent(u.pathname));if(fs.existsSync(f)&&fs.statSync(f).isFile())return r.fulfill({path:f,contentType:T[path.extname(f)]||'application/octet-stream'});return r.fulfill({status:404,body:''});}
 if(!/misereperdue/.test(u.host))return r.fulfill({status:404,body:''});
 let d={ok:true,messages:u.pathname==='/api/messages'?history:[]};if(u.pathname==='/api/me')d={ok:true,user:me};else if(u.pathname==='/api/ws-ticket')d={ok:true,ticket:'t'};
 return r.fulfill({json:d,headers:{'access-control-allow-origin':'*'}});});
const p=await c.newPage();await p.goto(ORIGIN+'/#journal');
await p.locator('#chat .chat-msg[data-id="pm1"]').waitFor({timeout:10000});
sock.send(JSON.stringify({t:'clear'}));await p.waitForTimeout(300);
assert.equal(await p.locator('#chat .chat-msg').count(),0,'clear removes every bubble, whispers included');
history=[];await p.reload();await p.waitForTimeout(2500);
assert.equal(await p.locator('#chat .chat-msg[data-id="pm1"]').count(),0,'no cached whisper after reload');
console.log(JSON.stringify({passed:'whisper removed live on clear, not restored from a client cache'}));await b.close();})().catch(e=>{console.error(e);process.exit(1)});
