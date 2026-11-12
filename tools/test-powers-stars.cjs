// Powers & Stars: profile Powers/Stars buttons (Dashboard owner-only), Powers pill
// with +N overflow and tap-to-expand, Powers sheet buy (two taps) and equip,
// Stars sheet balance/log/Get stars -> shop. Stateful API mock; no network.
// Run: node tools/test-powers-stars.cjs   (Chromium; MP_CHROMIUM_PATH to override)
const pw=require(process.env.MP_PLAYWRIGHT||'playwright'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const ROOT=path.resolve(__dirname,'..'),ORIGIN='https://misereperdue.com',OUT=process.env.MP_TEST_ARTIFACTS||'/tmp/mp-powers-stars';fs.mkdirSync(OUT,{recursive:true});
const T={'.html':'text/html','.css':'text/css','.js':'application/javascript','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.webp':'image/webp','.json':'application/json','.mp4':'video/mp4','.woff2':'font/woff2'};
const CAT=[['glow','Glow',50],['ink','Ink',100],['bubble','Bubble',120]].map(([id,name,price])=>({id,name,price,icon:'*',desc:name+' power'}));
const COLORS=[['ice','#a9d7f5'],['pink','#ff7fb8'],['gold','#f5bf45']].map(([v,color])=>({v,label:v,color}));
CAT.find(c=>c.id==='ink').settings=[{key:'color',label:'Colour',type:'color',options:COLORS,def:'gold'},{key:'style',label:'Style',type:'choice',options:[{v:'solid',label:'Solid'},{v:'dotted',label:'Dotted'},{v:'spin',label:'Spin'}],def:'solid'}];
(async()=>{const browser=await pw.chromium.launch({executablePath:process.env.MP_CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
for(const[theme,owner,width]of[['dark',true,390],['light',false,360]]){
 const st={stars:180,owned:[],on:[],settings:{},log:[{t:'gift-in',n:1,from:'friend',at:Date.now()}]};
 const me={username:'tester',points:st.stars,hasRecovery:true,hasPassword:true,member:true,owner};
 const other={username:'rich',member:true,badges:['member','kitty'],activeBadge:'kitty',points:9,powers:['glow','ink','bubble','g4','g5','g6','g7'],powersOn:['ink']};
 const c=await browser.newContext({viewport:{width,height:844},deviceScaleFactor:2,colorScheme:theme,serviceWorkers:'block'});const errors=[];
 await c.addInitScript(()=>{localStorage.setItem('chat_token','test-only');sessionStorage.setItem('rc_later','1');});
 let ws=null;await c.routeWebSocket(/api\.misereperdue\.com/,s=>{ws=s;setTimeout(()=>s.send(JSON.stringify({t:'hello',you:me,messages:[{id:'r1',user:'rich',text:'hello from rich',ts:Date.now()-5000}],pw:{rich:{ink:'#ff7fb8',glow:'#a9d7f5',bubble:'#b18cff'}},online:1,caps:{}})),40);});
 await c.route('**/*',async r=>{const u=new URL(r.request().url());if(u.origin===ORIGIN){const f=path.join(ROOT,u.pathname==='/'?'index.html':decodeURIComponent(u.pathname));if(fs.existsSync(f)&&fs.statSync(f).isFile())return r.fulfill({path:f,contentType:T[path.extname(f)]||'application/octet-stream'});return r.fulfill({status:404,body:''});}
  if(u.pathname.startsWith('/api/avatarimg/'))return r.fulfill({path:ROOT+'/img/icon-192.png',contentType:'image/png'});
  let d={ok:true,messages:[],count:0};const body=r.request().postDataJSON&&r.request().method()==='POST'?r.request().postDataJSON():null;
  if(u.pathname==='/api/me')d={ok:true,user:{...me,points:st.stars,powers:st.owned,powersOn:st.on}};
  else if(u.pathname==='/api/user/tester')d={ok:true,user:{...me,points:st.stars,powers:st.owned,powersOn:st.on}};
  else if(u.pathname==='/api/user/rich')d={ok:true,user:other};
  else if(u.pathname==='/api/user/v07')d={ok:true,user:{username:'v07',verified:true,member:true,points:3,badges:['verified','member'],activeBadge:'verified'}};
  else if(u.pathname==='/api/user/kit')d={ok:true,user:{username:'kit',points:1,badges:['kitty'],activeBadge:'kitty'}};
  else if(u.pathname==='/api/powers')d={ok:true,catalog:CAT,owned:st.owned,on:st.on,settings:st.settings,stars:st.stars};
  else if(u.pathname==='/api/powers/settings'){st.settings[body.id]={color:'gold',style:'solid',...(st.settings[body.id]||{}),...body.settings};d={ok:true,id:body.id,settings:st.settings[body.id]};}
  else if(u.pathname==='/api/powers/buy'){const p=CAT.find(x=>x.id===body.id);if(st.stars<p.price)d={ok:false,error:'not enough stars'};else{st.stars-=p.price;st.owned=[...st.owned,p.id];if(p.settings)st.settings[p.id]={color:'gold',style:'solid'};st.log.unshift({t:'buy',n:-p.price,power:p.id,at:Date.now()});d={ok:true,stars:st.stars,owned:st.owned,on:st.on};}}
  else if(u.pathname==='/api/powers/set'){st.on=body.on===false?st.on.filter(x=>x!==body.id):[...st.on,body.id];d={ok:true,owned:st.owned,on:st.on};}
  else if(u.pathname==='/api/analytics/stats')d={ok:true,stats:{days:[],totalNewUsers:3}};
  else if(u.pathname==='/api/stars')d={ok:true,stars:st.stars,log:st.log};
  else if(u.pathname==='/api/stars/gift'){if(st.stars<body.n)d={ok:false,error:'not enough stars'};else{st.stars-=body.n;other.points+=body.n;st.gift=body;d={ok:true,stars:st.stars,theirStars:other.points,to:other.username};}}
  else if(u.pathname==='/api/ws-ticket')d={ticket:'t'};else if(u.pathname==='/api/messages')d={ok:true,messages:[],badges:{}};
  return r.fulfill({json:d,headers:{'access-control-allow-origin':'*'}});});
 const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(ORIGIN+'/#journal');
 await p.waitForFunction(()=>window.MPChat&&MPChat.openUserSheet&&document.querySelector('.chat-input,#chat textarea,#chat input'),null,{timeout:15000});await p.waitForTimeout(500);
 const tag=theme+'-'+width;
 // Powers render in chat: Ink colours the name, Glow lights it, Bubble tints the bubble; live pw events restyle.
 const rm=p.locator('.chat-msg[data-user=rich]');await rm.waitFor({timeout:8000});
 assert.equal(await rm.locator('.chat-msg-head strong').evaluate(e=>getComputedStyle(e).color),'rgb(255, 127, 184)','ink name colour');
 assert.notEqual(await rm.locator('.chat-msg-head strong').evaluate(e=>getComputedStyle(e).textShadow),'none','glow');
 assert.match(await rm.locator('.chat-bubble').evaluate(e=>getComputedStyle(e).backgroundImage),/gradient/,'bubble tint');
 await p.screenshot({path:`${OUT}/${tag}-chat-powers.png`});
 ws.send(JSON.stringify({t:'pw',user:'rich',pw:{ink:'#5fe3b0'}}));await p.waitForFunction(()=>!document.querySelector('.chat-msg[data-user=rich]').classList.contains('pw-bubble'));
 assert.equal(await rm.locator('.chat-msg-head strong').evaluate(e=>getComputedStyle(e).color),'rgb(95, 227, 176)','live ink change');assert.equal(await rm.locator('.chat-msg-head strong').evaluate(e=>getComputedStyle(e).textShadow),'none','glow off live');
 ws.send(JSON.stringify({t:'pw',user:'rich',pw:{ink:'#ff7fb8',glow:'#a9d7f5',bubble:'#b18cff'}}));

 // Own profile: Powers, Stars, Orders (+ Dashboard for owner only); stars label.
 const expand=async u=>{await p.evaluate(u=>MPChat.openUserSheet(u),u);const o=p.locator('.mp-profile-summary-open');await o.waitFor({timeout:8000});await p.waitForTimeout(350);await o.click();await p.waitForTimeout(500);};
 await expand('tester');const acts=p.locator('.mp-pb-acts');await acts.waitFor({timeout:8000});await p.waitForTimeout(500);
 const labels=await acts.locator('.mp-pb-act span').allTextContents();
 assert.deepEqual(labels,owner?['Powers','Stars','Orders','Dashboard']:['Powers','Stars','Orders'],tag+' action pills');
 assert.match(await p.locator('.mp-pb-stats .mp-pb-pts').innerText(),/180\s+stars/);
 assert.equal(await p.locator('.mp-pb-pow').count(),0,'no powers pill when none owned');
 const ab=await acts.boundingBox();assert(ab.x>=0&&ab.x+ab.width<=width+0.5,tag+' actions fit');
 await p.screenshot({path:`${OUT}/${tag}-profile.png`});

 // Powers sheet: two-tap buy, unaffordable disabled, equip toggle.
 await acts.locator('.mp-pb-act',{hasText:'Powers'}).click();const sheet=p.locator('.mp-profile-bar .pow-page');await sheet.locator('.pow-tile').first().waitFor();
 // Balance row: left-aligned star + count only (no 'stars' label).
 assert.equal((await sheet.locator('.pow-sum').innerText()).trim(),'180');const sumL=await sheet.locator('.pow-sum .stars-ico').evaluate(e=>e.getBoundingClientRect().left-e.closest('.pow-page').getBoundingClientRect().left);assert(sumL<=6,'powers balance left aligned '+sumL);
 assert(!(await sheet.locator('.pow-tile[data-id=bubble]').isDisabled()),'bubble affordable at 180');
 const buy=sheet.locator('.pow-tile.is-shop[data-id=ink]');await buy.click();assert.equal((await buy.locator('.pow-price').innerText()).trim(),'Buy?');assert.deepEqual(st.owned,[],'first tap only asks');
 await buy.click();const halo=sheet.locator('.pow-tile.is-owned[data-id=ink]');await halo.waitFor();
 assert.deepEqual(st.owned,['ink']);assert.equal((await sheet.locator('.pow-sum').innerText()).trim(),'80');
 assert.equal(await halo.getAttribute('aria-pressed'),'false');assert(await sheet.locator('.pow-tile[data-id=bubble]').isDisabled(),'balance refresh disables bubble');
 // Selecting works like badges: tap highlights (aria-pressed), status confirms, tap again clears.
 await halo.click();await p.waitForFunction(()=>document.querySelector('.pow-tile.is-owned[data-id=ink] .pow-tile-main')?.getAttribute('aria-pressed')==='true');
 assert.deepEqual(st.on,['ink']);assert(await halo.evaluate(e=>e.classList.contains('is-selected')));assert.equal((await sheet.locator('.pow-status').innerText()).trim(),'Powers updated.');
 // Settings open inside the selected power's box (full width), selected like badges; saved.
 assert(await halo.evaluate(e=>e.classList.contains('has-set')));const hb=await halo.boundingBox(),gb=await sheet.locator('.pow-grid').first().boundingBox();assert(Math.abs(hb.width-gb.width)<=1,'settings box spans the row');
 assert.equal(await halo.locator('.pow-sw[aria-pressed=true]').getAttribute('data-v'),'gold');assert.equal(await halo.locator('.pow-ch[aria-pressed=true]').innerText(),'Solid');
 await halo.locator('.pow-sw[data-v=pink]').click();await p.waitForFunction(()=>document.querySelector('.pow-status')?.textContent==='Saved.');
 assert.equal(st.settings.ink.color,'pink');assert.equal(await sheet.locator('.pow-tile[data-id=ink] .pow-sw[aria-pressed=true]').getAttribute('data-v'),'pink');
 await sheet.locator('.pow-tile[data-id=ink] .pow-ch[data-v=spin]').click();await p.waitForFunction(()=>document.querySelector('.pow-tile[data-id=ink] .pow-ch.is-on')?.textContent==='Spin');assert.equal(st.settings.ink.style,'spin');assert.equal(st.settings.ink.color,'pink','other setting kept');
 await p.screenshot({path:`${OUT}/${tag}-settings.png`});
 const sel=await halo.evaluate(e=>getComputedStyle(e).borderTopColor),off=await sheet.locator('.pow-tile.is-shop').first().evaluate(e=>getComputedStyle(e).borderTopColor);assert.notEqual(sel,off,'selected tile highlighted');
 // 2-column grid of squares.
 const boxes=await sheet.locator('.pow-grid').last().locator('.pow-tile').evaluateAll(els=>els.map(e=>{const r=e.getBoundingClientRect();return [Math.round(r.left),Math.round(r.width),Math.round(r.height)];}));
 assert.equal(new Set(boxes.map(b=>b[0])).size,2,'two columns');boxes.forEach(b=>assert(Math.abs(b[1]-b[2])<=1,'square tile '+b));
 // Morphs inside the profile bar: no separate sheet, header names the page.
 assert.equal(await p.locator('.rc-back').count(),0,'no separate sheet');assert.equal(await p.locator('.mp-profile-bar-head strong').innerText(),'Powers');
 const sb=await p.locator('.mp-profile-bar').boundingBox();assert(sb.x>=0&&sb.x+sb.width<=width+0.5,tag+' page fits');
 await p.screenshot({path:`${OUT}/${tag}-powers.png`});
 // Back returns to the profile, with the new balance.
 await p.locator('.mp-profile-bar-head button').first().click();await acts.waitFor();await p.waitForTimeout(450);
 assert.match(await p.locator('.mp-pb-stats .mp-pb-pts').innerText(),/80\s+stars/,'profile shows new balance');
 // Stars action pill: hollow star like the other pill icons.
 assert.equal(await acts.locator('.mp-pb-act',{hasText:/^Stars$/}).locator('svg path').evaluate(e=>getComputedStyle(e).fill),'none','hollow star icon');
 if(owner){
  // Dashboard morphs inside the profile bar (no full-screen popup), Back returns to the profile.
  await acts.locator('.mp-pb-act',{hasText:'Dashboard'}).click();await p.locator('.mp-profile-bar .msg-popup.is-embedded .dashboard-sheet').waitFor({timeout:8000});await p.waitForTimeout(600);
  assert.equal(await p.locator('.mp-profile-bar-head strong').innerText(),'Dashboard');assert.equal(await p.locator('body > #msg-popup').count(),0,'no full-screen dashboard');
  assert(await p.locator('.mp-profile-bar .dash-head h3').isHidden(),'duplicate title hidden');
  const db=await p.locator('.mp-profile-bar').boundingBox();assert(db.x>=0&&db.x+db.width<=width+0.5,'dashboard fits');
  await p.screenshot({path:`${OUT}/${tag}-dashboard.png`});
  await p.locator('.mp-profile-bar-head button').first().click();await acts.waitFor();await p.waitForTimeout(500);
  await p.waitForTimeout(400);assert.equal(await p.locator('#msg-popup').count(),0,'late stats do not reopen a popup');
 }

 // Stars sheet: balance, log lines, Get stars -> shop.
 await acts.locator('.mp-pb-act',{hasText:'Stars'}).click();const ss=p.locator('.mp-profile-bar .pow-page');assert.equal(await p.locator('.mp-profile-bar-head strong').innerText(),'Stars');await ss.locator('.stars-row').first().waitFor();
 assert.equal((await ss.locator('.stars-bal b').innerText()).trim(),'80');
 // Balance row: left-aligned icon + count only; icon height matches the digits' height.
 assert.equal((await ss.locator('.stars-bal').innerText()).trim(),'80','no trailing stars label');
 const geo=await ss.evaluate(()=>{const row=document.querySelector('.stars-bal'),ico=row.querySelector('.stars-ico'),num=row.querySelector('b'),page=document.querySelector('.mp-profile-bar .pow-page');
   const c=document.createElement('canvas').getContext('2d');const cs=getComputedStyle(num);c.font=cs.fontWeight+' '+cs.fontSize+' '+cs.fontFamily;const m=c.measureText(num.textContent);const ir=ico.getBoundingClientRect(),nr=num.getBoundingClientRect(),pr=page.getBoundingClientRect();
   const z=document.createElement('span');z.style.cssText='display:inline-block;width:0;height:0';num.appendChild(z);const base=z.getBoundingClientRect().bottom;z.remove();
   return {icoH:ir.height,digitH:m.actualBoundingBoxAscent+m.actualBoundingBoxDescent,icoLeft:ir.left-pr.left,icoTop:ir.top,digitTop:base-m.actualBoundingBoxAscent,icoBottom:ir.bottom,digitBottom:base+m.actualBoundingBoxDescent};});
 assert(geo.icoLeft<=6,'left aligned '+geo.icoLeft);assert(Math.abs(geo.icoH-geo.digitH)<=1.5,'icon '+geo.icoH+' vs digits '+geo.digitH);assert(Math.abs(geo.icoTop-geo.digitTop)<=1.5&&Math.abs(geo.icoBottom-geo.digitBottom)<=1.5,'icon spans the digits '+JSON.stringify(geo));
 assert.equal((await ss.locator('.stars-get').innerText()).trim(),'Buy stars');
 const rows=await ss.locator('.stars-row').allInnerTexts();assert.match(rows[0],/Bought Ink[\s\S]*−100/);assert.match(rows[1],/Gift from @?friend[\s\S]*\+1/i);
 await p.screenshot({path:`${OUT}/${tag}-stars.png`});
 await ss.locator('.stars-get').click();await p.waitForFunction(()=>location.hash==='#shop');await p.waitForTimeout(300);assert.equal(await p.locator('.rc-back').count(),0,'no sheet');assert.equal(await p.locator('.mp-profile-bar .pow-page').count(),0,'profile closed on Get stars');

 // Someone else's profile: Powers pill with +2 overflow, expands to all 7; no own-only pills.
 await p.goto(ORIGIN+'/#journal');await p.waitForFunction(()=>window.MPChat&&MPChat.openUserSheet);await p.waitForTimeout(600);
 await expand('rich');const pill=p.locator('.mp-pb-pow-pill');await pill.waitFor({timeout:8000});await p.waitForTimeout(300);
 assert.equal(await pill.locator('.mp-pb-pow-icons .pow-ico').count(),5);assert.equal(await pill.evaluate(e=>getComputedStyle(e).borderTopLeftRadius),'999px','rounded pill');assert.equal((await pill.locator('.mp-pb-pow-more').innerText()).trim(),'+2');
 assert(await p.locator('.mp-pb-pow-list').isHidden());await pill.click();
 assert.equal(await p.locator('.mp-pb-pow-list .mp-pb-pow-item').count(),7);assert.equal(await pill.getAttribute('aria-expanded'),'true');
 assert.match(await p.locator('.mp-pb-pow-item.on').innerText(),/Ink$/);
 assert.equal(await p.locator('.mp-pb-act',{hasText:/^(Powers|Stars|Orders|Dashboard)$/}).count(),0,'own-only pills hidden on others');
 // Gift stars from someone else's profile: morphs into the gift page, pick like a badge, send, back to profile.
 assert.equal(await p.locator('.mp-pb-act',{hasText:/^Gift$/}).count(),1,'pill says Gift');
 // VIP + another displayed badge: gold ring and VIP pill still show; the displayed badge stays in the row.
 assert(await p.locator('.mp-pb-av').evaluate(e=>e.classList.contains('is-vip')),'VIP gold ring');assert.equal(await p.locator('.mp-pb-stats .chat-badge-pill-vip').count(),1,'VIP pill');
 assert.equal(await p.locator('.mp-pb-badges .mp-pb-badge.on').count(),1,'kitty badge still listed');
 // Site star: rounded filled accent star in stats, pills and top bar.
 // The Hugeicons swapper (forum-mount-patch, first 20s) must not replace the site star with an outline.
 await p.evaluate(()=>new Promise(r=>setTimeout(r,2300)));assert.match(await p.locator('.mp-pb-act',{hasText:/^Gift$/}).locator('svg path').getAttribute('d'),/^M12 3\.5l2\.6/,'Gift pill keeps the site star outline');assert.equal(await p.locator('.chat-points svg.mp-star').count(),1,'top bar keeps the site star');
 assert(await p.locator('.mp-pb-stats svg.mp-star').count()>=1);assert(await p.locator('.chat-points svg.mp-star').count()>=1,'top bar star');
 const starFill=await p.locator('.mp-pb-stats svg.mp-star path').evaluate(e=>getComputedStyle(e).fill),accent=await p.evaluate(()=>{const t=document.createElement('i');t.style.color='var(--accent)';document.body.appendChild(t);const c=getComputedStyle(t).color;t.remove();return c;});assert.equal(starFill,accent,'star filled with accent');
 await p.locator('.mp-pb-act',{hasText:/^Gift$/}).click();const gp=p.locator('.mp-profile-bar .gift-page');await gp.waitFor();
 assert.equal(await p.locator('.mp-profile-bar-head strong').innerText(),'Gift stars');assert.match(await gp.locator('.gift-to').innerText(),/rich/);
 assert(await gp.locator('.gift-send').isDisabled());assert(await gp.locator('.gift-amt[data-n="100"]').isDisabled(),'cannot gift more than balance');
 await gp.locator('.gift-amt[data-n="10"]').click();assert.equal(await gp.locator('.gift-amt[data-n="10"]').getAttribute('aria-pressed'),'true');assert.equal((await gp.locator('.gift-send').innerText()).trim(),'Send 10 stars');
 await p.screenshot({path:`${OUT}/${tag}-gift.png`});
 await gp.locator('.gift-send').click();await p.waitForFunction(()=>/Sent 10 stars/.test(document.querySelector('.gift-page .pow-status')?.textContent||''));
 assert.equal(JSON.stringify(st.gift),JSON.stringify({to:'rich',n:10}));
 await p.locator('.mp-pb-acts').waitFor({timeout:4000});await p.waitForTimeout(500);assert.match(await p.locator('.mp-pb-stats .mp-pb-pts').innerText(),/19\s+stars/,'recipient balance updated');
 const pb=await p.locator('.mp-pb-pow').boundingBox();assert(pb.x>=0&&pb.x+pb.width<=width+0.5,tag+' pill fits');
 await p.screenshot({path:`${OUT}/${tag}-other.png`});
 // Hello Kitty badge (no VIP): pink ring.
 await p.goto(ORIGIN+'/#journal');await p.waitForFunction(()=>window.MPChat&&MPChat.openUserSheet);await p.waitForTimeout(600);await expand('kit');
 assert(await p.locator('.mp-pb-av').evaluate(e=>e.classList.contains('is-kitty')&&!e.classList.contains('is-vip')),'pink kitty ring');
 const ringBg=await p.locator('.mp-pb-av .mp-pb-ring').evaluate(e=>getComputedStyle(e).backgroundImage);assert.match(ringBg,/255, 127, 184/,'pink gradient');
 await p.screenshot({path:`${OUT}/${tag}-kitty.png`});
 // 07 (verified) outranks VIP: 07 pill and ring, no VIP pill.
 await p.goto(ORIGIN+'/#journal');await p.waitForFunction(()=>window.MPChat&&MPChat.openUserSheet);await p.waitForTimeout(600);await expand('v07');
 assert.equal(await p.locator('.mp-pb-stats .chat-badge-pill-07').count(),1,'07 pill');assert.equal(await p.locator('.mp-pb-stats .chat-badge-pill-vip').count(),0,'no VIP pill');
 assert(await p.locator('.mp-pb-av').evaluate(e=>e.classList.contains('is-verified')&&!e.classList.contains('is-vip')),'07 ring, not VIP gold');
 assert.deepEqual(errors,[],tag+' page errors');await c.close();console.log('passed',tag);
}
await browser.close();console.log('Powers & Stars UI passed; screenshots in '+OUT);})().catch(e=>{console.error(e);process.exit(1);});
