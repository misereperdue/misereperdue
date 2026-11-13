// Back and X must close every top-bar / + morph menu, including if the
// notifications sheet is mid-exit (#194 leftover). WebKit, iPhone 14, dark.
// MP_PLAYWRIGHT=<playwright> node tools/test-back-x-menus.cjs
const pw=require(process.env.MP_PLAYWRIGHT||'playwright');
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const ROOT=path.resolve(__dirname,'..'),ORIGIN='https://misereperdue.com';
const T={'.html':'text/html','.css':'text/css','.js':'application/javascript','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.webp':'image/webp','.mp4':'video/mp4','.woff2':'font/woff2','.json':'application/json'};
const me={username:'tester',member:true,vip:true,points:80,hasRecovery:true,hasPassword:true};
const now=Date.now();
const notices=[
  {id:'n1',type:'gift',kind:'stars',from:'eden',n:5,ts:now-4e4,read:false},
  {id:'n2',type:'reply',kind:'thread-reply',from:'rich',threadId:'t1',preview:'nice post',ts:now-8.64e7,read:true}
];
(async()=>{
  const browser=await pw.webkit.launch();
  const c=await browser.newContext({...pw.devices['iPhone 14'],colorScheme:'dark',serviceWorkers:'block'});
  await c.addInitScript(()=>{localStorage.setItem('chat_token','test-only');localStorage.setItem('theme','dark');document.documentElement.setAttribute('data-theme','dark');sessionStorage.setItem('rc_later','1');});
  await c.routeWebSocket(/api\.misereperdue\.com/,s=>{if(!/\/api\/fm\//.test(s.url()))setTimeout(()=>s.send(JSON.stringify({t:'hello',you:me,messages:[{id:'m0',user:'eden',text:'hi',ts:Date.now()-3e4}],online:1,caps:{poll:1,private:1}})),40);});
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
    else if(u.pathname==='/api/notifications')d={ok:true,notifications:notices,unread:1};
    else if(u.pathname==='/api/notifications/read')d={ok:true};
    else if(u.pathname.startsWith('/api/avatarimg/'))return r.fulfill({path:path.join(ROOT,'img/default-avatar.jpg'),contentType:'image/jpeg'});
    else if(u.pathname.startsWith('/api/fm/'))d={ok:true,fm:{live:false,paused:false,pos:0,idx:0,startedAt:0,v:1,now:Date.now(),list:[],q:[],upNext:[],hist:[],listeners:0,shuffle:false,repeat:'all',xf:0,note:'',sched:0}};
    return r.fulfill({json:d,headers:H});
  });
  const p=await c.newPage();
  await p.goto(ORIGIN+'/#journal');
  await p.waitForFunction(()=>window.MPForum&&MPForum.showNotifications&&document.querySelector('#chat .chat-plus')&&document.querySelector('#chat #chat-bell')&&window.MPOpenProfile,null,{timeout:20000});
  const splash=p.locator('#mp-splash');
  if(await splash.count())await splash.waitFor({state:'hidden',timeout:10000}).catch(()=>{});

  const bell=p.locator('#chat-bell');
  const ntfBack=()=>p.locator('.is-ntf-bar .chat-pbig-hd [aria-label="Back"]');
  async function openNtf(){
    await bell.click();
    await ntfBack().waitFor({timeout:8000});
    await p.locator('.mp-ntf-row').first().waitFor({timeout:8000});
  }
  async function barClean(tag){
    const s=await p.evaluate(()=>{
      const bar=document.querySelector('.panel.on .chat-head')||document.querySelector('#chat .chat-head');
      return {
        morph:!!document.querySelector('.mp-ntf-morph,.is-ntf-bar,.is-profile-leaving'),
        profile:!!document.querySelector('.is-profile-bar,.mp-profile-bar'),
        plus:!!document.querySelector('.chat-plus-menu'),
        inert:[].filter.call(bar?bar.children:[],el=>el.inert).length,
        style:bar&&bar.getAttribute('style')
      };
    });
    assert.equal(s.morph,false,(tag||'')+' notif morph leftover '+JSON.stringify(s));
    assert.equal(s.profile,false,(tag||'')+' profile leftover');
    assert.equal(s.plus,false,(tag||'')+' plus leftover');
    assert.equal(s.inert,0,(tag||'')+' inert leftover');
    assert.equal(s.style,null,(tag||'')+' inline style leftover '+s.style);
  }

  // Notifications Back closes the sheet and restores the pill.
  await openNtf();
  await ntfBack().click();
  await p.waitForFunction(()=>!document.querySelector('.is-ntf-bar, .mp-ntf-morph'),null,{timeout:5000});
  await p.waitForTimeout(80);
  await barClean('after ntf back');

  // Mid-exit: open profile immediately (before leave finishes). Close must work.
  await openNtf();
  await ntfBack().click();
  await p.waitForTimeout(60);
  await p.evaluate(()=>MPOpenProfile());
  const root=p.locator('.mp-profile-bar');
  await root.waitFor({timeout:8000});
  // leftover ntf morph must already be gone
  assert.equal(await p.locator('.mp-ntf-morph,.is-ntf-bar').count(),0);
  const closeP=p.locator('.mp-profile-bar [aria-label="Close profile"]');
  await closeP.waitFor({timeout:5000});
  await closeP.click();
  await root.waitFor({state:'detached',timeout:5000});
  await p.waitForTimeout(200);
  await barClean('after mid-exit profile close');

  // Mid-exit: open the + menu Globe panel and use Back, then Close.
  await openNtf();
  await ntfBack().click();
  await p.waitForTimeout(60);
  await p.locator('#chat .chat-plus').click({timeout:8000});
  await p.waitForSelector('.chat-plus-menu.is-in',{timeout:5000});
  const globe=p.locator('.chat-plus-menu [data-act="globe"]');
  if(await globe.count())await globe.click();
  else await p.locator('.chat-plus-menu [data-act]').first().click();
  await p.waitForSelector('.chat-plus-menu.chat-pbig',{timeout:5000});
  await p.locator('.chat-plus-menu [aria-label="Back"]').click();
  await p.waitForFunction(()=>{const m=document.querySelector('.chat-plus-menu');return m&&!m.classList.contains('chat-pbig');},{timeout:5000});
  if(await globe.count())await globe.click();
  else await p.locator('.chat-plus-menu [data-act]').first().click();
  await p.waitForSelector('.chat-plus-menu.chat-pbig',{timeout:5000});
  await p.locator('.chat-plus-menu [aria-label="Close"]').click();
  await p.waitForFunction(()=>!document.querySelector('.chat-plus-menu'),null,{timeout:5000});
  await p.waitForTimeout(200);
  await barClean('after mid-exit plus close');

  // After settle, notifications Back still works and + Close works.
  await openNtf();
  await ntfBack().click();
  await p.waitForFunction(()=>!document.querySelector('.is-ntf-bar, .mp-ntf-morph'),null,{timeout:5000});
  await p.waitForTimeout(500);
  await barClean('settled after ntf');
  await p.locator('#chat .chat-plus').click();
  await p.waitForSelector('.chat-plus-menu.is-in',{timeout:5000});
  const globe2=p.locator('.chat-plus-menu [data-act="globe"]');
  if(await globe2.count())await globe2.click();
  else await p.locator('.chat-plus-menu [data-act]').first().click();
  await p.waitForSelector('.chat-plus-menu.chat-pbig',{timeout:5000});
  await p.locator('.chat-plus-menu [aria-label="Close"]').click();
  await p.waitForFunction(()=>!document.querySelector('.chat-plus-menu'),null,{timeout:5000});
  await barClean('settled after plus');

  await c.close();await browser.close();
  console.log('ok back-x menus');
})().catch(e=>{console.error(e);process.exit(1);});
