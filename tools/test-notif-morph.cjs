// Notification tray morphs from the Chat/Globe top bar (never the shop nav). Mocked data. Chromium.
// MP_PLAYWRIGHT=<playwright> MP_CHROMIUM_PATH=<chrome> node tools/test-notif-morph.cjs
const pw=require(process.env.MP_PLAYWRIGHT||'playwright'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const ROOT=path.resolve(__dirname,'..'),ORIGIN='https://misereperdue.com',OUT=process.env.MP_TEST_ARTIFACTS||'/tmp/mp-notif-morph';
fs.mkdirSync(OUT,{recursive:true});
const T={'.html':'text/html','.css':'text/css','.js':'application/javascript','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.webp':'image/webp','.json':'application/json','.mp4':'video/mp4','.woff2':'font/woff2'};
const me={username:'tester',member:true,vip:true,points:80,hasRecovery:true,hasPassword:true};
const now=Date.now();
const notices=[
  {id:'n1',type:'gift',kind:'stars',from:'eden',n:5,ts:now-4e4,read:false},
  {id:'n2',type:'reply',kind:'thread-reply',from:'rich',threadId:'t1',threadTitle:'Hello',preview:'nice post',ts:now-3.6e6,read:false},
  {id:'n3',type:'mention',kind:'chat',from:'mira',preview:'hey @tester',ts:now-8.64e7,read:true},
  {id:'n4',type:'power',kind:'charm',from:'MISERY',name:'Halo',ts:now-1.8e5,read:true},
  {id:'n5',type:'whisper',kind:'whisper',from:'eden',preview:'psst',ts:now-7200e3,read:true},
  {id:'n6',type:'vip',kind:'vip-upgrade',from:'MISERY',ts:now-8.64e7*3,read:true},
  {id:'n7',type:'reaction',kind:'thread',from:'ava',threadId:'t2',preview:'liked this',ts:now-9e5,read:false},
  {id:'n8',type:'follow',kind:'forum',from:'jules',text:'@jules followed you',ts:now-1.2e8,read:true},
  {id:'n9',type:'gift',kind:'stars',from:'rich',n:20,ts:now-2.5e5,read:true}
];
(async()=>{
  const browser=await pw.chromium.launch({executablePath:process.env.MP_CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const c=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,colorScheme:'dark',serviceWorkers:'block'});
  await c.addInitScript(()=>{localStorage.setItem('chat_token','test-only');localStorage.setItem('theme','dark');document.documentElement.setAttribute('data-theme','dark');sessionStorage.setItem('rc_later','1');});
  await c.routeWebSocket(/api\.misereperdue\.com/,s=>{if(!/\/api\/fm\//.test(s.url()))setTimeout(()=>s.send(JSON.stringify({t:'hello',you:me,messages:[{id:'m0',user:'eden',text:'hi',ts:Date.now()-3e4}],online:1,caps:{}})),40);});
  await c.route('**/*',async r=>{
    const u=new URL(r.request().url()),H={'access-control-allow-origin':'*'};
    if(u.origin===ORIGIN){
      const f=path.join(ROOT,u.pathname==='/'?'index.html':decodeURIComponent(u.pathname));
      if(fs.existsSync(f)&&fs.statSync(f).isFile())return r.fulfill({path:f,contentType:T[path.extname(f)]||'application/octet-stream'});
      return r.fulfill({status:404,body:''});
    }
    if(u.hostname!=='api.misereperdue.com')return r.fulfill({status:204,body:''});
    if(r.request().method()==='OPTIONS')return r.fulfill({status:204,headers:H});
    let d={ok:true};
    if(u.pathname==='/api/me')d={ok:true,user:me};
    else if(u.pathname==='/api/messages')d={ok:true,messages:[],badges:{}};
    else if(u.pathname==='/api/ws-ticket')d={ticket:'t'};
    else if(u.pathname==='/api/notifications')d={ok:true,notifications:notices,unread:3};
    else if(u.pathname==='/api/notifications/read')d={ok:true};
    else if(u.pathname==='/api/forum/threads')d={ok:true,threads:[]};
    else if(u.pathname.startsWith('/api/user/'))d={ok:true,user:{username:u.pathname.split('/').pop()}};
    else if(u.pathname.startsWith('/api/avatarimg/')){const def=path.join(ROOT,'img/default-avatar.jpg');return r.fulfill({path:def,contentType:'image/jpeg'});}
    return r.fulfill({json:d,headers:H});
  });
  const p=await c.newPage();
  await p.goto(ORIGIN+'/#journal');
  await p.waitForFunction(()=>window.MPForum&&MPForum.showNotifications&&document.querySelector('.panel.on #chat-bell'),null,{timeout:20000});
  await p.locator('#chat-bell').click();
  const menu=p.locator('.panel.on .chat-head.is-ntf-bar .mp-ntf-morph');
  await menu.waitFor({timeout:8000});
  assert.equal((await menu.locator('.mp-profile-bar-head>strong').innerText()).trim(),'Notifications');
  assert.equal(await menu.locator('.mp-profile-bar-head [aria-label="Back"]').count(),1);
  await menu.locator('.mp-ntf-row').first().waitFor({timeout:8000});
  const chips=(await menu.locator('.mp-ntf-chip').allInnerTexts()).map(s=>s.trim());
  // Today newest-first, then Earlier: gift, gift, halo, globe-like, globe-reply, whisper / mention, follow, vip
  assert.deepEqual(chips,['Gift','Gift','Gift','Globe','Globe','Whisper','Mention','Globe','VIP']);
  assert.deepEqual((await menu.locator('.mp-ntf-h').allTextContents()).map(s=>s.trim()),['Today','Earlier']);
  assert.ok(await menu.locator('.mp-ntf-row.is-unread').count()>=1);
  assert.equal(await p.locator('.nav.is-ntf-bar, .nav .mp-ntf-morph').count(),0,'not on the shop nav');
  // Same chrome as the other top-bar menus (profile, Powers): no leftover inline list padding (forum-mount-patch), rows inside
  // the 16px content padding, 28px corners, and the sheet is tall enough for its list (no clipped last row).
  await p.waitForFunction(()=>{const b=document.querySelector('.is-ntf-bar');return b&&!b.getAnimations().some(a=>a.playState==='running');},null,{timeout:5000});
  await p.waitForTimeout(150);
  const fit=await p.evaluate(()=>{const r=document.querySelector('.mp-ntf-morph'),bar=r.parentElement,hd=r.querySelector('.mp-profile-bar-head'),l=r.querySelector('.mp-ntf-list'),sc=r.querySelector('.mp-profile-bar-scroll'),row=r.querySelector('.mp-ntf-row');
    return {inline:l.getAttribute('style'),hdLeft:hd.getBoundingClientRect().left,rowLeft:row.getBoundingClientRect().left,radius:getComputedStyle(bar).borderTopLeftRadius,clip:sc.scrollHeight-sc.clientHeight,capped:bar.getBoundingClientRect().height>=470,backFocused:document.activeElement&&document.activeElement.getAttribute('aria-label')==='Back'};});
  assert.equal(fit.inline,null,'no inline style left on the list');
  assert.ok(fit.rowLeft-fit.hdLeft>=12&&fit.rowLeft-fit.hdLeft<=20,'rows sit inside the content padding ('+fit.rowLeft+' vs '+fit.hdLeft+')');
  assert.ok(Math.abs(parseFloat(fit.radius)-28)<=1,'top-bar menu corner radius ('+fit.radius+')');
  assert.ok(fit.capped||fit.clip<=1,'list fits when under the cap (clipped '+fit.clip+'px)');
  assert.equal(fit.backFocused,false,'no focus ring on Back when opened by tap');
    await p.waitForFunction(()=>{const b=document.querySelector('.panel.on .chat-head.is-ntf-bar');return b&&b.getBoundingClientRect().height>120;},null,{timeout:5000});
  const barBox=await p.locator('.panel.on .chat-head.is-ntf-bar').boundingBox();
  const view=p.viewportSize();
  assert.ok(barBox.height<=520,'sheet stays at the #187-sized cap, not full screen ('+barBox.height+')');
  assert.ok(barBox.height<view.height-120,'sheet is not near full screen');
  const headW=await p.evaluate(()=>{const b=document.querySelector('.panel.on .chat-head');return b.getBoundingClientRect().width;});
  assert.ok(barBox.width>=view.width-40,'sheet keeps the top bar width like the other top-bar menus ('+barBox.width+')');
  await p.waitForTimeout(300);
  await p.screenshot({path:process.env.MP_SHOT||`${OUT}/notif-morph-v3-dark.png`,fullPage:false});
  // shop: opening should not morph the nav
  await p.locator('.mp-profile-bar-head [aria-label="Back"]').click();
  await p.waitForFunction(()=>!document.querySelector('.is-ntf-bar'),null,{timeout:5000});
  await p.evaluate(()=>document.querySelector('.nav [data-view=shop]')?.click()||(location.hash='#shop'));
  await p.waitForFunction(()=>{const h=document.querySelector('.panel.on .chat-head');return !h||!h.getClientRects().length;},null,{timeout:8000});
  await p.evaluate(()=>window.MPForum&&MPForum.showNotifications());
  await p.waitForTimeout(400);
  assert.equal(await p.locator('.nav.is-ntf-bar, .nav .mp-ntf-morph, .is-ntf-bar').count(),0,'shop nav stays a nav');
  await c.close();await browser.close();
  console.log('ok notif morph');
})().catch(e=>{console.error(e);process.exit(1);});
