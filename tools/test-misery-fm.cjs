// Misery FM v2: WebKit iPhone 14, owner dark+light, listener dark+light, reduced motion. The mock API runs the REAL Worker
// FM logic (worker/misery-chat/src/fm*.js) against in-memory R2/DO storage, so pause/seek/shuffle/queue/edit/upload
// behave exactly like production; no real API, no accounts, service worker blocked.
// Covers: top-bar live state on Shop/Globe/Chat/product/cart (+ off), morph open/back, chat live bar, listener sheet,
// studio (transport, seek, shuffle, repeat, drag reorder, play next, edit sheet + cover, ID3 upload), station tab,
// reactions, sync after pause/seek, stop clears every bar. MP_PLAYWRIGHT=<playwright[-core]> node tools/test-misery-fm.cjs
const pw=require(process.env.MP_PLAYWRIGHT||'playwright'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const ROOT=path.resolve(__dirname,'..'),ORIGIN='https://misereperdue.com',OUT=process.env.MP_TEST_ARTIFACTS||'/tmp/mp-misery-fm';fs.mkdirSync(OUT,{recursive:true});
const T={'.html':'text/html','.css':'text/css','.js':'application/javascript','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.webp':'image/webp','.json':'application/json'};
const SRC=ROOT+'/worker/misery-chat/src/',top=fs.readFileSync(SRC+'fm.js','utf8'),d=fs.readFileSync(SRC+'fm_do.js','utf8');
const methods=d.slice(d.indexOf('  /* ---------- Misery FM ---------- */'),d.lastIndexOf('\n}')).replace(/\n  fmCast\(obj\) \{[\s\S]*?\n  \}\n/,'\n');
const json=(x,st)=>new Response(JSON.stringify(x),{status:st||200,headers:{'Content-Type':'application/json'}}),err=(m,st)=>json({ok:false,error:m},st||400);
const COVER=fs.readFileSync(ROOT+'/tools/fixtures/fm-cover.jpg'),COVER2=fs.readFileSync(ROOT+'/tools/fixtures/fm-cover2.png');
const FX=n=>fs.readFileSync(ROOT+'/tools/fixtures/'+n);
// iOS: the page is hidden while the Files picker is open and the sheet re-renders on return.
// Open the real file chooser, force a state broadcast + re-render, THEN deliver the files.
async function pick(p,srv,tapSel,files){if(tapSel.includes('[data-a="add"]')){await p.locator(tapSel).tap();tapSel='.fm-root [data-a="addaudio"]';}const [fc]=await Promise.all([p.waitForEvent('filechooser'),p.locator(tapSel).tap()]);
 await p.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>'hidden'});document.dispatchEvent(new Event('visibilitychange'));Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>'visible'});document.dispatchEvent(new Event('visibilitychange'));});
 srv.r.fmCast({t:'fm',fm:srv.r.fmPublic(await srv.r.fmGet())});await p.waitForTimeout(250);await fc.setFiles(files);}
const toastIs=(p,re)=>p.waitForFunction(src=>{const t=document.querySelector('.fm-toast.is-on');return t&&new RegExp(src).test(t.textContent);},re.source,{timeout:20000}).catch(async e=>{console.log('TOAST?',await p.evaluate(()=>({t:(document.querySelector('.fm-toast')||{}).textContent,ups:[...document.querySelectorAll('.fm-ups li')].map(l=>l.textContent)})));throw e;});
const wav=(()=>{const n=8000*300,b=Buffer.alloc(44+n,128);b.write('RIFF',0);b.writeUInt32LE(36+n,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(8000,24);b.writeUInt32LE(8000,28);b.writeUInt16LE(1,32);b.writeUInt16LE(8,34);b.write('data',36);b.writeUInt32LE(n,40);return b;})();
function mkServer(){const objs=new Map(),bucket={put:async(k,b,o)=>{objs.set(k,{b:Buffer.from(b instanceof ArrayBuffer?new Uint8Array(b):b),ct:o&&o.httpMetadata&&o.httpMetadata.contentType})},delete:async k=>objs.delete(k),
  get:async k=>{const x=objs.get(k);return x?{size:x.b.length,body:x.b,httpEtag:'"e"',writeHttpMetadata:h=>h.set('Content-Type',x.ct||'application/octet-stream')}:null}};
 const socks=new Set(),R=new Function('json','err','bucket','socks',top+'\nreturn [fmAudio,class R{constructor(){this.state={storage:{m:new Map(),get:async k=>this.state.storage.m.get(k),put:async(k,v)=>this.state.storage.m.set(k,structuredClone(v)),setAlarm:async t=>{this.alarmAt=t},deleteAlarm:async()=>{this.alarmAt=null}}};this.env={FM_BUCKET:bucket};this.sent=[];}fmCast(o){this.sent.push(o);const s=JSON.stringify(o);for(const w of socks)try{w.send(s)}catch(e){}}async bearerUser(req){const a=req.headers.get("Authorization")||"";return a==="Bearer owner-tok"?{username:"dc",owner:true}:a==="Bearer fan-tok"?{username:"fan"}:null}deviceIdFromReq(req){return req.headers.get("X-Device-Id")||"dev"}clientIp(){return "1.1.1.1"}\n'+methods+'}];')(json,err,bucket,socks);
 return {fmAudio:R[0],r:new R[1](),objs,socks,bucket};}
const OWN={headers:{Authorization:'Bearer owner-tok'}};
async function seed(srv){const r=srv.r,call=(p,init)=>r.fmRoute(new Request('https://x'+p,init),p.split('?')[0]).then(x=>x.json());
 const up=(q)=>call('/api/fm/upload?'+q,{method:'POST',headers:{...OWN.headers,'Content-Type':'audio/mpeg'},body:new Uint8Array(400)});
 const a=await up('title=Blinding%20Lights&artist=The%20Weeknd&album=After%20Hours&year=2020&genre=R%26B&explicit=&dur=200'),b=await up('title=Pink%20%2B%20White&artist=Frank%20Ocean&album=Blonde&year=2016&dur=184'),
  c=await up('title=SOME%20MORE&artist=Future&album=Mixtape%20Pluto&year=2024&genre=Hip-Hop&explicit=1&dur=215'),e=await up('title=Halo&artist=Beyonc%C3%A9&album=I%20Am...%20Sasha%20Fierce&year=2008&dur=261');
 await call('/api/fm/art?id='+a.id,{method:'POST',headers:{...OWN.headers,'Content-Type':'image/jpeg'},body:COVER});
 await call('/api/fm/art?id='+c.id,{method:'POST',headers:{...OWN.headers,'Content-Type':'image/png'},body:COVER2});
 const w=new Uint8Array(2150);for(let i=0;i<w.length;i++)w[i]=Math.round(120+100*Math.abs(Math.sin(i/3))*Math.random());
 await call('/api/fm/wave?id='+a.id,{method:'POST',headers:{...OWN.headers,'Content-Type':'application/octet-stream'},body:w});
 const ctl=b2=>call('/api/fm/control',{method:'POST',headers:{...OWN.headers,'Content-Type':'application/json'},body:JSON.stringify(b2)});
 await ctl({action:'live'});await ctl({action:'skip'});await ctl({action:'skip'});await ctl({action:'skip'});await ctl({action:'play',id:a.id});
 r._fm.startedAt=Date.now()-42e3;await ctl({action:'note',text:'New Future album at midnight. Stay up.'});
 return {ids:[a.id,b.id,c.id,e.id],ctl,call};}
function id3(){const fr=(id,data)=>{const h=Buffer.alloc(10);h.write(id,0);h.writeUInt32BE(data.length,4);return Buffer.concat([h,data]);},tx=(id,s)=>fr(id,Buffer.concat([Buffer.from([3]),Buffer.from(s,'utf8')]));
 const body=Buffer.concat([tx('TIT2','Mask Off'),tx('TPE1','Future'),tx('TALB','FUTURE'),tx('TYER','2017'),tx('TCON','Trap'),tx('TLEN','204000'),fr('TXXX',Buffer.concat([Buffer.from([3]),Buffer.from('ITUNESADVISORY\u00001')])),
  fr('APIC',Buffer.concat([Buffer.from([0]),Buffer.from('image/jpeg\u0000'),Buffer.from([3,0]),COVER]))]);
 const ss=n=>Buffer.from([(n>>21)&127,(n>>14)&127,(n>>7)&127,n&127]);return Buffer.concat([Buffer.from('ID3'),Buffer.from([3,0,0]),ss(body.length),body,Buffer.alloc(3000,0x55)]);}
const shots={};
async function ctx(browser,{role,theme,reduced}){
 const srv=mkServer(),c=await browser.newContext({...pw.devices['iPhone 14'],colorScheme:theme,reducedMotion:reduced?'reduce':'no-preference',serviceWorkers:'block'});const errors=[];
 await c.addInitScript(([tok,theme])=>{localStorage.setItem('chat_token',tok);localStorage.setItem('chat_device','dev-'+tok);localStorage.setItem('theme',theme);sessionStorage.setItem('rc_later','1');},[role==='owner'?'owner-tok':'fan-tok',theme]);
 const me={username:role==='owner'?'dc':'fan',points:50,hasRecovery:true,hasPassword:true,member:true,owner:role==='owner'};
 await c.routeWebSocket(/api\.misereperdue\.com/,s=>{if(/\/api\/fm\/ws/.test(s.url())){srv.socks.add(s);s.onClose(()=>srv.socks.delete(s));srv.r.fmGet().then(fm=>s.send(JSON.stringify({t:'fm',fm:srv.r.fmPublic(fm)})));}
  else setTimeout(()=>s.send(JSON.stringify({t:'hello',you:me,messages:[{id:'m1',user:'fan',text:'is it on yet',ts:Date.now()-6e4}],online:3,caps:{}})),40);});
 await c.route('**/*',async rt=>{const q=rt.request(),u=new URL(q.url());if(u.origin===ORIGIN){const f=path.join(ROOT,u.pathname==='/'?'index.html':decodeURIComponent(u.pathname));if(fs.existsSync(f)&&fs.statSync(f).isFile())return rt.fulfill({path:f,contentType:T[path.extname(f)]||'application/octet-stream'});return rt.fulfill({status:404,body:''});}
  const H={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*'};
  if(u.hostname!=='api.misereperdue.com')return rt.fulfill({json:{data:{products:{edges:[]}}}});
  if(q.method()==='OPTIONS')return rt.fulfill({status:204,headers:H});
  if(u.pathname.startsWith('/api/fm/audio/'))return rt.fulfill({body:wav,contentType:'audio/wav',headers:H});
  if(/^\/api\/fm\/(art|wave)\//.test(u.pathname)){const res=await srv.fmAudio(new Request(q.url()),srv.r.env);return rt.fulfill({status:res.status,body:Buffer.from(await res.arrayBuffer()),headers:{...H,'content-type':res.headers.get('content-type')||''}});}
  if(u.pathname.startsWith('/api/fm/')){const hd={};for(const[k,v]of Object.entries(q.headers()))hd[k]=v;const res=await srv.r.fmRoute(new Request(q.url(),{method:q.method(),headers:hd,body:q.method()==='POST'?q.postDataBuffer():undefined}),u.pathname);
   return rt.fulfill({status:res?res.status:404,body:res?await res.text():'{}',contentType:'application/json',headers:H});}
  let dd={ok:true,messages:[],count:0};if(u.pathname==='/api/me')dd={ok:true,user:me};else if(u.pathname==='/api/ws-ticket')dd={ticket:'t'};else if(u.pathname==='/api/forum/threads')dd={ok:true,threads:[]};else if(u.pathname==='/api/forum/categories')dd={ok:true,categories:[]};
  return rt.fulfill({json:dd,headers:H});});
 const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource|WebSocket/.test(m.text()))errors.push('console: '+m.text());});
 return {c,p,srv,errors};}
// dc t529u: edit form layout — even gaps, labels flush with inputs, iOS-safe 16px fields, panel grown, + menu header
const edLayout=p=>p.evaluate(()=>{const e=document.querySelector('.fm-edit'),R=n=>n.getBoundingClientRect();const fs=[...e.querySelectorAll('.fm-ed-fs>.fm-f,.fm-ed-fs>.fm-f2,.fm-ed-fs>.fm-ed-sw')];const gaps=fs.slice(1).map((f,i)=>Math.round(R(f).top-R(fs[i]).bottom));const al=[...e.querySelectorAll('.fm-f')].map(f=>Math.round(Math.abs(R(f.querySelector('span')).left-R(f.querySelector('input,textarea')).left)));const sz=[...e.querySelectorAll('input:not([type=checkbox]),textarea')].map(i=>parseFloat(getComputedStyle(i).fontSize));const m=e.closest('.chat-plus-menu');const hd=e.querySelector('.fm-ed-hd'),bk=hd.querySelector('.chat-pbig-btn');const sw=e.querySelector('.fm-ed-sw'),k=sw.querySelector('.fm-sw-k');return{gaps,al,minFs:Math.min(...sz),grown:m?Math.abs(m.offsetHeight-parseFloat(getComputedStyle(m).getPropertyValue('--fm-mh')))<2:true,back:!!bk&&bk.offsetWidth===30,swRight:Math.round(R(sw).right-R(k).right),inside:R(e).left>=R(m||e).left-1};});
const edOk=(l,tag)=>{assert(l.gaps.length>=4&&l.gaps.every(g=>g===12),tag+' field gaps '+l.gaps);assert(l.al.every(a=>a<=1),tag+' label/input alignment '+l.al);assert(l.minFs>=16,tag+' inputs >=16px (no iOS zoom) '+l.minFs);assert(l.grown,tag+' panel grows to full height');assert(l.back,tag+' + menu back button');assert(l.swRight>=8&&l.swRight<=12,tag+' switch at row end '+l.swRight);};
// dc t533u: the E badge sits 3-7px after the title text, the title ellipsizes before it
const eGap=p=>p.evaluate(()=>[...document.querySelectorAll('.fm-ttl>.fm-e,.fm-li-1>.fm-e,.fm-m-1>.fm-e')].filter(e=>e.getClientRects().length).map(e=>{const t=e.previousElementSibling,r=document.createRange();r.selectNodeContents(t);const tr=r.getBoundingClientRect(),br=t.getBoundingClientRect(),er=e.getBoundingClientRect();return{gap:Math.round((er.left-Math.min(tr.right,br.right))*10)/10,clip:t.scrollWidth>t.clientWidth,inside:er.right<=t.parentElement.getBoundingClientRect().right+.5};}));
const eOk=(g,tag)=>{assert(g.length>0,tag+': no E badges');g.forEach(x=>assert(x.gap>=3&&x.gap<=7&&x.inside,tag+': E badge gap '+JSON.stringify(g)));};
// dc t532u: off-air card
const rxGesture=(p,from,to,dy)=>p.evaluate(async([from,to,dy])=>{const box=document.querySelector('.fm-root .fm-reacts'),bs=[...box.querySelectorAll('button')],c=b=>{const r=b.getBoundingClientRect();return[r.left+r.width/2,r.top+r.height/2]};const ev=(el,t,x,y)=>el.dispatchEvent(new PointerEvent(t,{bubbles:true,cancelable:true,pointerId:7,pointerType:'touch',isPrimary:true,clientX:x,clientY:y}));const w=ms=>new Promise(r=>setTimeout(r,ms));
  const [x0,y0]=c(bs[from]),[x1]=c(bs[to]),o={ta:getComputedStyle(box).touchAction,e:bs[to].dataset.e,n:bs.length,body:document.querySelector('.fm-root .fm-sh-body')?.scrollTop||0};const fly0=document.querySelectorAll('.fm-rx-fly').length;
  ev(bs[from],'pointerdown',x0,y0);await w(40);o.hov0=bs[from].classList.contains('is-hov');
  for(let i=1;i<=6;i++){ev(box,'pointermove',x0+(x1-x0)*i/6,y0+dy*i/6);await w(50);}
  const tm=new Event('touchmove',{bubbles:true,cancelable:true}),tt=[{identifier:7,target:box,clientX:x1,clientY:y0+dy,pageX:x1,pageY:y0+dy}];Object.defineProperty(tm,'touches',{value:tt});Object.defineProperty(tm,'targetTouches',{value:tt});Object.defineProperty(tm,'changedTouches',{value:tt});box.dispatchEvent(tm);o.tmPrevented=tm.defaultPrevented;await w(480);
  o.hov=bs.map(b=>b.classList.contains('is-hov')?'H':b.classList.contains('is-near')?'n':'.').join('');const m=new DOMMatrix(getComputedStyle(bs[to]).transform);o.scale=m.a;o.lift=m.f;o.sliding=box.classList.contains('is-sliding');
  ev(box,'pointerup',x1,y0+dy);await w(60);o.rx=box.getAttribute('data-rx');o.fly=document.querySelectorAll('.fm-rx-fly').length-fly0;o.ring=document.querySelectorAll('.fm-rx-ring').length;o.after=bs.filter(b=>b.classList.contains('is-near')).length+(box.classList.contains('is-sliding')?1:0);
  bs[to].click();o.body2=document.querySelector('.fm-root .fm-sh-body')?.scrollTop||0;return o;},[from,to,dy]);
const vizOk=v=>v&&v.pos!=='absolute'&&Math.abs(v.dl-v.dr)<=1&&v.dl<=16&&v.h>=24&&v.belowLine&&v.aboveAct&&v.inCard;
const offState=p=>p.evaluate(()=>{const o=document.querySelector('.fm-root .fm-off');if(!o)return null;const lg=o.querySelector('.fm-off-logo'),cs=getComputedStyle(lg);return{logo:/misery-fm-logo/.test(cs.webkitMaskImage||cs.maskImage)&&lg.offsetWidth>80,st:o.querySelector('.fm-off-st').textContent,line:o.querySelector('.fm-off-l').textContent,go:!!o.querySelector('[data-a="golive"]'),goIcon:(()=>{const g=o.querySelector('[data-a="golive"]');return g?g.getAttribute('aria-label')==='Go live'&&!g.textContent.trim()&&!!g.querySelector('svg'):null})(),viz:(()=>{const v=o.querySelector('.fm-viz'),R=e=>e.getBoundingClientRect(),c=R(o),r=R(v),l=R(o.querySelector('.fm-off-l')),a=o.querySelector('.fm-off-act');return{dl:Math.round(r.left-c.left),dr:Math.round(c.right-r.right),h:Math.round(r.height),belowLine:r.top>=l.bottom-0.5,aboveAct:a?r.bottom<=R(a).top+0.5:true,inCard:r.bottom<=c.bottom-8,pos:getComputedStyle(v).position}})(),add:!!o.querySelector('[data-a="add"]'),hist:document.querySelectorAll('.fm-root .fm-hist').length+(/Recently played/i.test(document.querySelector('.fm-root').innerText)?1:0)};});
const shot=async(p,name,clip)=>{await p.evaluate(()=>{document.querySelectorAll('.fm-root,.fm-sh-body,.fm-edit,.fm-edit *').forEach(b=>{if(b.scrollTop)b.scrollTop=0;});});await p.waitForTimeout(120);const f=`${OUT}/${name}.png`;await p.screenshot(clip?{path:f,clip}:{path:f});shots[name]=f;};
const hbState=p=>p.evaluate(()=>{const b=document.querySelector('.fm-on');if(!b)return null;const r=b.getBoundingClientRect(),o=b.querySelector(':scope>.fm-hb').getBoundingClientRect(),svg=b.querySelector('.fm-ring'),rc=svg.firstChild,sw=+rc.getAttribute('stroke-width'),rw=+rc.getAttribute('width'),rh=+rc.getAttribute('height'),rx=+rc.getAttribute('rx'),pitch=parseFloat(rc.style.strokeDasharray.split(/[ ,]+/)[1]),per=2*(rw+rh)-(8-2*Math.PI)*rx;return{cls:b.className,w:b.offsetWidth,h:b.offsetHeight,ov:[o.left-r.left,o.top-r.top,o.width-r.width,o.height-r.height].map(v=>Math.round(v*10)/10),svgw:+svg.getAttribute('width'),rw,rh,rx,sw,n:per/pitch,pitch,expR:Math.min(parseFloat(getComputedStyle(b).borderTopLeftRadius)-sw/2,rh/2,rw/2),anims:rc.getAnimations().length,dot:!!b.querySelector('.fm-hb-dot,.fm-hb-is i:not(.fm-bl)'),txt:b.querySelector('.fm-hb-in').innerText.replace(/\s+/g,' '),logo:(()=>{const l=b.querySelector('.fm-hb-in .fm-hb-logo'),cs=l&&getComputedStyle(l);return !!cs&&/misery-fm-logo\.svg/.test(cs.webkitMaskImage||cs.maskImage)&&l.offsetWidth>40;})(),
 typo:(()=>{const is=getComputedStyle(b.querySelector('.fm-hb-is')),src=[...b.querySelectorAll('.chat-title, a, button, h1, h2, span')].find(n=>!n.closest('.fm-hb')&&n.getClientRects().length&&/\S/.test(n.textContent)&&n.children.length<=2)||document.querySelector('.chat-head .chat-title'),cs=src&&getComputedStyle(src);return cs?['fontFamily','fontSize','letterSpacing','textTransform'].filter(k=>is[k]!==cs[k]).join():'nosrc';})(),
 stroke:(()=>{const x=b.querySelector('.fm-hb-in'),lg=x.querySelector('.fm-hb-logo').getBoundingClientRect(),bl=x.querySelector('.fm-bl').getBoundingClientRect();return{want:+x.dataset.stem,w:getComputedStyle(x.querySelector('.fm-hb-is')).fontWeight,base:Math.round(Math.abs(bl.top-(lg.top+lg.height*130/160))*10)/10};})()};});
// dotted outline: covers the exact border box, half-stroke inset (never clipped), bar's own radius, dots divide the perimeter evenly
const ringOk=(h,where)=>{assert(h,where+': no live bar');assert.deepEqual(h.ov,[0,0,0,0],where+' ring must cover the border box '+JSON.stringify(h));assert.equal(h.svgw,h.w,where);assert(Math.abs(h.rw-(h.w-h.sw))<0.01&&Math.abs(h.rh-(h.h-h.sw))<0.01,where+' rect inset');assert(Math.abs(h.n-Math.round(h.n))<0.001&&h.pitch>4&&h.pitch<8,where+' even dots '+h.n);assert(Math.abs(h.rx-h.expR)<0.01,where+' radius '+JSON.stringify(h));assert(!h.dot,where+' red dot must be gone');};
const box=(p,sel)=>p.evaluate(s=>{const b=document.querySelector(s),r=b.getBoundingClientRect(),cs=getComputedStyle(b);return[r.left,r.top,r.width,r.height].map(v=>Math.round(v*100)/100).join('|')+'|'+cs.borderTopLeftRadius;},sel);
const npOpen=async(p,sel,how)=>{const b0=await box(p,sel);await how();await p.waitForSelector(sel+'.is-np');await p.waitForTimeout(650);assert.equal(await box(p,sel),b0,'morph changed the bar box ('+sel+')');};
// FM menu = + chat menu sub-panel: morphs the same menu element (no sheet swap), Back returns to the + menu
async function openFM(p){await openPanel(p,'journal');await p.locator('#journal .chat-plus').tap();await p.waitForSelector('#journal .chat-plus-menu.is-in');const m0=await p.evaluate(()=>{const m=document.querySelector('#journal .chat-plus-menu');m.__k=1;return m.getBoundingClientRect().height;});
 await p.locator('#journal .chat-misery-fm').tap();await p.waitForSelector('#journal .chat-plus-menu.chat-pbig-fm.fm-root .fm-sh-body');
 const k=await p.evaluate(()=>{const m=document.querySelector('#journal .chat-plus-menu');return{same:m.__k===1,anims:m.getAnimations().map(a=>a.effect.getKeyframes().map(f=>f.height).join('>')).join(),sheets:document.querySelectorAll('body>.fm-sheet').length,logo:/misery-fm-logo/.test(getComputedStyle(m.querySelector('.fm-hd-logo')).webkitMaskImage),back:!!m.querySelector('.chat-pbig-hd .chat-pbig-btn[aria-label="Back"]'),red:matchMedia('(prefers-reduced-motion: reduce)').matches};});
 assert(k.same&&k.sheets===0&&k.logo&&k.back&&(k.red||/px>.*px/.test(k.anims)),'FM must morph the + menu like the other sub-panels '+JSON.stringify(k));await p.waitForTimeout(450);}
async function openPanel(p,h){await p.evaluate(h=>{location.hash='#'+h;},h);await p.waitForTimeout(900);}
(async()=>{const browser=await pw.webkit.launch();
// ---------- owner, dark: everything ----------
{const {c,p,srv,errors}=await ctx(browser,{role:'owner',theme:'dark'}),S=await seed(srv),[A,B,C,D]=S.ids;
 await p.goto(ORIGIN+'/#shop');await p.waitForSelector('.nav.fm-on',{timeout:15000});
 let h=await hbState(p);ringOk(h,'shop');assert(/nav/.test(h.cls));assert.match(h.txt,/^\s*is live\s*$/i);assert(h.logo,'real Misery FM logo in the IS LIVE phase');assert.equal(h.typo,'','"is live" must use the top bar typography');assert(h.stroke.want>1&&+h.stroke.w>=300&&h.stroke.base<=1.5,'"is live" stroke/baseline vs logo '+JSON.stringify(h.stroke));assert.equal(h.anims,1,'dots drift');
 await p.waitForTimeout(1200);await shot(p,'owner-dark-shop-collapsed',{x:0,y:0,width:390,height:200});
 await p.waitForSelector('.nav.fm-on.is-fm',{timeout:5000});await p.waitForTimeout(700);{const hd=await hbState(p);assert(hd.stroke.base<=1.5,'dark is-live baseline '+JSON.stringify(hd.stroke));}await shot(p,'owner-dark-shop-islive',{x:0,y:0,width:390,height:200});
 // other page types
 for(const pg of ['forum','journal','cart']){await openPanel(p,pg);const hs=await hbState(p);ringOk(hs,pg);assert.equal(/chat-head/.test(hs.cls),pg!=='cart',pg+' targets '+hs.cls);}
 await p.evaluate(()=>{location.hash='#product';});await p.waitForTimeout(700);assert(await hbState(p),'product: no live top bar');
 // chat: morph the chat header
 await openPanel(p,'journal');await p.waitForSelector('#journal .chat-head.fm-on');assert.equal(await p.locator('#chat .fm-bar').count(),0,'separate now playing pill must be gone');
 await npOpen(p,'#journal .chat-head',()=>p.locator('#journal .chat-head .chat-title').tap());
 const m=await p.evaluate(()=>{const b=document.querySelector('#journal .chat-head'),e=b.querySelector('.fm-hb-np');return{t:e.querySelector('.fm-m-t').textContent,img:!!e.querySelector('.fm-m-art img'),op:getComputedStyle(e).opacity,title:getComputedStyle(b.querySelector('.chat-title')).opacity,pg:e.querySelector('.fm-m-fill i').style.transform,thin:e.querySelectorAll('.fm-m-pg').length,fill:(()=>{const f=e.querySelector('.fm-m-fill').getBoundingClientRect(),r=b.getBoundingClientRect();return[f.left-r.left,f.top-r.top,f.width-r.width,f.height-r.height].map(v=>Math.round(v)).join()+'|'+(getComputedStyle(e.querySelector('.fm-m-fill')).borderTopLeftRadius===getComputedStyle(b).borderTopLeftRadius);})(),dbg:[b,b.querySelector('.fm-hb'),e,e.querySelector('.fm-m-in'),e.querySelector('.fm-m-fill')].map(x=>{const r=x.getBoundingClientRect(),c=getComputedStyle(x);return Math.round(r.top)+'/'+Math.round(r.height)+':'+c.position+':'+c.top+':'+c.bottom;}).join(' '),btns:[...e.querySelectorAll('[data-a]')].map(x=>x.dataset.a).join()};});
 assert.equal(m.t,'Blinding Lights');assert(m.img&&m.op==='1'&&m.title==='0'&&/scaleX\(0\.[1-9]/.test(m.pg)&&m.thin===0&&m.fill==='0,0,0,0|true'&&m.btns==='collapse,listen','morph '+JSON.stringify(m));
 {const f0=await p.evaluate(()=>+document.querySelector('.fm-m-fill i').style.transform.match(/[\d.]+/)[0]);await p.waitForTimeout(2100);const f1=await p.evaluate(()=>+document.querySelector('.fm-m-fill i').style.transform.match(/[\d.]+/)[0]);assert(f1>f0,'progress fill must advance '+f0+' '+f1);}await shot(p,'owner-dark-morphed',{x:0,y:0,width:390,height:260});
 {const b0=await box(p,'#journal .chat-head');await p.locator('#journal .chat-head [data-a="collapse"]').tap();await p.waitForTimeout(600);assert.equal(await p.locator('.is-np').count(),0);assert.equal(await box(p,'#journal .chat-head'),b0,'back changed the bar box');}
 await shot(p,'owner-dark-back',{x:0,y:0,width:390,height:260});
 await npOpen(p,'#journal .chat-head',()=>p.locator('#journal .chat-head .chat-title').tap());await p.locator('#journal .chat-head .fm-m-t').tap();await p.waitForTimeout(600);
 assert.equal(await p.locator('.is-np').count(),0,'tapping the bar returns it to normal');assert.equal(await p.locator('.fm-root').count(),0,'tapping the bar must not open the FM menu');
 // studio via morph → sheet
 await openFM(p);await p.waitForSelector('.fm-root .fm-tabs');await p.waitForTimeout(300);
 // listen: plays the right song at the right spot
 await p.locator('.fm-root [data-a="listen"]').tap();
 await p.waitForFunction(()=>{const a=[...document.querySelectorAll('.fm-audio')].find(x=>!x.paused);return a&&a.readyState>0&&a.currentTime>30;},null,{timeout:8000});
 const au=()=>p.evaluate(()=>{const a=[...document.querySelectorAll('.fm-audio')].find(x=>x._id);return a&&{id:a._id,t:a.currentTime,paused:a.paused};});
 const srvPos=async()=>{const f=await srv.r.fmGet();return f.paused?f.pos:(Date.now()-f.startedAt)/1e3;};
 let a1=await au(),sp=await srvPos();assert.equal(a1.id,A);assert(sp>40&&Math.abs(a1.t-sp)<2,'listen seek '+sp+' '+JSON.stringify(a1));
 await shot(p,'owner-dark-now');
 // pause for everyone → audio pauses; resume from the same spot
 await p.locator('.fm-root [data-a="pause"]').tap();await p.waitForTimeout(500);let st=await srv.r.fmGet();assert(st.paused);const pos=st.pos;
 assert.equal((await au()).paused,true,'audio did not pause');assert.equal(await p.locator('.fm-root .fm-paused').count(),1,'sheet shows paused');
 await p.waitForTimeout(2200);await p.locator('.fm-root [data-a="resume"]').tap();await p.waitForTimeout(1200);a1=await au();assert(!a1.paused&&Math.abs(a1.t-pos)<2.5,'resume spot '+pos+' '+JSON.stringify(a1));
 // seek (scrub) → audio jumps
 await p.evaluate(()=>{const s=document.querySelector('.fm-scrub');s.value=150;s.dispatchEvent(new Event('input',{bubbles:true}));s.dispatchEvent(new Event('change',{bubbles:true}));});await p.waitForTimeout(1200);
 a1=await au();sp=await srvPos();assert(Math.abs(a1.t-sp)<2&&sp>150,'seek '+sp+' '+JSON.stringify(a1));
 // skip / prev / restart / shuffle / repeat
 await p.locator('.fm-root [data-a="skip"]').tap();await p.waitForTimeout(500);st=await srv.r.fmGet();assert.equal(st.list[st.idx].id,B);await p.waitForTimeout(700);assert.equal((await au()).id,B,'audio follows skip');
 await p.locator('.fm-root [data-a="prev"]').tap();await p.waitForTimeout(500);st=await srv.r.fmGet();assert.equal(st.list[st.idx].id,A);
 await p.waitForTimeout(3200);await p.locator('.fm-root [data-a="prev"]').tap();await p.waitForTimeout(400);st=await srv.r.fmGet();assert(Date.now()-st.startedAt<1500,'restart');
 await p.locator('.fm-root [data-a="shuffle"]').tap();await p.waitForTimeout(400);assert((await srv.r.fmGet()).shuffle);assert.match(await p.locator('.fm-root .fm-h').first().innerText(),/shuffled/i);
 await p.locator('.fm-root [data-a="shuffle"]').tap();await p.waitForTimeout(300);
 for(const mode of ['one','off','all']){await p.locator('.fm-root [data-a="repeat"]').tap();await p.waitForTimeout(350);assert.equal((await srv.r.fmGet()).repeat,mode);}
 // reactions float + broadcast
 await p.locator('.fm-root [data-a="react"]').first().tap();await p.waitForTimeout(150);assert(await p.locator('.fm-float').count()>=1);assert.equal(await p.locator('.fm-root .fm-reacts .is-pop').count(),1,'reaction pop');
 // dc t536u: press-and-slide (down on 1st, slide to 4th: it lifts + magnifies, neighbours lean, release sends it once; touchmove cancelled = no scroll)
 assert.equal(await p.locator('.fm-root .fm-onair').count(),0,'no pulsing dot by the cover');
 await p.waitForTimeout(800);{const n0=srv.r.sent.filter(x=>x.t==='fmr').length,G=await rxGesture(p,0,3,-6);await p.waitForTimeout(400);const fr=srv.r.sent.filter(x=>x.t==='fmr');
  assert(G.ta==='none'&&G.hov0&&G.hov[3]==='H'&&G.hov[2]==='n'&&G.hov[4]==='n'&&G.hov.split('H').length===2&&G.sliding&&G.scale>1.5&&G.lift<-10&&G.tmPrevented&&G.rx==='sent:'+G.e&&G.fly===1&&G.ring>=1&&G.after===0&&G.body2===G.body,'slide-to-send '+JSON.stringify(G));
  assert(fr.length===n0+1&&fr.at(-1).e===G.e,'slid emoji sent exactly once '+(fr.length-n0));await shot(p,'owner-dark-react-slide');
  await p.waitForTimeout(800);const C=await rxGesture(p,1,2,-170);await p.waitForTimeout(300);assert(C.rx==='cancel'&&C.hov.indexOf('H')<0&&C.fly===0,'release outside cancels '+JSON.stringify(C));assert.equal(srv.r.sent.filter(x=>x.t==='fmr').length,n0+1,'cancel sent nothing');}
 assert.equal(await p.locator('.fm-root .fm-note, .fm-root .fm-note-in, .fm-root [data-a="note"]').count(),0,'DJ note removed');
 {const tb=await p.evaluate(()=>[...document.querySelectorAll('.fm-root .fm-tp .fm-tpb')].map(b=>{const c=getComputedStyle(b);return c.backgroundColor+'|'+c.borderRadius+'|'+Math.round(b.querySelector('svg').getBoundingClientRect().width);}));assert(tb.length===3&&tb.every(x=>/rgba\(0, 0, 0, 0\)|transparent/.test(x.split('|')[0])),'transport glyphs without circles '+tb);}assert(srv.r.sent.some(x=>x.t==='fmr'));
 // queue: drag reorder, play next, edit sheet, cover, ID3 upload
 await p.locator('.fm-root [data-tab="queue"]').tap();await p.waitForTimeout(400);
 const hd=await p.locator('.fm-q li').nth(3).locator('.fm-drag').boundingBox(),row0=await p.locator('.fm-q li').nth(0).boundingBox();
 await p.mouse.move(hd.x+hd.width/2,hd.y+hd.height/2);await p.mouse.down();for(let k=1;k<=8;k++)await p.mouse.move(hd.x+hd.width/2,hd.y+hd.height/2-(hd.y-row0.y)*k/8-4);await p.mouse.up();await p.waitForTimeout(600);
 st=await srv.r.fmGet();assert.equal(st.list[0].id,D,'drag to top');assert.equal(await p.locator('.fm-q li').first().getAttribute('data-id'),D);
 await p.locator(`.fm-q li[data-id="${C}"] [data-a="playnext"]`).tap();await p.waitForTimeout(400);assert.equal((await srv.r.fmGet()).q[0],C);assert.equal(await p.locator(`.fm-q li[data-id="${C}"] .is-queued`).count(),1);assert.equal(await p.locator(".fm-chip-q").count(),0);
 await p.locator(`.fm-q li[data-id="${B}"] [data-a="edit"]`).tap();await p.waitForSelector('.fm-edit');await p.waitForTimeout(400);
 assert.equal(await p.inputValue('.fm-edit [name="title"]'),'Pink + White');assert.equal(await p.inputValue('.fm-edit [name="album"]'),'Blonde');
 await p.fill('.fm-edit [name="title"]','Pink + White (Live)');await p.fill('.fm-edit [name="genre"]','Soul');await p.fill('.fm-edit [name="notes"]','Recorded at the Blonded session.');await p.locator('.fm-edit .fm-sw').tap();
 await pick(p,srv,'.fm-edit [data-a="cover"]',{name:'cover.png',mimeType:'image/png',buffer:COVER2});await p.waitForFunction(id=>{const t=MPFM.state().list.find(x=>x.id===id);return t&&t.art;},B,{timeout:8000});
 await p.waitForSelector('.fm-edit img');await p.waitForTimeout(300);edOk(await edLayout(p),'dark');await p.focus('.fm-edit [name="artist"]');assert.equal(await p.evaluate(()=>visualViewport.scale),1,'no zoom on focus');await p.evaluate(()=>document.activeElement.blur());await shot(p,'owner-dark-edit');await p.evaluate(()=>{const b=document.querySelector('.fm-ed-body');b.scrollTop=b.scrollHeight;});await p.waitForTimeout(150);await p.screenshot({path:OUT+'/owner-dark-edit-bottom.png'});
 await p.locator('.fm-edit [data-a="edsave"]').tap();await p.waitForTimeout(500);eOk(await eGap(p),'owner queue');
 let tb=(await srv.r.fmGet()).list.find(t=>t.id===B);assert.deepEqual([tb.title,tb.genre,tb.notes,tb.explicit,!!tb.art],['Pink + White (Live)','Soul','Recorded at the Blonded session.',true,true]);
 assert.equal(await p.locator(`.fm-q li[data-id="${B}"] .fm-e`).count(),1,'E badge in queue');
 await p.locator(`.fm-q li[data-id="${B}"] [data-a="edit"]`).tap();await p.waitForSelector('.fm-edit [data-a="coverdel"]');await p.locator('.fm-edit [data-a="coverdel"]').tap();await p.waitForTimeout(500);assert.equal((await srv.r.fmGet()).list.find(t=>t.id===B).art,'');
 await p.locator('.fm-edit [data-a="edclose"]').tap();await p.waitForTimeout(300);
 await pick(p,srv,'.fm-root [data-a="add"]',{name:'track01.mp3',mimeType:'audio/mpeg',buffer:id3()});
 await p.waitForFunction(()=>/Added/.test((document.querySelector('.fm-ups li small')||{}).textContent||''),null,{timeout:15000});
 const nt=(await srv.r.fmGet()).list.at(-1);assert.deepEqual([nt.title,nt.artist,nt.album,nt.year,nt.genre,nt.explicit,nt.dur,!!nt.art],['Mask Off','Future','FUTURE','2017','Trap',true,204,true],'ID3 tags '+JSON.stringify(nt));
 // dc's iOS repro: real MP3 from Files with an EMPTY MIME type, no length tag, and an <audio> element that never loads metadata
 await p.evaluate(()=>{window.__A=window.Audio;window.Audio=function(){return {set src(v){},preload:''};};});
 const n0=(await srv.r.fmGet()).list.length;
 await pick(p,srv,'.fm-root [data-a="add"]',{name:'Real Artist - Real Song.mp3',mimeType:'',buffer:FX('fm-real.mp3')});
 await p.waitForFunction(n=>MPFM.state().list.length>=n,n0+1,{timeout:25000});await p.locator('.fm-ups').waitFor({state:'detached'});
 let L=(await srv.r.fmGet()).list;assert.equal(L.length,n0+1,'mp3 with empty type added');let rt=L.at(-1);
 assert.deepEqual([rt.title,rt.artist,rt.type],['Real Song','Real Artist','audio/mpeg'],'empty-type mp3 '+JSON.stringify(rt));assert(Math.abs(rt.dur-4)<0.6,'decode fallback duration '+rt.dur);
 assert.equal(srv.objs.get('t/'+rt.id).ct,'audio/mpeg');assert(srv.objs.get('t/'+rt.id).b.length===FX('fm-real.mp3').length,'exact bytes stored');
 await p.waitForFunction(id=>MPFM.state().list.some(t=>t.id===id)&&!!document.querySelector(`.fm-q li[data-id="${id}"]`),rt.id,{timeout:8000});
 await p.evaluate(()=>{window.Audio=window.__A;});
 // M4A as iOS reports it (audio/x-m4a) and an odd MP3 type (audio/mpeg3): both normalised for the Worker
 await pick(p,srv,'.fm-root [data-a="add"]',[{name:'memo.m4a',mimeType:'audio/x-m4a',buffer:FX('fm-real.m4a')},{name:'odd.mp3',mimeType:'audio/mpeg3',buffer:FX('fm-real.mp3')}]);
 await p.waitForFunction(n=>MPFM.state().list.length>=n,n0+3,{timeout:20000});await p.locator('.fm-ups').waitFor({state:'detached'});
 L=(await srv.r.fmGet()).list;assert.deepEqual(L.slice(-2).map(t=>t.type).sort(),['audio/mp4','audio/mpeg'],'normalised types');
 // a WAV is refused with a visible reason, and a lost owner session says so
 await p.evaluate(()=>{const t=document.querySelector('.fm-toast');t&&t.classList.remove('is-on');});await pick(p,srv,'.fm-root [data-a="add"]',{name:'voice.wav',mimeType:'',buffer:FX('fm-real.wav')});await toastIs(p,/MP3, M4A or AAC only/);
 await p.evaluate(()=>localStorage.setItem('chat_token','fan-tok'));
 await pick(p,srv,'.fm-root [data-a="add"]',{name:'again.mp3',mimeType:'',buffer:FX('fm-real.mp3')});await toastIs(p,/Not signed in as the station owner/);
 await p.evaluate(()=>localStorage.setItem('chat_token','owner-tok'));
 assert.equal((await srv.r.fmGet()).list.length,n0+3,'no track from refused uploads');
 await shot(p,'owner-dark-upload-ios');
 await p.locator('.fm-root .fm-sh-body').evaluate(b=>b.scrollTop=0);
 await shot(p,'owner-dark-queue');
 // station: note, schedule, crossfade, stats
 await p.locator('.fm-root [data-tab="station"]').tap();await p.waitForTimeout(300);
 assert.equal(await p.locator('.fm-root .fm-note-in').count(),0,'no DJ note control');
 // crossfade stepper: Off at 0 (minus disabled), +1 s steps, saved to the same setting
 assert.equal(await p.locator('.fm-root .fm-xf-v').innerText(),'Off');assert(await p.locator('.fm-root [data-a="xfm"]').isDisabled());
 for(let k=0;k<3;k++){await p.locator('.fm-root [data-a="xfp"]').tap();await p.waitForTimeout(250);}await p.waitForTimeout(300);assert.equal((await srv.r.fmGet()).xf,3);assert.equal(await p.locator('.fm-root .fm-xf-v').innerText(),'3s');
 for(let k=0;k<3;k++){await p.locator('.fm-root [data-a="xfp"]').tap();await p.waitForTimeout(250);}assert(await p.locator('.fm-root [data-a="xfp"]').isDisabled(),'plus disabled at max');assert.equal((await srv.r.fmGet()).xf,6);
 await p.locator('.fm-root [data-a="xfm"]').tap();await p.waitForTimeout(350);assert.equal((await srv.r.fmGet()).xf,5);
 const later=new Date(Date.now()+3*3600e3),pad=n=>String(n).padStart(2,'0');await p.fill('.fm-sched-in',`${later.getFullYear()}-${pad(later.getMonth()+1)}-${pad(later.getDate())}T${pad(later.getHours())}:${pad(later.getMinutes())}`);
 await p.locator('.fm-root [data-a="sched"]').tap();await p.waitForTimeout(400);assert(Math.abs((await srv.r.fmGet()).sched-later.getTime())<61e3,'schedule');
 assert.match(await p.locator('.fm-stats').innerText(),/Listening[\s\S]*1[\s\S]*Played/);await shot(p,'owner-dark-station');
 // stop (no confirm, t536u) → every live bar off immediately
 await p.locator('.fm-root [data-a="stop"]').last().tap();await p.waitForTimeout(500);assert.equal(await p.locator('.fm-cf').count(),0,'no confirm on stop');
 assert.equal((await srv.r.fmGet()).live,false);assert.equal(await p.locator('.fm-on').count(),0,'top bar still live');assert.equal(await p.locator('.fm-hb').count(),0);
 assert.equal(await p.evaluate(()=>[...document.querySelectorAll('.fm-audio')].every(a=>a.paused)),true);
 await p.locator('.fm-root [data-tab="now"]').tap();await p.waitForSelector('.fm-root .fm-off');await p.waitForTimeout(400);{const o=await offState(p);assert(o&&o.logo&&/off air|scheduled/i.test(o.st)&&/ready to play|back on air/i.test(o.line)&&o.go&&o.goIcon&&o.add&&!o.hist&&vizOk(o.viz),'owner off-air '+JSON.stringify(o));}await shot(p,'owner-dark-offair');
 // go live again from the off-air card's icon button: immediate, no confirm (t536u)
 await p.locator('.fm-root .fm-off [data-a="golive"]').tap();await p.waitForTimeout(500);assert.equal(await p.locator('.fm-cf').count(),0,'no confirm on go live');assert((await srv.r.fmGet()).live);
 await p.locator('.fm-root [data-tab="station"]').tap();await p.waitForTimeout(300);await p.locator('.fm-root [data-a="stop"]').last().tap();await p.waitForTimeout(500);assert.equal((await srv.r.fmGet()).live,false);
 {const g=await p.evaluate(()=>{const b=document.querySelector('.fm-root .fm-pill-go');return b&&b.getAttribute('aria-label')+'|'+b.textContent.trim()+'|'+!!b.querySelector('svg')});assert.equal(g,'Go live||true','Station Go live is an icon');}
 await p.locator('.fm-root .fm-pill-go').tap();await p.waitForTimeout(500);assert.equal(await p.locator('.fm-cf').count(),0);assert((await srv.r.fmGet()).live,'station go live');
 assert.deepEqual(errors,[]);console.log(JSON.stringify({role:'owner',theme:'dark',passed:'top bar live on shop/globe/chat/product/cart, morph+back, listen seek, pause/resume sync, seek sync, skip/prev/restart/shuffle/repeat, reaction, drag reorder, play next, edit sheet+cover+remove cover, ID3 upload (tags+art+dur), note/crossfade/schedule/stats, stop clears bars, go live'}));await c.close();}
// ---------- owner, light ----------
{const {c,p,srv,errors}=await ctx(browser,{role:'owner',theme:'light'});await seed(srv);
 await p.goto(ORIGIN+'/#shop');await p.waitForSelector('.nav.fm-on');await p.waitForTimeout(1200);await shot(p,'owner-light-shop-collapsed',{x:0,y:0,width:390,height:200});
 ringOk(await hbState(p),'light shop');await p.waitForSelector('.nav.fm-on.is-fm',{timeout:6000});await shot(p,'owner-light-shop-islive',{x:0,y:0,width:390,height:200});{const hl=await hbState(p);ringOk(hl,'light islive');assert(hl.stroke.base<=1.5,'light is-live baseline '+JSON.stringify(hl.stroke));}
 await npOpen(p,'.nav',()=>p.locator('.nav').tap({position:{x:60,y:20}}));await p.waitForTimeout(1500);await shot(p,'owner-light-morphed',{x:0,y:0,width:390,height:200});
 await p.locator('.nav .fm-m-t').tap();await p.waitForTimeout(600);assert.equal(await p.locator('.is-np').count(),0);
 await openFM(p);await p.waitForSelector('.fm-root .fm-tabs');await shot(p,'owner-light-now');
 await p.locator('.fm-root [data-tab="queue"]').tap();await p.waitForTimeout(400);await shot(p,'owner-light-queue');await p.locator('.fm-q li [data-a="edit"]').first().tap();await p.waitForSelector('.fm-edit');await p.waitForTimeout(450);edOk(await edLayout(p),'light');await p.evaluate(()=>document.activeElement&&document.activeElement.blur());await shot(p,'owner-light-edit');await p.locator('.fm-edit [data-a="edclose"]').tap();await p.waitForTimeout(350);assert(!(await p.$('.fm-edit')),'edit closes');
 await p.locator('.fm-root [data-tab="station"]').tap();await p.waitForTimeout(400);await shot(p,'owner-light-station');
 // Back returns to the + chat menu (same element, menu rows again)
 await p.locator('.fm-root [data-a="back"]').tap();await p.waitForSelector('#journal .chat-plus-menu.is-in .chat-misery-fm',{timeout:3000});assert.equal(await p.locator('.fm-root').count(),0);
 assert.deepEqual(errors,[]);console.log(JSON.stringify({role:'owner',theme:'light',passed:'shop live bar, logo phase, morph, tap returns, + menu morph into FM, now/queue/station, Back to + menu'}));await c.close();}
// ---------- listeners ----------
for(const theme of ['dark','light']){const {c,p,srv,errors}=await ctx(browser,{role:'listener',theme}),S=await seed(srv);
 await p.goto(ORIGIN+'/#journal');await p.waitForSelector('#journal .chat-head.fm-on',{timeout:15000});await p.waitForTimeout(500);
 const hs=await hbState(p);ringOk(hs,'chat');assert(/chat-head/.test(hs.cls));
 assert.equal(await p.locator('#chat .fm-bar').count(),0,'separate now playing pill must be gone');

 await shot(p,`listener-${theme}-chat-collapsed`,{x:0,y:0,width:390,height:260});
 // morph from the chat header → Listen inside → back
 await npOpen(p,'#journal .chat-head',()=>p.locator('#journal .chat-head .chat-title').tap());await shot(p,`listener-${theme}-morphed`,{x:0,y:0,width:390,height:260});
 await p.locator('#journal .chat-head [data-a="listen"]').tap();await p.waitForFunction(()=>[...document.querySelectorAll('.fm-audio')].some(a=>!a.paused&&a.currentTime>30),null,{timeout:8000});
 {const b0=await box(p,'#journal .chat-head');await p.locator('#journal .chat-head [data-a="collapse"]').tap();await p.waitForTimeout(600);assert.equal(await box(p,'#journal .chat-head'),b0);}await p.waitForTimeout(500);await shot(p,`listener-${theme}-back`,{x:0,y:0,width:390,height:260});
 // sheet: listener view, no owner controls
 await openFM(p);await p.waitForTimeout(400);
 const v=await p.evaluate(()=>{const s=document.querySelector('.fm-root');return{tabs:!!s.querySelector('.fm-tabs'),owner:s.querySelectorAll('[data-a="pause"],[data-a="skip"],.fm-scrub,[data-a="edit"],.fm-file').length,up:s.querySelectorAll('.fm-list:not(.fm-hist) li').length,hist:s.querySelectorAll('.fm-hist li').length+(/Recently played/i.test(s.innerText)?1:0),note:(s.querySelector('.fm-note')||{}).textContent,img:!!s.querySelector('.fm-cover img'),viz:s.querySelector('.fm-viz').getAttribute('data-src'),lc:s.querySelector('.fm-lc').textContent};});
 assert(!v.tabs&&v.owner===0&&v.up===3&&v.hist===0&&v.img&&!v.note&&/1 listening/.test(v.lc),'listener sheet '+JSON.stringify(v));assert.match(v.viz,/map/,'iOS visualizer should follow the loudness map');
 // owner pauses from another device → this listener pauses; seek → this listener jumps
 await S.ctl({action:'pause'});await p.waitForTimeout(600);assert(await p.evaluate(()=>[...document.querySelectorAll('.fm-audio')].every(a=>a.paused)),'listener did not pause');
 assert.equal(await p.locator('.fm-root .fm-paused').count(),1);await S.ctl({action:'resume'});await S.ctl({action:'seek',pos:120});await p.waitForTimeout(1500);
 const t2=await p.evaluate(()=>{const a=[...document.querySelectorAll('.fm-audio')].find(x=>!x.paused);return a&&a.currentTime;});assert(t2&&Math.abs(t2-121)<2.5,'listener seek sync '+t2);
 // owner edits the song → listeners see it live (title + E badge in sheet, bar)
 await S.ctl({action:'edit',id:S.ids[0],title:'Blinding Lights (Remix)',explicit:true});await p.waitForTimeout(500);
 assert.equal(await p.locator('.fm-root .fm-ttl b').innerText(),'Blinding Lights (Remix)');assert.equal(await p.locator('.fm-root .fm-ttl .fm-e').count(),1);
 await p.locator('.fm-root [data-a="react"]').nth(1).tap();await p.waitForTimeout(250);await shot(p,`listener-${theme}-sheet`);eOk(await eGap(p),'listener '+theme);await p.evaluate(()=>{const b=document.querySelector('.fm-root .fm-ttl b');b.textContent='A very long remix title that keeps going and going (Extended Version)';});{const g=await eGap(p);assert(g.some(x=>x.clip)&&g.every(x=>x.gap>=3&&x.gap<=7&&x.inside),'long title must ellipsize before the E '+JSON.stringify(g));}
 // off air: other pages turn off immediately
 await p.locator('.fm-root [data-a="close"]').tap();await p.waitForTimeout(500);await openPanel(p,'shop');assert(await hbState(p));
 await S.ctl({action:'stop'});await p.waitForTimeout(400);assert.equal(await p.locator('.fm-on').count(),0,'shop still live after stop');
 for(const pg of ['forum','journal','cart']){await openPanel(p,pg);assert.equal(await p.locator('.fm-on').count(),0,pg+' live while off');}
 await openFM(p);await p.waitForSelector('.fm-root .fm-off');await p.waitForTimeout(400);{const o=await offState(p);assert(o&&o.logo&&/off air/i.test(o.st)&&/check back/i.test(o.line)&&!o.go&&!o.add&&!o.hist&&vizOk(o.viz),'listener off-air '+JSON.stringify(o));}if(!process.env.MP_FM_NOSHOT||1)await shot(p,`listener-${theme}-offair`);
 assert.deepEqual(errors,[]);console.log(JSON.stringify({role:'listener',theme,passed:'no separate pill, even dotted ring, in-bar morph+listen+back (box locked), sheet (no owner controls, up next, no history, no DJ note, cover, map visualizer), pause/seek sync from owner, live edit + E badge, reaction, stop clears every page, off-air card, E badge inline'}));await c.close();}
// ---------- reduced motion ----------
{const {c,p,srv,errors}=await ctx(browser,{role:'listener',theme:'dark',reduced:true});await seed(srv);
 await p.goto(ORIGIN+'/#forum');await p.waitForSelector('.fm-on');await p.waitForTimeout(5000);
 const h=await hbState(p);assert(h&&!/is-fm/.test(h.cls)&&h.anims===0,'reduced motion must stay static '+JSON.stringify(h));ringOk(h,'reduced');
 await shot(p,'reduced-globe',{x:0,y:0,width:390,height:200});
 await npOpen(p,'#forum .chat-head',()=>p.locator('#forum .chat-head .chat-title').tap());const an=await p.evaluate(()=>{const n=document.querySelector('.fm-on .fm-hb-np');return{tp:getComputedStyle(n).transitionProperty,tf:getComputedStyle(n).transform};});
 assert(an.tp==='opacity'&&an.tf==='none','reduced motion morph should only crossfade '+JSON.stringify(an));
 await p.locator('.fm-on .fm-m-t').tap();await p.waitForTimeout(300);await openFM(p);await p.locator('.fm-root [data-a="react"]').first().tap();
 assert.equal(await p.evaluate(()=>getComputedStyle(document.querySelector('.fm-float')).animationName),'fmFade');
 assert.deepEqual(errors,[]);console.log(JSON.stringify({role:'listener',theme:'dark',reduced:true,passed:'static ring + dot, no crossfade cycling, morph = opacity only, reactions fade'}));await c.close();}
await browser.close();fs.writeFileSync(OUT+'/shots.json',JSON.stringify(shots,null,1));})().catch(e=>{console.error(e);process.exit(1)});
