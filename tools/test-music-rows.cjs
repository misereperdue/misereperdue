// Music result rows: Artist · Album, boxed E after the title, no loose "· E".
const pw=require(process.env.MP_PLAYWRIGHT||'playwright'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const ROOT=path.resolve(__dirname,'..'),ORIGIN='https://misereperdue.com';
const T={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp','.jpg':'image/jpeg','.mp4':'video/mp4','.woff2':'font/woff2','.json':'application/json','.ico':'image/x-icon'};
const url=id=>'https://music.apple.com/ca/album/example/100?i='+id;
const track=(id,title,artist)=>({trackId:id,trackName:title,artistName:artist,collectionName:'Blonde',collectionId:100,trackTimeMillis:307000,trackExplicitness:'explicit',trackViewUrl:url(id),artworkUrl100:ORIGIN+'/img/icon-192.png'});
(async()=>{
  const browser=await pw.chromium.launch({executablePath:process.env.MP_CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
  const c=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true,colorScheme:'dark',serviceWorkers:'block'});
  const user={username:'tester',member:true,owner:false,vip:true,points:40,hasRecovery:true,hasPassword:true};
  const messages=[{id:'m0',user:'other',text:'hey',ts:Date.now()-6e4}];
  await c.addInitScript(()=>{localStorage.setItem('chat_token','test-only');localStorage.setItem('theme','dark');sessionStorage.setItem('rc_later','1');});
  await c.routeWebSocket(/api\.misereperdue\.com/,s=>{setTimeout(()=>s.send(JSON.stringify({t:'hello',you:user,messages,online:2,caps:{}})),40);});
  await c.route('**/*',async r=>{
    const u=new URL(r.request().url()),H={'access-control-allow-origin':'*'};
    if(u.origin===ORIGIN){
      let pth=u.pathname==='/'?'/index.html':u.pathname;
      let f=path.join(ROOT,decodeURIComponent(pth));
      if(fs.existsSync(f)&&fs.statSync(f).isFile())return r.fulfill({path:f,contentType:T[path.extname(f)]||'application/octet-stream'});
      if(!path.extname(pth)){f=path.join(ROOT,decodeURIComponent(pth)+'.html');if(fs.existsSync(f)&&fs.statSync(f).isFile())return r.fulfill({path:f,contentType:'text/html'});}
      return r.fulfill({status:404,body:''});
    }
    if(u.hostname==='api.misereperdue.com'){
      if(r.request().method()==='OPTIONS')return r.fulfill({status:204,headers:H});
      let d={ok:true};
      if(u.pathname==='/api/me')d={ok:true,user};
      else if(u.pathname==='/api/messages')d={ok:true,messages,badges:{}};
      else if(u.pathname==='/api/ws-ticket')d={ticket:'t'};
      else if(u.pathname==='/api/music/search')d={ok:true,src:'itunes',tracks:[track(123,'Nights','Frank Ocean'),track(124,'Self Control','Frank Ocean')]};
      return r.fulfill({json:d,headers:H});
    }
    if(u.hostname==='itunes.apple.com')return r.fulfill({json:{results:[track(123,'Nights','Frank Ocean'),track(124,'Self Control','Frank Ocean')]},headers:H});
    return r.fulfill({status:204,body:''});
  });
  const p=await c.newPage();
  await p.goto(ORIGIN+'/#journal');
  await p.waitForSelector('[data-id="m0"]',{timeout:15000});
  await p.locator('.chat-plus').click();
  await p.locator('[data-act="music"]').click();
  const menu=p.getByRole('dialog',{name:'Share music'});
  await menu.waitFor();
  await menu.locator('.chat-music-q').fill('frank ocean nights');
  const row=menu.locator('.chat-music-track').first();
  await row.waitFor({timeout:8000});
  assert.equal((await row.locator('strong').innerText()).trim(),'Nights');
  assert.equal(await row.locator('.fm-e').count(),1,'boxed E after the title');
  assert.equal((await row.locator('.fm-e').innerText()).trim(),'E');
  const badge=await row.locator('.fm-e').evaluate(el=>{const s=getComputedStyle(el),t=el.closest('.chat-music-title');return{tag:el.tagName,box:s.boxShadow,radius:s.borderRadius,w:parseFloat(s.width),afterTitle:!!(t&&t.querySelector('strong')&&t.querySelector('.fm-e'))};});
  assert.ok(badge.afterTitle,'E sits in the title row');
  assert.ok(badge.w>=12&&badge.w<=18,'E is a small square, w='+badge.w);
  assert.ok(badge.shadow && badge.shadow!=='none' || parseFloat(badge.radius)>=2,'E is boxed');
  assert.match((await row.locator('.chat-music-artist').innerText()).trim(),/Frank Ocean\s*·\s*Blonde/);
  assert.ok(!(await row.innerText()).includes('· E'),'no loose · E');
  console.log('music rows: Artist · Album, boxed E after title');
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
