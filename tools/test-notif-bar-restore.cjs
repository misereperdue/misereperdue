// Notifications morph must always restore the Chat top bar (WebKit / iPhone).
// Repro: open, Back, rapid bell taps, open + menu during/after close, scroll.
// MP_PLAYWRIGHT=<playwright> node tools/test-notif-bar-restore.cjs
const pw=require(process.env.MP_PLAYWRIGHT||'playwright');
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const ROOT=path.resolve(__dirname,'..'),ORIGIN='https://misereperdue.com';
const T={'.html':'text/html','.css':'text/css','.js':'application/javascript','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.webp':'image/webp','.mp4':'video/mp4','.woff2':'font/woff2','.json':'application/json'};
const me={username:'tester',member:true,vip:true,points:80,hasRecovery:true,hasPassword:true};
const now=Date.now();
const notices=[
  {id:'n1',type:'gift',kind:'stars',from:'eden',n:5,ts:now-4e4,read:false},
  {id:'n2',type:'reply',kind:'thread-reply',from:'rich',threadId:'t1',preview:'nice post',ts:now-3.6e6,read:false},
  {id:'n3',type:'mention',kind:'chat',from:'mira',preview:'hey @tester',ts:now-8.64e7,read:true},
  {id:'n4',type:'power',kind:'charm',from:'MISERY',name:'Halo',ts:now-1.8e5,read:true},
  {id:'n5',type:'whisper',kind:'whisper',from:'eden',preview:'psst',ts:now-7200e3,read:true},
  {id:'n6',type:'vip',kind:'vip-upgrade',from:'MISERY',ts:now-8.64e7*3,read:true}
];
async function state(p){
  return p.evaluate(()=>{
    const bar=document.querySelector('.panel.on .chat-head');
    if(!bar)return {missing:true};
    const c=getComputedStyle(bar), r=bar.getBoundingClientRect();
    const title=bar.querySelector('.chat-title'), right=bar.querySelector('.chat-head-right');
    const ts=title&&getComputedStyle(title), rs=right&&getComputedStyle(right);
    return {
      cls:bar.className, style:bar.getAttribute('style'), display:c.display,
      h:Math.round(r.height), w:Math.round(r.width),
      morph:!!bar.querySelector('.mp-ntf-morph, .mp-profile-bar'),
      leaving:bar.classList.contains('is-profile-leaving'),
      profile:bar.classList.contains('is-profile-bar')||bar.classList.contains('is-ntf-bar'),
      title:{vis:ts&&ts.visibility, op:+Number(ts&&ts.opacity).toFixed(2), inert:!!(title&&title.inert), abs:/position:\s*absolute/.test((title&&title.getAttribute('style'))||'')},
      right:{vis:rs&&rs.visibility, op:+Number(rs&&rs.opacity).toFixed(2), inert:!!(right&&right.inert)}
    };
  });
}
function assertRestored(s, base, label){
  assert.equal(!!s.missing,false,label+' bar missing');
  assert.equal(s.profile,false,label+' leftover morph classes: '+s.cls);
  assert.equal(s.morph,false,label+' morph still in the bar');
  assert.equal(s.display,'flex',label+' display '+s.display);
  assert.equal(s.style,null,label+' leftover inline style '+s.style);
  assert.ok(Math.abs(s.h-base.h)<=3,label+' height '+s.h+' vs '+base.h);
  assert.equal(s.title.vis,'visible',label+' title hidden');
  assert.equal(s.right.vis,'visible',label+' actions hidden');
  assert.ok(s.title.op>=0.99,label+' title opacity '+s.title.op);
  assert.ok(s.right.op>=0.99,label+' actions opacity '+s.right.op);
  assert.equal(s.title.inert,false,label+' title inert');
  assert.equal(s.right.inert,false,label+' actions inert');
  assert.equal(s.title.abs,false,label+' title still absolutely positioned');
}
function assertNotEmptyShell(s, base, label){
  // During close the sheet may still be shrinking, but we must never leave a
  // tall empty bar (morph gone, chrome invisible, height still expanded).
  const emptyTall=!s.morph && s.h>base.h+20 && (s.title.op<0.2 || s.title.vis==='hidden');
  assert.equal(emptyTall,false,label+' empty tall shell h='+s.h+' op='+s.title.op+' morph='+s.morph);
}
(async()=>{
  const browser=await pw.webkit.launch();
  const c=await browser.newContext({...pw.devices['iPhone 14'],colorScheme:'dark',serviceWorkers:'block'});
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
    else if(u.pathname==='/api/notifications')d={ok:true,notifications:notices,unread:2};
    else if(u.pathname==='/api/notifications/read')d={ok:true};
    else if(u.pathname.startsWith('/api/avatarimg/'))return r.fulfill({path:path.join(ROOT,'img/default-avatar.jpg'),contentType:'image/jpeg'});
    return r.fulfill({json:d,headers:H});
  });
  const p=await c.newPage();
  await p.goto(ORIGIN+'/#journal');
  await p.waitForFunction(()=>window.MPForum&&MPForum.showNotifications&&document.querySelector('.panel.on #chat-bell'),null,{timeout:20000});
  const base=await state(p);
  assert.equal(base.display,'flex');
  const bell=p.locator('#chat-bell');
  const back=()=>p.locator('.mp-ntf-morph-hd [aria-label="Back"]');
  async function openMenu(){await bell.click();await back().waitFor({timeout:8000});await p.locator('.mp-ntf-row').first().waitFor({timeout:8000});}
  async function closeAndSettle(){
    if(await back().count())await back().click();
    await p.waitForFunction(()=>!document.querySelector('.is-ntf-bar, .mp-ntf-morph'),null,{timeout:5000});
    await p.waitForTimeout(50);
  }

  await openMenu();
  await back().click();
  await p.waitForTimeout(80);
  assertNotEmptyShell(await state(p),base,'mid-back');
  await p.waitForTimeout(400);
  assertRestored(await state(p),base,'after-back');

  await openMenu();
  await back().click();
  await p.waitForTimeout(80);
  await bell.click(); // reopen during exit
  await back().waitFor({timeout:5000});
  await p.locator('.mp-ntf-row').first().waitFor({timeout:5000});
  await p.waitForTimeout(400);
  assert.ok((await state(p)).morph && !(await state(p)).leaving,'reopen during exit should show the menu');
  await closeAndSettle();
  assertRestored(await state(p),base,'after-reopen-during-exit');

  for(let i=0;i<8;i++) await bell.click({force:true});
  await p.waitForTimeout(80);
  assertNotEmptyShell(await state(p),base,'rapid mid');
  await closeAndSettle();
  assertRestored(await state(p),base,'after-rapid-taps');

  await openMenu();
  await back().click();
  await p.locator('.panel.on .chat-plus').click({force:true});
  await p.waitForTimeout(80);
  assertNotEmptyShell(await state(p),base,'plus during exit');
  await p.waitForTimeout(400);
  assertRestored(await state(p),base,'plus after exit');
  await p.keyboard.press('Escape').catch(()=>{});

  await p.evaluate(()=>{const m=document.querySelector('.panel.on .chat-msgs');if(m)m.scrollTop=200;});
  await p.waitForTimeout(200);
  assertRestored(await state(p),base,'after-scroll');

  await c.close();await browser.close();
  console.log('ok notif bar restore');
})().catch(e=>{console.error(e);process.exit(1);});
