// Powers & Stars: profile Powers/Stars buttons (Dashboard owner-only), Powers pill
// with +N overflow and tap-to-expand, Powers sheet buy (two taps) and equip,
// Stars sheet balance/log/Get stars -> shop. Stateful API mock; no network.
// Run: node tools/test-powers-stars.cjs   (Chromium; MP_CHROMIUM_PATH to override)
const pw=require(process.env.MP_PLAYWRIGHT||'playwright'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const ROOT=path.resolve(__dirname,'..'),ORIGIN='https://misereperdue.com',OUT=process.env.MP_TEST_ARTIFACTS||'/tmp/mp-powers-stars';fs.mkdirSync(OUT,{recursive:true});
const T={'.html':'text/html','.css':'text/css','.js':'application/javascript','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.webp':'image/webp','.json':'application/json','.mp4':'video/mp4','.woff2':'font/woff2'};
const CAT=[['glow','Glow',50],['ink','Ink',75],['halo','Halo',100],['bubble','Bubble',120],['spark','Spark',150],['banner','Banner',200],['echo','Echo',250],['crown','Crown',500]].map(([id,name,price])=>({id,name,price,icon:'*',desc:name+' power'}));
(async()=>{const browser=await pw.chromium.launch({executablePath:process.env.MP_CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
for(const[theme,owner,width]of[['dark',true,390],['light',false,360]]){
 const st={stars:180,owned:[],on:[],log:[{t:'gift-in',n:1,from:'friend',at:Date.now()}]};
 const me={username:'tester',points:st.stars,hasRecovery:true,hasPassword:true,member:true,owner};
 const other={username:'rich',points:9,powers:['glow','ink','halo','bubble','spark','banner','echo'],powersOn:['halo']};
 const c=await browser.newContext({viewport:{width,height:844},deviceScaleFactor:2,colorScheme:theme,serviceWorkers:'block'});const errors=[];
 await c.addInitScript(()=>{localStorage.setItem('chat_token','test-only');sessionStorage.setItem('rc_later','1');});
 await c.routeWebSocket(/api\.misereperdue\.com/,s=>{setTimeout(()=>s.send(JSON.stringify({t:'hello',you:me,messages:[],online:1,caps:{}})),40);});
 await c.route('**/*',async r=>{const u=new URL(r.request().url());if(u.origin===ORIGIN){const f=path.join(ROOT,u.pathname==='/'?'index.html':decodeURIComponent(u.pathname));if(fs.existsSync(f)&&fs.statSync(f).isFile())return r.fulfill({path:f,contentType:T[path.extname(f)]||'application/octet-stream'});return r.fulfill({status:404,body:''});}
  if(u.pathname.startsWith('/api/avatarimg/'))return r.fulfill({path:ROOT+'/img/icon-192.png',contentType:'image/png'});
  let d={ok:true,messages:[],count:0};const body=r.request().postDataJSON&&r.request().method()==='POST'?r.request().postDataJSON():null;
  if(u.pathname==='/api/me')d={ok:true,user:{...me,points:st.stars,powers:st.owned,powersOn:st.on}};
  else if(u.pathname==='/api/user/tester')d={ok:true,user:{...me,points:st.stars,powers:st.owned,powersOn:st.on}};
  else if(u.pathname==='/api/user/rich')d={ok:true,user:other};
  else if(u.pathname==='/api/powers')d={ok:true,catalog:CAT,owned:st.owned,on:st.on,stars:st.stars};
  else if(u.pathname==='/api/powers/buy'){const p=CAT.find(x=>x.id===body.id);if(st.stars<p.price)d={ok:false,error:'not enough stars'};else{st.stars-=p.price;st.owned=[...st.owned,p.id];st.log.unshift({t:'buy',n:-p.price,power:p.id,at:Date.now()});d={ok:true,stars:st.stars,owned:st.owned,on:st.on};}}
  else if(u.pathname==='/api/powers/set'){st.on=body.on===false?st.on.filter(x=>x!==body.id):[...st.on,body.id];d={ok:true,owned:st.owned,on:st.on};}
  else if(u.pathname==='/api/stars')d={ok:true,stars:st.stars,log:st.log};
  else if(u.pathname==='/api/ws-ticket')d={ticket:'t'};else if(u.pathname==='/api/messages')d={ok:true,messages:[],badges:{}};
  return r.fulfill({json:d,headers:{'access-control-allow-origin':'*'}});});
 const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(ORIGIN+'/#journal');
 await p.waitForFunction(()=>window.MPChat&&MPChat.openUserSheet&&document.querySelector('.chat-input,#chat textarea,#chat input'),null,{timeout:15000});await p.waitForTimeout(500);
 const tag=theme+'-'+width;

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
 await acts.locator('.mp-pb-act',{hasText:'Powers'}).click();const sheet=p.locator('.pow-sheet');await sheet.locator('.pow-row').first().waitFor();
 assert.match(await sheet.locator('.pow-bal').innerText(),/180 stars/);
 assert(await sheet.locator('.pow-row[data-id=crown] .pow-buy').isDisabled(),'crown unaffordable');
 const buy=sheet.locator('.pow-row[data-id=halo] .pow-buy');await buy.click();assert.equal((await buy.innerText()).trim(),'Buy?');assert.deepEqual(st.owned,[],'first tap only asks');
 await buy.click();await sheet.locator('.pow-row[data-id=halo] .pow-tog').waitFor();
 assert.deepEqual(st.owned,['halo']);assert.match(await sheet.locator('.pow-bal').innerText(),/80 stars/);
 assert(await sheet.locator('.pow-row[data-id=banner] .pow-buy').isDisabled(),'balance refresh disables banner');
 await sheet.locator('.pow-row[data-id=halo] .pow-tog').click();await p.waitForFunction(()=>document.querySelector('.pow-row[data-id=halo] .pow-tog.on'));assert.deepEqual(st.on,['halo']);
 const sb=await p.locator('.rc-card').boundingBox();assert(sb.x>=0&&sb.x+sb.width<=width+0.5,tag+' sheet fits');
 await p.screenshot({path:`${OUT}/${tag}-powers.png`});
 await p.locator('.rc-x-close').click();await p.waitForTimeout(350);

 // Stars sheet: balance, log lines, Get stars -> shop.
 await p.evaluate(()=>MPOpenStars());const ss=p.locator('.pow-sheet');await ss.locator('.stars-row').first().waitFor();
 assert.equal((await ss.locator('.stars-bal b').innerText()).trim(),'80');
 const rows=await ss.locator('.stars-row').allInnerTexts();assert.match(rows[0],/Bought Halo[\s\S]*−100/);assert.match(rows[1],/Gift from @?friend[\s\S]*\+1/i);
 await p.screenshot({path:`${OUT}/${tag}-stars.png`});
 await ss.locator('.stars-get').click();await p.waitForFunction(()=>location.hash==='#shop');await p.waitForTimeout(300);assert.equal(await p.locator('.rc-back').count(),0,'sheet closed');

 // Someone else's profile: Powers pill with +2 overflow, expands to all 7; no own-only pills.
 await p.goto(ORIGIN+'/#journal');await p.waitForFunction(()=>window.MPChat&&MPChat.openUserSheet);await p.waitForTimeout(600);
 await expand('rich');const pill=p.locator('.mp-pb-pow-pill');await pill.waitFor({timeout:8000});await p.waitForTimeout(300);
 assert.equal(await pill.locator('.mp-pb-pow-icons .pow-ico').count(),5);assert.equal((await pill.locator('.mp-pb-pow-more').innerText()).trim(),'+2');
 assert(await p.locator('.mp-pb-pow-list').isHidden());await pill.click();
 assert.equal(await p.locator('.mp-pb-pow-list .mp-pb-pow-item').count(),7);assert.equal(await pill.getAttribute('aria-expanded'),'true');
 assert.match(await p.locator('.mp-pb-pow-item.on').innerText(),/Halo$/);
 assert.equal(await p.locator('.mp-pb-act',{hasText:/^(Powers|Stars|Orders|Dashboard)$/}).count(),0,'own-only pills hidden on others');
 const pb=await p.locator('.mp-pb-pow').boundingBox();assert(pb.x>=0&&pb.x+pb.width<=width+0.5,tag+' pill fits');
 await p.screenshot({path:`${OUT}/${tag}-other.png`});
 assert.deepEqual(errors,[],tag+' page errors');await c.close();console.log('passed',tag);
}
await browser.close();console.log('Powers & Stars UI passed; screenshots in '+OUT);})().catch(e=>{console.error(e);process.exit(1);});
