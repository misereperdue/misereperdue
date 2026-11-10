// + menu sub-panel titles (dc t537u): every panel title sits left, next to Back, like Misery FM and Music.
// WebKit, iPhone 14 touch profile, dark + light. All APIs mocked; no real account writes.
const pw=require(process.env.MP_PLAYWRIGHT||'playwright'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const ROOT=path.resolve(__dirname,'..'),ORIGIN='https://misereperdue.com',OUT=process.env.MP_TEST_ARTIFACTS||'/tmp/mp-plus-titles';fs.mkdirSync(OUT,{recursive:true});
const T={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp','.mp4':'video/mp4','.woff2':'font/woff2','.json':'application/json'};
(async()=>{const browser=await pw.webkit.launch();
for(const theme of ['dark','light']){
 const c=await browser.newContext({...pw.devices['iPhone 14'],colorScheme:theme,serviceWorkers:'block'}),errors=[];
 const user={username:'tester',member:true,owner:false,vip:true,points:40,hasRecovery:true,hasPassword:true};
 const messages=Array.from({length:70},(_,i)=>({id:'m'+i,user:i%3?'other':'tester',text:'Message number '+i+' in a long chat so the page scrolls',ts:Date.now()-(70-i)*6e4}));
 await c.addInitScript(([th])=>{localStorage.setItem('chat_token','test-only');localStorage.setItem('theme',th);sessionStorage.setItem('rc_later','1');},[theme]);
 await c.routeWebSocket(/api\.misereperdue\.com/,s=>{if(!/\/api\/fm\//.test(s.url()))setTimeout(()=>s.send(JSON.stringify({t:'hello',you:user,messages,online:2,caps:{private:1,poll:1}})),40);});
 await c.route('**/*',async r=>{const u=new URL(r.request().url()),H={'access-control-allow-origin':'*','access-control-allow-headers':'*'};
  if(u.origin===ORIGIN){const f=path.join(ROOT,u.pathname==='/'?'index.html':decodeURIComponent(u.pathname));if(fs.existsSync(f)&&fs.statSync(f).isFile())return r.fulfill({path:f,contentType:T[path.extname(f)]||'application/octet-stream'});return r.fulfill({status:404,body:''});}
  if(u.hostname==='api.misereperdue.com'){if(r.request().method()==='OPTIONS')return r.fulfill({status:204,headers:H});let d={ok:true};
   if(u.pathname==='/api/me')d={ok:true,user};else if(u.pathname==='/api/messages')d={ok:true,messages,badges:{}};else if(u.pathname==='/api/ws-ticket')d={ticket:'t'};else if(u.pathname==='/api/forum/threads')d={ok:true,threads:Array.from({length:30},(_,i)=>({id:'t'+i,title:'Thread '+i,user:'other',ts:Date.now()-i*36e5,replies:i,cat:'general'}))};else if(u.pathname==='/api/forum/categories')d={ok:true,categories:[]};else if(u.pathname.startsWith('/api/fm/'))d={ok:true,fm:{live:false,paused:false,pos:0,idx:0,startedAt:0,v:1,now:Date.now(),list:[],q:[],upNext:[],hist:[],listeners:0,shuffle:false,repeat:'all',xf:0,note:'',sched:0}};
   return r.fulfill({json:d,headers:H});}
  if(u.hostname==='itunes.apple.com')return r.fulfill({json:{results:[]}});
  return r.fulfill({json:{data:{products:{edges:[]}}}});});
 const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));
 await p.goto(ORIGIN+'/#journal');await p.waitForSelector('[data-id="m69"]',{timeout:15000});await p.waitForTimeout(3500);
 const ftap=async sel=>{const b=await p.locator(sel).first().boundingBox();assert(b,'no '+sel);await p.touchscreen.tap(b.x+b.width/2,b.y+b.height/2);};
 const M=()=>p.evaluate(()=>{const m=document.querySelector('.chat-plus-menu.chat-pbig');if(!m)return null;const hd=m.querySelector('.chat-pbig-hd'),R=e=>e.getBoundingClientRect(),bk=hd.querySelector('.chat-pbig-btn'),t=hd.querySelector('b')||hd.querySelector('.fm-hd-t'),tt=t.querySelector('.chat-music-heading')||t,cs=getComputedStyle(tt),x=[...hd.querySelectorAll('.chat-pbig-btn')].pop();
   const r=R(t),rb=R(bk),txt=[...tt.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join('').trim();return{kind:[...m.classList].find(c=>/^chat-pbig-/.test(c)),gap:Math.round(r.left-rb.right),tcy:Math.round(r.top+r.height/2-(rb.top+rb.height/2)),fs:cs.fontSize,fw:cs.fontWeight,ls:cs.letterSpacing,txt,full:hd.innerText.replace(/\s+/g,' ').trim(),closeR:Math.round(R(m).right-R(x).right),backL:Math.round(rb.left-R(m).left)};});
 const out={};
 for(const k of ['globe','music','poll','fm']){
  await ftap('.chat-plus');await p.waitForTimeout(500);await ftap(k==='fm'?'.chat-plus-menu .chat-misery-fm':`.chat-plus-menu [data-act="${k}"]`);await p.waitForTimeout(900);
  out[k]=await M();await p.screenshot({path:`${OUT}/${theme}-${k}.png`});
  await p.keyboard.press('Escape');await p.waitForTimeout(300);if(await p.locator('.chat-plus-menu.chat-pbig').count()){await ftap('.chat-plus-menu.chat-pbig .chat-pbig-btn:last-of-type');await p.waitForTimeout(400);}
 }
 console.log(theme,JSON.stringify(out));
 {
  const ref=out.fm;for(const k of ['globe','music','poll']){const o=out[k];assert(o,k+' did not open');assert(Math.abs(o.gap-ref.gap)<=1,`${theme} ${k} title gap ${o.gap} vs fm ${ref.gap}`);assert(Math.abs(o.tcy)<=1,`${k} title centred on Back ${o.tcy}`);assert.equal(o.backL,ref.backL,k+' back position');}
  const ty=['globe','music','poll'].map(k=>out[k].fs+'/'+out[k].fw+'/'+out[k].ls);assert(ty.every(x=>x===ty[0]),'same typography '+ty);
  assert(!/share a song/i.test(out.music.full),'music header still says Share a song: '+out.music.full);
 }
 assert.deepEqual(errors,[]);await c.close();}
await browser.close();})().catch(e=>{console.error(e);process.exit(1);});
