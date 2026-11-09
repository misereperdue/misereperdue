// Now-listening text <-> Apple Music mark crossfade: ~510ms, cubic-bezier(.4,0,.2,1), overlapped (no empty dip),
// 2px slide, opacity/transform only, will-change only while fading, prewarmed keyed frame. APIs mocked.
const pw=require(process.env.MP_PLAYWRIGHT||'playwright'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const ROOT=path.resolve(__dirname,'..'),ORIGIN='https://misereperdue.com',OUT=process.env.MP_TEST_ARTIFACTS||'/tmp/mp-np-crossfade',KIND=process.env.MP_BROWSER||'chromium';fs.mkdirSync(OUT,{recursive:true});
const TYPES={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.mp4':'video/mp4','.webp':'image/webp','.json':'application/json'};
(async()=>{const browser=await pw[KIND].launch(KIND==='chromium'?{executablePath:process.env.MP_CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']}:{});
for(const theme of ['dark','light']){
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,colorScheme:theme,serviceWorkers:'block'});
 const url=id=>`https://music.apple.com/ca/album/example/100?i=${id}`,nights={trackId:123,trackName:'Nights',artistName:'Frank Ocean',collectionName:'Blonde',collectionId:100,trackTimeMillis:307000,trackViewUrl:url(123),artworkUrl100:ORIGIN+'/img/icon-192.png'};
 const user={username:'tester',points:4,hasRecovery:true,hasPassword:true},messages=[{id:'incoming',user:'other',text:url(123),embed:{url:url(123),title:'Nights',provider:'Apple Music'},ts:Date.now()-2000}],errors=[];
 await context.addInitScript(()=>{localStorage.setItem('chat_token','test-only');sessionStorage.setItem('rc_later','1');});
 await context.routeWebSocket(/api\.misereperdue\.com/,s=>{setTimeout(()=>s.send(JSON.stringify({t:'hello',you:user,messages,online:1,caps:{}})),40);});
 await context.route('**/*',async route=>{const u=new URL(route.request().url());
  if(u.hostname==='itunes.apple.com')return route.fulfill({json:{results:[nights]}});
  if(u.hostname==='api.misereperdue.com'){if(u.pathname.startsWith('/api/avatarimg/'))return route.fulfill({path:ROOT+'/img/icon-192.png',contentType:'image/png'});let d={ok:true};if(u.pathname==='/api/me')d={ok:true,user};else if(u.pathname==='/api/messages')d={ok:true,messages,badges:{}};else if(u.pathname==='/api/ws-ticket')d={ticket:'t'};return route.fulfill({json:d,headers:{'access-control-allow-origin':'*'}});}
  if(u.origin===ORIGIN){const f=path.join(ROOT,u.pathname==='/'?'index.html':decodeURIComponent(u.pathname));if(fs.existsSync(f)&&fs.statSync(f).isFile())return route.fulfill({path:f,contentType:TYPES[path.extname(f)]||'application/octet-stream'});}
  return route.fulfill({json:{data:{products:{edges:[]}}}});});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(ORIGIN+'/#journal');
 const card=page.locator('[data-id="incoming"] .chat-np:not(.is-loading)');await card.waitFor();await page.locator('[data-id="incoming"] .chat-np-am').waitFor({state:'attached'});
 const css=await card.evaluate(c=>{const g=s=>getComputedStyle(c.querySelector(s));const i=g('.chat-np-info'),a=g('.chat-np-am');return{prop:i.transitionProperty,dur:i.transitionDuration,ease:i.transitionTimingFunction,aprop:a.transitionProperty,aease:a.transitionTimingFunction,slide:a.transform,will:[i.willChange,a.willChange]};});
 assert.equal(css.prop,'opacity, transform');assert.equal(css.aprop,'opacity, transform');assert.equal(css.dur,'0.45s, 0.45s');
 assert.match(css.ease,/cubic-bezier\(0\.4, 0, 0\.2, 1\)/);assert.match(css.aease,/cubic-bezier\(0\.4, 0, 0\.2, 1\)/);
 assert.match(css.slide,/matrix\(1, 0, 0, 1, 0, 2\)/,'2px slide');assert.deepEqual(css.will,['auto','auto'],'will-change at rest');
 // Real flip (timer is 5s + stagger): sample both opacities through the fade; their sum must not dip.
 await page.waitForFunction(()=>document.querySelector('[data-id="incoming"] .chat-np.is-xf'),null,{timeout:12000});
 const t0=Date.now(),samples=[];let shot=0;
 while(Date.now()-t0<700){const s=await card.evaluate(c=>[+getComputedStyle(c.querySelector('.chat-np-info')).opacity,+getComputedStyle(c.querySelector('.chat-np-am')).opacity,c.classList.contains('show-am'),c.classList.contains('is-xf'),getComputedStyle(c.querySelector('.chat-np-am')).willChange]);samples.push([Date.now()-t0,...s]);
  if(theme==='dark'&&shot<3&&Date.now()-t0>[0,170,560][shot]){await card.screenshot({path:`${OUT}/xf-${shot}.png`});shot++;}}
 const during=samples.filter(s=>s[3]);assert(during.length,'no crossfade observed');assert(during.some(s=>/opacity/.test(s[5])),'will-change not applied during the fade');
 const minSum=Math.min(...samples.map(s=>s[1]+s[2]));assert(minSum>0.8,'crossfade fades through empty: '+minSum.toFixed(2));
 const last=samples[samples.length-1];assert(last[3]&&!last[4]&&last[2]>0.99,'crossfade not finished by ~560ms '+JSON.stringify(last));assert.equal(last[5],'auto','will-change left on');
 assert.equal(await card.evaluate(c=>c.querySelector('.chat-np-am-mark').classList.contains('is-keyed')),true,'keyed frame not ready at fade-in');
 assert.deepEqual(errors,[]);console.log(JSON.stringify({kind:KIND,theme,minOpacitySum:+minSum.toFixed(2),passed:'510ms overlapped crossfade, eased, 2px, transient will-change, keyed prewarm'}));await context.close();}
await browser.close();})().catch(e=>{console.error(e);process.exit(1)});
