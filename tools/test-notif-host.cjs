// Notification popup morphs only a visible Chat/Globe header, never the nav pill (dc t579u).
// Chromium; APIs mocked. Run: node tools/test-notif-host.cjs
const pw=require(process.env.MP_PLAYWRIGHT||'playwright'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const ROOT=path.resolve(__dirname,'..'),ORIGIN='https://misereperdue.com';
const T={'.html':'text/html','.css':'text/css','.js':'application/javascript','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp','.json':'application/json','.mp4':'video/mp4','.woff2':'font/woff2'};
const me={username:'tester',member:true,vip:true,points:80,hasRecovery:true,hasPassword:true};
(async()=>{
  const browser=await pw.chromium.launch({executablePath:process.env.MP_CHROMIUM_PATH||'/opt/ungoogled-chromium/chrome',args:['--no-sandbox']});
  const c=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,colorScheme:'dark',serviceWorkers:'block'});
  await c.addInitScript(()=>{localStorage.setItem('chat_token','test-only');localStorage.setItem('theme','dark');sessionStorage.setItem('rc_later','1');});
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
    else if(u.pathname==='/api/notifications')d={ok:true,notifications:[]};
    else if(u.pathname==='/api/forum/threads')d={ok:true,threads:[]};
    return r.fulfill({json:d,headers:H});
  });
  const p=await c.newPage();
  const gift={type:'gift',from:'eden',kind:'stars',n:5};
  await p.goto(ORIGIN+'/#journal');
  await p.waitForFunction(()=>window.MPNotifPop&&document.querySelector('.panel.on .chat-head'),null,{timeout:15000});
  await p.evaluate(n=>MPNotifPop(n),gift);
  await p.locator('.panel.on .chat-head.is-ntf .mp-ntf').waitFor({timeout:3000});
  assert.equal(await p.locator('.nav.is-ntf, .nav .mp-ntf').count(),0,'chat popup stays off the nav pill');
  await p.waitForFunction(()=>!document.querySelector('.mp-ntf')&&!document.querySelector('.is-ntf'),null,{timeout:5000});

  await p.evaluate(()=>document.querySelector('.nav [data-view=shop]')?.click()||(location.hash='#shop'));
  await p.waitForFunction(()=>{const h=document.querySelector('.panel.on .chat-head');return !h||!h.getClientRects().length;},null,{timeout:8000});
  await p.evaluate(n=>MPNotifPop(n),gift);
  await p.waitForTimeout(400);
  assert.equal(await p.locator('.nav .mp-ntf, .nav.is-ntf, .is-ntf, .mp-ntf').count(),0,'no popup on the shop nav pill');

  await p.evaluate(()=>{const b=document.querySelector('.nav [data-view=forum]');if(b)b.click();else location.hash='#globe';});
  await p.waitForFunction(()=>{const h=document.querySelector('#forum.on .chat-head');return h&&h.getClientRects().length;},null,{timeout:10000});
  await p.evaluate(n=>MPNotifPop(n),gift);
  await p.locator('#forum.on .chat-head.is-ntf .mp-ntf').waitFor({timeout:4000});
  assert.equal(await p.locator('.nav.is-ntf, .nav .mp-ntf').count(),0,'globe popup stays off the nav pill');
  await c.close();await browser.close();
  console.log('notif host: chat and globe morph, shop nav skipped');
})().catch(e=>{console.error(e);process.exit(1);});
