// Info footer link + /info text page (floating Back pill), and a dark Powers→Bubble screenshot
// (no inline back). Run: node tools/test-info.cjs
const pw=require(process.env.MP_PLAYWRIGHT||'playwright'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const ROOT=path.resolve(__dirname,'..'),ORIGIN='https://misereperdue.com',OUT=process.env.MP_TEST_ARTIFACTS||'/tmp/mp-info';
fs.mkdirSync(OUT,{recursive:true});
const T={'.html':'text/html','.css':'text/css','.js':'application/javascript','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.webp':'image/webp','.json':'application/json','.mp4':'video/mp4','.woff2':'font/woff2','.ico':'image/x-icon'};
function fileFor(u){
  let pth=u.pathname==='/'?'/index.html':u.pathname;
  let f=path.join(ROOT,decodeURIComponent(pth));
  if(fs.existsSync(f)&&fs.statSync(f).isFile())return f;
  if(!path.extname(pth)){f=path.join(ROOT,decodeURIComponent(pth)+'.html');if(fs.existsSync(f))return f;}
}
const COLORS=[['ice','#a9d7f5'],['pink','#ff7fb8'],['gold','#f5bf45']].map(([v,color])=>({v,label:v,color}));
const CAT=[{id:'bubble',name:'Bubble',price:120,icon:'○',desc:'Tint your chat bubbles',settings:[{key:'color',label:'Colour',type:'color',options:COLORS,def:'ice',custom:true}]}];
(async()=>{
  const browser=await pw.chromium.launch({executablePath:process.env.MP_CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
  const c=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true,colorScheme:'dark',serviceWorkers:'block'});
  const errors=[];
  await c.route('**/*',async r=>{
    const u=new URL(r.request().url());
    if(u.origin===ORIGIN){const f=fileFor(u);if(f)return r.fulfill({path:f,contentType:T[path.extname(f)]||'application/octet-stream'});return r.fulfill({status:404,body:''});}
    return r.fulfill({status:204,body:''});
  });
  const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));
  await p.goto(ORIGIN+'/#shop');
  await p.waitForSelector('.mp-end-info a');
  const info=p.locator('.mp-end-info a');
  assert.equal((await info.innerText()).trim(),'INFO');
  const typo=await info.evaluate(e=>{const s=getComputedStyle(e);return {color:s.color,fontFamily:s.fontFamily,fontSize:s.fontSize,fontWeight:s.fontWeight,letterSpacing:s.letterSpacing};});
  const copy=await p.locator('.mp-end-copy').evaluate(e=>{const s=getComputedStyle(e);return {color:s.color,fontFamily:s.fontFamily,fontSize:s.fontSize,fontWeight:s.fontWeight,letterSpacing:s.letterSpacing};});
  assert.deepEqual(typo,copy,'INFO matches footer copyright type');
  await info.evaluate(e=>e.click());
  await p.waitForURL('**/info');
  assert.equal(await p.title(),'Misère Perdue · Info');
  assert.equal(await p.locator('main img, main picture, main svg, main video, main canvas').count(),0,'text-only page');
  assert.match(await p.locator('h1').innerText(),/^Info$/);
  assert.match(await p.locator('.updated').innerText(),/Last updated Nov 12, 2026/);
  const body=(await p.locator('main').innerText()).toLowerCase();
  for(const needle of ['all sales are final','no control','dc@misereperdue.com','ontario','stars','powers','vip','misery fm','13','privacy policy','refund policy']){
    assert(body.includes(needle), 'missing '+needle);
  }
  assert(!body.includes('not legal advice'));
  const back=p.locator('#info-back');
  await back.waitFor();
  assert.equal((await back.innerText()).replace(/\s+/g,' ').trim(),'Back');
  const pos=await back.evaluate(e=>{const s=getComputedStyle(e);const r=e.getBoundingClientRect();return {pos:s.position,top:parseFloat(s.top),left:parseFloat(s.left),radius:s.borderRadius,color:s.color};});
  assert.equal(pos.pos,'fixed','back pill is fixed');
  assert.ok(pos.top>=16 && pos.top<=48,'back pill under safe area, got top '+pos.top);
  assert.ok(pos.left>=12 && pos.left<=24,'back pill left inset, got '+pos.left);
  assert.equal(pos.radius,'999px');
  await p.evaluate(()=>window.scrollTo(0,200));
  await p.waitForTimeout(50);
  const faded=await back.evaluate(e=>parseFloat(getComputedStyle(e).opacity));
  assert.ok(faded<1,'back pill fades on scroll, opacity='+faded);
  await p.evaluate(()=>window.scrollTo(0,0));
  await p.screenshot({path:path.join(OUT,'info-back-dark.png')});
  await back.click();
  await p.waitForURL(/misereperdue\.com\/?($|#)/);
  assert.ok(errors.every(e=>!/info/i.test(e)), 'info page errors: '+errors.join('; '));
  await c.close();

  // Powers → Bubble (owned), dark, no inline back. Used as the shipping screenshot.
  const st={stars:200,owned:['bubble'],on:['bubble'],settings:{bubble:{color:'ice'}}};
  const me={username:'tester',points:st.stars,hasRecovery:true,hasPassword:true,member:true,owner:true};
  const c2=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true,colorScheme:'dark',serviceWorkers:'block'});
  await c2.addInitScript(()=>{localStorage.setItem('chat_token','test-only');sessionStorage.setItem('rc_later','1');});
  await c2.routeWebSocket(/api\.misereperdue\.com/,s=>{setTimeout(()=>s.send(JSON.stringify({t:'hello',you:me,messages:[],online:1,caps:{}})),40);});
  await c2.route('**/*',async r=>{
    const u=new URL(r.request().url());
    if(u.origin===ORIGIN){const f=fileFor(u);if(f)return r.fulfill({path:f,contentType:T[path.extname(f)]||'application/octet-stream'});return r.fulfill({status:404,body:''});}
    let d={ok:true};const body=r.request().postDataJSON&&r.request().method()==='POST'?r.request().postDataJSON():null;
    if(u.pathname==='/api/me'||u.pathname==='/api/user/tester')d={ok:true,user:{...me,points:st.stars,powers:st.owned,powersOn:st.on,powerSettings:st.settings}};
    else if(u.pathname==='/api/powers')d={ok:true,catalog:CAT,owned:st.owned,on:st.on,settings:st.settings,stars:st.stars};
    else if(u.pathname==='/api/powers/settings'){st.settings[body.id]={...st.settings[body.id],...body.settings};d={ok:true,id:body.id,settings:st.settings[body.id]};}
    else if(u.pathname==='/api/powers/set'){st.on=body.on===false?st.on.filter(x=>x!==body.id):[...new Set([...st.on,body.id])];d={ok:true,owned:st.owned,on:st.on};}
    else if(u.pathname==='/api/ws-ticket')d={ticket:'t'};
    else if(u.pathname==='/api/messages')d={ok:true,messages:[],badges:{}};
    return r.fulfill({json:d,headers:{'access-control-allow-origin':'*'}});
  });
  const p2=await c2.newPage();
  await p2.goto(ORIGIN+'/#journal');
  await p2.waitForFunction(()=>window.MPChat&&MPChat.openUserSheet,null,{timeout:15000});
  await p2.evaluate(()=>MPChat.openUserSheet('tester'));
  await p2.locator('.mp-profile-summary-open').waitFor({timeout:8000});
  await p2.waitForTimeout(300);
  await p2.locator('.mp-profile-summary-open').click();
  await p2.locator('.mp-pb-acts .mp-pb-act',{hasText:'Powers'}).waitFor();
  await p2.waitForTimeout(400);
  await p2.locator('.mp-pb-acts .mp-pb-act',{hasText:'Powers'}).click();
  const root=p2.locator('.mp-profile-bar-scroll > .pow-page');
  await root.locator('.pw-row[data-id=bubble]').waitFor();
  await root.locator('.pw-row[data-id=bubble] .pw-open').click();
  await root.locator('.pw-page[data-id=bubble]').waitFor();
  assert.equal(await root.locator('.pw-back, .pw-page-head').count(),0,'no inline back on Bubble');
  assert.equal(await p2.locator('.mp-profile-bar-head strong').innerText(),'Powers');
  assert.equal((await root.locator('.pw-hero-copy b').innerText()).trim(),'Bubble');
  await p2.waitForTimeout(400);
  const shot=path.join(OUT,'powers-bubble-dark.png');
  await p2.screenshot({path:shot});
  await browser.close();
  console.log('Info + Bubble screenshot passed; '+shot);
})().catch(e=>{console.error(e);process.exit(1);});
