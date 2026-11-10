// Expanded profile card (Codex #60 + Grim t529u fixes): WebKit iPhone 14, real touch, dark + light.
// Chat avatars at the top/middle/bottom and the right edge, the Globe author pill, own profile, a VIP/badged user, a long
// name with no avatar/bio, open/expand/collapse/close animation geometry, inner scroll, dismiss, the header and the editor.
// Local assets, mocked APIs/WebSockets, service worker blocked. MP_PLAYWRIGHT=<playwright[-core]> node tools/test-profile-expanded.cjs
const pw=require(process.env.MP_PLAYWRIGHT||'playwright'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const ROOT=path.resolve(__dirname,'..'),ORIGIN='https://misereperdue.com',OUT=process.env.MP_TEST_ARTIFACTS||'/tmp/mp-profile-expanded';fs.mkdirSync(OUT,{recursive:true});
const T={'.html':'text/html','.css':'text/css','.js':'application/javascript','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.webp':'image/webp','.json':'application/json','.mp4':'video/mp4'};
const LONG='averyveryverylongusernamethatgoeson';
const me={username:'tester',numId:3,points:4,hasRecovery:true,hasPassword:true,member:true,bio:'My bio',city:'Oslo',profilePhotos:['photo01'],listening:null,createdAt:Date.now()-5e9};
const U={other:{username:'Other',numId:4,points:1234,member:true,bio:'A longer bio. '.repeat(10),createdAt:Date.now()-9e9,city:'Montréal',profilePhotos:['photo01','photo02','photo03'],listening:{title:'Pink + White',artist:'Frank Ocean',url:'https://music.apple.com/us/album/x',art:'https://is1-ssl.mzstatic.com/a.jpg'},badges:['member','100'],activeBadge:'member',hasAvatarImg:true,avatarV:1},
 [LONG]:{username:LONG,numId:77,points:0,verified:true,createdAt:Date.now()-2e9},tester:me};
const msgs=Array.from({length:30},(_,i)=>({id:'m'+i,user:i%3===0?'tester':(i%3===1?'other':LONG),text:'message '+i,ts:Date.now()-(30-i)*6e4}));
const th={id:'t1',title:'Hello',pinned:false,content:'<p>x</p>',author:'other',createdAt:Date.now()-9e4,lastActivity:Date.now()-3e3,category:'general',tags:[],excerpt:'x',replies:[]};
(async()=>{const browser=await pw.webkit.launch();
for(const theme of ['dark','light']){
 const c=await browser.newContext({...pw.devices['iPhone 14'],colorScheme:theme,serviceWorkers:'block'});const errors=[];
 await c.addInitScript(()=>{localStorage.setItem('chat_token','test-only');sessionStorage.setItem('rc_later','1');});
 await c.routeWebSocket(/api\.misereperdue\.com/,s=>{setTimeout(()=>s.send(JSON.stringify({t:'hello',you:me,messages:msgs,online:3,caps:{}})),40);});
 await c.route('**/*',async r=>{const u=new URL(r.request().url());if(u.origin===ORIGIN){const f=path.join(ROOT,u.pathname==='/'?'index.html':decodeURIComponent(u.pathname));if(fs.existsSync(f)&&fs.statSync(f).isFile())return r.fulfill({path:f,contentType:T[path.extname(f)]||'application/octet-stream'});return r.fulfill({status:404,body:''});}
  if(/^\/api\/(avatarimg|media)\//.test(u.pathname)||u.hostname.endsWith('mzstatic.com'))return r.fulfill({path:ROOT+'/img/icon-192.png',contentType:'image/png'});let d={ok:true,messages:[],count:0};
  if(u.pathname==='/api/me')d={ok:true,user:me};else if(u.pathname.startsWith('/api/user/')){const n=decodeURIComponent(u.pathname.slice(10)).toLowerCase();d={ok:true,user:U[n]||U.other};}else if(u.pathname==='/api/ws-ticket')d={ticket:'t'};else if(u.pathname==='/api/messages')d={ok:true,messages:msgs,badges:{}};
  else if(u.pathname==='/api/forum/categories')d={ok:true,categories:[{id:'general',name:'General'}]};else if(u.pathname==='/api/forum/threads')d={ok:true,threads:[th,{...th,id:'t2',title:'Two'}]};else if(u.pathname.startsWith('/api/forum/thread/'))d={ok:true,thread:th,replies:[]};
  return r.fulfill({json:d,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*'}});});
 const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));
 await p.goto(ORIGIN+'/#journal');await p.locator('#chat .chat-avatar-click').first().waitFor({timeout:15000});await p.waitForTimeout(1200);
 const st=()=>p.evaluate(()=>{const b=document.querySelector('.mp-pb:not(.is-out)');if(!b)return null;const q=b.getBoundingClientRect(),body=b.querySelector('.mp-pb-body'),ax=parseFloat(b.style.getPropertyValue('--ax')),below=b.classList.contains('is-below'),a=b._a.getBoundingClientRect();
  const hdr=Math.max(0,...[...document.querySelectorAll('.panel.on .chat-head,.nav')].map(h=>h.getBoundingClientRect()).filter(r=>r.height&&r.bottom<innerHeight/2).map(r=>r.bottom));
  const shE=b.querySelector('.mp-pb-shape'),sh=shE.getBoundingClientRect(),sg=b.querySelector('.mp-pb-stemg'),sgr=sg.getBoundingClientRect(),scs=getComputedStyle(shE),mw=sh.width,mh=sh.height+13,stemX=sgr.left+14-q.left,unmasked=(scs.webkitMaskImage||'none')==='none'&&/blur/.test(scs.webkitBackdropFilter||scs.backdropFilter),stemOk=/svg/.test(getComputedStyle(sg).webkitMaskImage)&&/blur/.test(getComputedStyle(sg).webkitBackdropFilter||'');
  const nm=b.querySelector('.mp-pb-name-t'),inp=[...document.querySelectorAll('.mp-profile-editor input')].map(i=>parseFloat(getComputedStyle(i).fontSize));
  return{exp:b.classList.contains('is-expanded'),l:q.left,t:q.top,r:q.right,b:q.bottom,w:q.width,h:q.height,vw:innerWidth,vh:innerHeight,below,ax,tipX:q.left+ax,tipY:below?q.top-13:q.bottom+13,a:{l:a.left,t:a.top,r:a.right,b:a.bottom},tap:b._tap,hdr,
   sh:{w:sh.width,h:sh.height},mw,mh,stemX,unmasked,stemOk,sw:body.scrollWidth-body.clientWidth,scroll:body.scrollHeight-body.clientHeight,name:nm&&{t:nm.textContent,clip:nm.scrollWidth>nm.clientWidth,ov:getComputedStyle(nm).textOverflow,r:nm.getBoundingClientRect().right},full:(b.querySelector('.mp-pb-full span')||{}).textContent,inp};});
 const tapBox=async bb=>p.touchscreen.tap(bb.x+bb.width/2,bb.y+bb.height/2);
 const attached=(s,tag)=>{const M=10;assert(s.l>=M-.5&&s.r<=s.vw-M+.5&&s.t>=M-.5&&s.b<=s.vh-M+.5,tag+': outside the viewport '+JSON.stringify(s));
  assert(s.tipX>=s.l+20&&s.tipX<=s.r-20,tag+': stem off the card');
  const ty=s.tap?s.tap.y:(s.a.t+s.a.b)/2,edge=s.below?Math.min(s.a.b,ty+28)+4:Math.max(s.a.t,ty-28)-4;assert(Math.abs(s.tipY-edge)<=1.5,tag+`: stem tip ${s.tipY} detached from the anchor (${edge})`);
  assert(s.below?s.t>=s.a.b-30:s.b<=s.a.t+30,tag+': card covers its anchor');
  assert(Math.abs(s.mw-s.w)<1.5&&Math.abs(s.mh-(s.h+13))<1.5,tag+': glass does not match the card '+[s.mw,s.mh,s.w,s.h]);assert(s.unmasked&&s.stemOk&&Math.abs(s.stemX-s.ax)<1,tag+': glass must be an unmasked blurred rect + stem glass at the tip '+JSON.stringify([s.unmasked,s.stemOk,s.stemX,s.ax]));};
 const reveal=()=>p.evaluate(()=>{const b=document.querySelector('.mp-pb:not(.is-out) .mp-pb-body'),f=b.querySelector('.mp-pb-full');if(f.offsetTop<b.scrollTop)b.scrollTop=f.offsetTop-8;else if(f.offsetTop+f.offsetHeight>b.scrollTop+b.clientHeight)b.scrollTop=f.offsetTop+f.offsetHeight-b.clientHeight+8;});
 const expand=async tag=>{await reveal();await p.waitForTimeout(150);const bb=await p.locator('.mp-pb:not(.is-out) .mp-pb-full').boundingBox();await tapBox(bb);
  // mid-animation: glass/stem follow the animated box every frame
  const frames=await p.evaluate(()=>new Promise(res=>{const out=[];let n=0;const f=()=>{const b=document.querySelector('.mp-pb:not(.is-out)');if(b){const q=b.getBoundingClientRect(),ax=parseFloat(b.style.getPropertyValue('--ax')),sE=b.querySelector('.mp-pb-shape'),sh=sE.getBoundingClientRect(),cs=getComputedStyle(sE),sg=b.querySelector('.mp-pb-stemg');out.push({w:q.width,h:q.height,ax,shw:sh.width,shh:sh.height+13,mask:(cs.webkitMaskImage||'none'),bf:cs.webkitBackdropFilter||cs.backdropFilter,sm:sg.style.webkitMaskImage.length,sx:sg.getBoundingClientRect().left+14-q.left});}if(++n<14)requestAnimationFrame(f);else res(out);};requestAnimationFrame(f);}));
  assert(new Set(frames.map(f=>f.sm)).size===1,tag+': stem mask changed during the morph');frames.forEach((f,i)=>{assert(f.mask==='none'&&/blur/.test(f.bf),tag+' frame '+i+': backdrop glass re-masked or lost blur '+JSON.stringify(f));assert(Math.abs(f.sx-f.ax)<1.5,tag+' frame '+i+': stem glass not at the tip');assert(f.ax>=20&&f.ax<=f.w-20,tag+' frame '+i+': stem outside the card '+JSON.stringify(f));assert(Math.abs(f.shw-f.w)<1.5&&Math.abs(f.shh-(f.h+13))<1.5,tag+' frame '+i+': glass not following the box '+JSON.stringify(f));});
  await p.waitForTimeout(450);const s=await st();assert(s,tag+': closed when tapping Full profile');assert(s.exp&&s.full==='Show less',tag+': not expanded');return s;};
 const shot=async n=>p.screenshot({path:`${OUT}/${theme}-${n}.png`});
 const avs=await p.evaluate(()=>[...document.querySelectorAll('#chat .chat-avatar-click')].map((e,i)=>{const r=e.getBoundingClientRect();return{i,u:(e.getAttribute('aria-label')||'').replace(/View |'s profile/g,'').toLowerCase(),y:r.top};}).filter(a=>a.y>150&&a.y<innerHeight-120));
 const pick=(u,w)=>{const l=avs.filter(a=>a.u===u);return w==='top'?l[0]:l[l.length-1];};
 const dismissed=[];const cases=[['other','bottom'],['other','top'],[LONG,'bottom'],['tester','bottom']];
 for(const[u,where]of cases){const a=pick(u,where);assert(a,'no avatar '+u);const tag=`${theme} ${u.slice(0,6)} ${where}`;
  const chatTop=await p.evaluate(()=>document.querySelector('#chat .chat-msgs,#chat .chat-list,#chat [class*=scroll]')?.scrollTop);
  const bb=await (await p.$$('#chat .chat-avatar-click'))[a.i].boundingBox();await tapBox(bb);await p.waitForTimeout(800);let s=await st();assert(s,tag+': did not open');
  assert.equal(s.name.t,u.toLowerCase(),tag+': username lowercase');if(u===LONG)assert(s.name.clip&&s.name.ov==='ellipsis'&&s.name.r<=s.r-10,tag+': long name must ellipsize inside the card');
  attached(s,tag+' compact');const compact=s;s=await expand(tag);attached(s,tag+' expanded');assert(s.h>=compact.h-1,tag+': expanded card smaller than compact '+[s.h,compact.h]+JSON.stringify({c:compact,s}));
  assert(s.t>=s.hdr+7.5||s.h>=s.vh*.5,tag+': expanded card covers the top bars '+s.t+' < '+s.hdr);
  assert(s.sw<=1,tag+': sideways overflow '+s.sw);
  if(u==='other'){const L=await p.evaluate(()=>{const b=document.querySelector('.mp-pb:not(.is-out)'),R=e=>e.getBoundingClientRect();const ph=[...b.querySelectorAll('.mp-profile-photo')].map(e=>({w:R(e).width,h:R(e).height}));const d=b.querySelector('.mp-profile-deck'),dc=getComputedStyle(d);const city=b.querySelector('.mp-profile-city'),cc=getComputedStyle(city);return{ph,snap:dc.scrollSnapType,ox:dc.overflowX,h3:[...b.querySelectorAll('.mp-profile-section h3')].map(h=>h.textContent),cityBg:cc.backgroundColor,cityPad:cc.paddingTop,tools:[...b.querySelectorAll('.mp-pb-hd .mp-pb-tool')].map(t=>t.getAttribute('aria-label')+':'+Math.round(R(t).width)),bigShare:[...b.querySelectorAll('.mp-pb-act')].some(a=>/share|edit/i.test(a.textContent))};});
   assert(L.ph.length===3&&L.ph.every(x=>Math.abs(x.w-x.h)<1&&x.w<=120),'photos square + small '+JSON.stringify(L.ph));assert(/x/.test(L.snap)&&/mandatory/.test(L.snap)&&L.ox==='auto','photos use native scroll-snap '+L.snap);
   assert(!L.h3.some(h=>/pinned/i.test(h))&&L.h3.includes('Listening')&&!L.h3.some(h=>/currently|city/i.test(h)),'section titles '+L.h3);assert(L.cityBg==='rgba(0, 0, 0, 0)'&&L.cityPad==='0px','city is plain text');
   assert(L.tools.length===1&&/Share profile:30/.test(L.tools[0])&&!L.bigShare,'header pills '+L.tools);
   assert(s.scroll>40,tag+': long profile should scroll inside the card');await shot(`${u.slice(0,6)}-${where}-expanded`);
   await p.evaluate(()=>{const b=document.querySelector('.mp-pb:not(.is-out) .mp-pb-body');b.scrollTop=b.scrollHeight;});await p.waitForTimeout(500);assert(await st(),tag+': inner scroll closed the card');await p.evaluate(()=>{document.querySelector('.mp-pb:not(.is-out) .mp-pb-body').scrollTop=0;});await p.waitForTimeout(200);}
  // collapse back: re-attached, compact size again
  {await reveal();await p.waitForTimeout(150);await tapBox(await p.locator('.mp-pb:not(.is-out) .mp-pb-full').boundingBox());}await p.waitForTimeout(700);s=await st();assert(!s.exp&&s.full==='Full profile',tag+': not collapsed');attached(s,tag+' collapsed');
  assert(Math.abs(s.w-compact.w)<1&&Math.abs(s.h-compact.h)<2,tag+': collapsed size differs '+[s.w,s.h,compact.w,compact.h]);
  // re-expand and dismiss with a tap outside the card
  s=await expand(tag+' again');{const gB=s.vh-110-s.b,gA=s.t-(s.hdr+10);let how='escape';
  if(gB>24){await p.touchscreen.tap(s.vw/2,s.b+gB/2);how='tap';}else if(gA>24){await p.touchscreen.tap(s.vw/2,s.hdr+10+gA/2);how='tap';}else await p.keyboard.press('Escape');
  await p.waitForTimeout(600);dismissed.push(tag+':'+how);}
  assert.equal(await st(),null,tag+': did not dismiss');
 }
 // own profile → Edit profile details → editor inputs >= 16px (no iOS focus zoom)
 {const a=pick('tester','bottom');await tapBox(await (await p.$$('#chat .chat-avatar-click'))[a.i].boundingBox());await p.waitForTimeout(800);await expand('own');{const t=await p.evaluate(()=>[...document.querySelectorAll('.mp-pb:not(.is-out) .mp-pb-hd .mp-pb-tool')].map(b=>b.getAttribute('aria-label')));assert.deepEqual(t,['Edit profile','Share profile'],'own header pills');}await p.screenshot({path:`${OUT}/${theme}-own-expanded.png`});
  await p.locator('.mp-pb:not(.is-out) .mp-profile-details .mp-profile-button').first().tap();await p.locator('.mp-profile-editor').waitFor({timeout:5000});await p.waitForTimeout(500);
  const fs2=await p.evaluate(()=>[...document.querySelectorAll('.mp-profile-editor input:not([type=file])')].map(i=>parseFloat(getComputedStyle(i).fontSize)));assert(fs2.length>=2&&fs2.every(v=>v>=16),'editor inputs >=16px '+fs2);
  await p.locator('.mp-profile-editor input[type=text]').first().focus();assert.equal(await p.evaluate(()=>visualViewport.scale),1,'zoom on focus');
  }
 // Globe author pill
 await p.goto(ORIGIN+'/?fresh=1#globe');await p.locator('.forum-thread-row[data-id]').first().waitFor({timeout:15000});await p.waitForTimeout(600);await p.locator('.forum-thread-row[data-id]').first().tap();await p.waitForTimeout(1200);
 {const bb=await p.locator('.forum-author-pill-btn[data-username]').first().boundingBox();await tapBox(bb);await p.waitForTimeout(800);let s=await st();assert(s,'globe: did not open');s=await expand('globe');attached(s,theme+' globe expanded');await shot('globe-expanded');await p.keyboard.press('Escape');await p.waitForTimeout(500);assert.equal(await st(),null,'globe: Escape');}
 // edge anchors: top-left / top-right / bottom-right fixed targets
 for(const[k,x,y]of[['tl',4,150],['tr',338,150],['br',338,600],['bl',4,600]]){await p.evaluate(([k,x,y])=>{const e=document.createElement('button');e.id='pe-'+k;e.style.cssText=`position:fixed;left:${x}px;top:${y}px;width:48px;height:40px;z-index:50`;e.onclick=ev=>MPChat.openUserSheet('other',e);document.body.appendChild(e);},[k,x,y]);
  await p.locator('#pe-'+k).tap();await p.waitForTimeout(800);let s=await st();assert(s,k+' did not open');s=await expand(theme+' edge '+k);attached(s,theme+' edge '+k);await p.keyboard.press('Escape');await p.waitForTimeout(500);}
 assert.deepEqual(errors,[]);console.log(JSON.stringify({theme,dismissed,passed:'chat top/bottom/right-edge, own, VIP+badges, long name (ellipsis, lowercase), missing avatar/bio, expand/collapse geometry per frame, stem stays on the anchor, no header overlap, inner scroll, dismiss, editor 16px, Globe, 4 edge anchors'}));await c.close();}
await browser.close();})().catch(e=>{console.error(e);process.exit(1)});
