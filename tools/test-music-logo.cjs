// Apple Music logo transparency, footer loop and idle EQ. APIs/WebSockets mocked; no real writes.
// MP_BROWSER=webkit|chromium (default chromium), MP_PLAYWRIGHT=<module path>, MP_SHEET=<png> renders a review sheet.
const pw=require(process.env.MP_PLAYWRIGHT||'playwright'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const ROOT=path.resolve(__dirname,'..'),ORIGIN='https://misereperdue.com',OUT=process.env.MP_TEST_ARTIFACTS||'/tmp/mp-music-logo',KIND=process.env.MP_BROWSER||'chromium';fs.mkdirSync(OUT,{recursive:true});
const TYPES={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.mp4':'video/mp4','.webp':'image/webp','.json':'application/json'};
// Compare the element with and without its keyed canvas at points the canvas marks fully transparent.
async function transparency(page,host,canvasSel){for(let attempt=0;;attempt++){try{return await transparencyOnce(page,host,canvasSel);}catch(e){if(attempt>=2||!/changed|canvas moved/.test(e.message))throw e;await page.waitForTimeout(300);}}}
async function transparencyOnce(page,host,canvasSel){const sig=()=>host.evaluate((el,sel)=>{const c=el.querySelector(sel),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let h=0;for(let i=3;i<d.length;i+=16)h=(h*31+d[i])|0;return h;},canvasSel);const before=await sig();
  const pts=await host.evaluate((el,sel)=>{const c=el.querySelector(sel),r=c.getBoundingClientRect(),ctx=c.getContext('2d'),d=ctx.getImageData(0,0,c.width,c.height).data,k=Math.min(r.width/c.width,r.height/c.height),ox=(r.width-c.width*k)/2,oy=(r.height-c.height*k)/2,sx=1/k,sy=1/k,clear=[],ink=[],cx=v=>Math.max(0,Math.min(c.width-1,Math.floor((v-ox)*sx))),cy=v=>Math.max(0,Math.min(c.height-1,Math.floor((v-oy)*sy)));
    for(let y=1;y<r.height-1;y++)for(let x=1;x<r.width-1;x++){let max=0;for(let yy=cy(y-1);yy<=cy(y+1);yy++)for(let xx=cx(x-1);xx<=cx(x+1);xx++)max=Math.max(max,d[(yy*c.width+xx)*4+3]);
      const a=d[(cy(y)*c.width+cx(x))*4+3];if(max<=3)clear.push([x,y]);else if(a>230)ink.push([x,y]);}
    return{dbg:[c.width,c.height,r.width,r.height,k,ox,oy,getComputedStyle(c).objectFit,c._mpLast&&c._mpLast.tagName,clear.length,ink.length,d.length],clear,ink,box:{x:r.x,y:r.y,width:r.width,height:r.height},corner:[0,c.width-1,(c.height-1)*c.width,c.height*c.width-1].map(i=>d[i*4+3])};},canvasSel);
  assert(pts.clear.length>40,'no transparent area found');assert(pts.ink.length>10,'keyed logo has no visible pixels');assert.deepEqual(pts.corner,[0,0,0,0],'canvas corners are not transparent');
  const {PNG}=require('./png-lite.cjs');const clip={x:Math.floor(pts.box.x)-4,y:Math.floor(pts.box.y)-4,width:Math.ceil(pts.box.width)+8,height:Math.ceil(pts.box.height)+8};
  const bufA=await page.screenshot({clip,animations:'disabled'}),a=PNG(bufA);await host.evaluate((el,sel)=>{el.querySelector(sel).style.visibility='hidden';},canvasSel);
  const bufB=await page.screenshot({clip,animations:'disabled'}),b=PNG(bufB);await host.evaluate((el,sel)=>{el.querySelector(sel).style.visibility='';},canvasSel);
  if(before!==await sig())throw new Error('canvas moved during capture');const s=a.width/clip.width;let worst=0,shown=0;const at=(img,x,y)=>{const i=(Math.round((y-clip.y)*s)*img.width+Math.round((x-clip.x)*s))*4;return[img.data[i],img.data[i+1],img.data[i+2]];};
  for(const[x,y]of pts.clear){const p=at(a,pts.box.x+x,pts.box.y+y),q=at(b,pts.box.x+x,pts.box.y+y);worst=Math.max(worst,...p.map((v,i)=>Math.abs(v-q[i])));}
  for(const[x,y]of pts.ink){const p=at(a,pts.box.x+x,pts.box.y+y),q=at(b,pts.box.x+x,pts.box.y+y);if(Math.max(...p.map((v,i)=>Math.abs(v-q[i])))>40)shown++;}
  if(worst>4){fs.writeFileSync(OUT+'/fail.json',JSON.stringify({dbg:pts.dbg,sample:pts.clear.filter((_,i)=>i%97==0).slice(0,30),clip,box:pts.box,scale:s,aw:a.width}));fs.writeFileSync(OUT+'/failA.png',bufA);fs.writeFileSync(OUT+'/failB.png',bufB);}
  assert(worst<=4,`background changed by ${worst} where the logo is transparent (rectangle visible)`);assert(shown>pts.ink.length*.5,'keyed logo is not drawn');
  return{clearPoints:pts.clear.length,worstDiff:worst};
}
(async()=>{const browser=await pw[KIND].launch(KIND==='chromium'?{executablePath:process.env.MP_CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']}:{headless:true});const shots=[];
for(const[theme,reduced]of[['dark',false],['light',false],['light',true]]){
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:KIND==='chromium',hasTouch:true,colorScheme:theme,reducedMotion:reduced?'reduce':'no-preference',serviceWorkers:'block'});
 const url=id=>`https://music.apple.com/ca/album/example/100?i=${id}`,nights={trackId:123,trackName:'Nights',artistName:'Frank Ocean',collectionName:'Blonde',collectionId:100,trackTimeMillis:307000,trackViewUrl:url(123),artworkUrl100:ORIGIN+'/img/icon-192.png'};
 const user={username:'tester',member:true,owner:false,points:4,hasRecovery:true,hasPassword:true},messages=[{id:'incoming',user:'other',text:url(123),embed:{url:url(123),title:'Nights',provider:'Apple Music'},ts:Date.now()-2000}],errors=[];
 await context.addInitScript(()=>{localStorage.setItem('chat_token','test-only');sessionStorage.setItem('rc_later','1');});
 await context.routeWebSocket(/api\.misereperdue\.com/,socket=>{setTimeout(()=>socket.send(JSON.stringify({t:'hello',you:user,messages,online:1,caps:{private:1,poll:1}})),40);});
 await context.route('**/*',async route=>{const u=new URL(route.request().url());
  if(u.hostname==='itunes.apple.com'){await route.fulfill({json:{results:[nights]}});return;}
  if(u.hostname==='api.misereperdue.com'){let data={ok:true};if(u.pathname==='/api/me')data={ok:true,user};else if(u.pathname==='/api/messages')data={ok:true,messages,badges:{}};else if(u.pathname==='/api/ws-ticket')data={ticket:'test'};else if(u.pathname==='/api/online')data={ok:true,users:[user],count:1};else if(u.pathname==='/api/send')throw new Error('send attempted');
   else if(u.pathname.startsWith('/api/avatarimg/')){await route.fulfill({path:ROOT+'/img/icon-192.png',contentType:'image/png'});return;}
   await route.fulfill({json:data,headers:{'access-control-allow-origin':'*'}});return;}
  if(u.origin===ORIGIN){const file=path.join(ROOT,u.pathname==='/'?'index.html':decodeURIComponent(u.pathname));if(fs.existsSync(file)&&fs.statSync(file).isFile()){await route.fulfill({path:file,contentType:TYPES[path.extname(file)]||'application/octet-stream'});return;}}
  await route.fulfill({json:{data:{products:{edges:[]}}}});
 });
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(ORIGIN+'/#journal');
 const card=page.locator('[data-id="incoming"] .chat-np:not(.is-loading)');await card.waitFor();const mark=card.locator('.chat-np-am-mark');await page.waitForFunction(()=>document.querySelector('.chat-np-am-mark.is-keyed'));
 const styles=await card.locator('.chat-np-am').evaluate(el=>{const out=[];for(let n=el;n&&!n.classList.contains('chat-np');n=n.parentElement){const s=getComputedStyle(n);out.push([n.className,s.mixBlendMode,s.backgroundImage,s.backgroundColor,s.boxShadow,s.backdropFilter||s.webkitBackdropFilter||'none']);}for(const n of el.querySelectorAll('*')){const s=getComputedStyle(n);out.push([n.className,s.mixBlendMode,s.backgroundImage,s.backgroundColor,s.boxShadow,s.backdropFilter||s.webkitBackdropFilter||'none']);}return out;});
 for(const[name,blend,image,color,shadow,backdrop]of styles){assert.equal(blend,'normal',name+' blend');assert.equal(image,'none',name+' background');assert(/rgba\(0, 0, 0, 0\)|transparent/.test(color),name+' background colour '+color);assert.equal(shadow,'none',name+' shadow');assert(/none/.test(backdrop),name+' backdrop');}
 // Hold the logo state with the keyed still to inspect it deterministically.
 await card.evaluate(el=>el.classList.add('show-am'));await page.waitForTimeout(700);const embed=reduced?'reduced motion keeps text (no logo state)':await transparency(page,mark,'.chat-np-official-key');
 await card.scrollIntoViewIfNeeded();const cardBox=await card.boundingBox();const embedShot=OUT+`/embed-${theme}${reduced?'-reduced':''}.png`;await page.screenshot({path:embedShot,clip:{x:cardBox.x-6,y:cardBox.y-6,width:cardBox.width+12,height:cardBox.height+12}});
 if(!reduced){await card.evaluate(el=>el.classList.remove('show-am'));
  // Real cycle: the official film plays into the keyed canvas.
  await page.waitForFunction(()=>{const v=document.querySelector('.chat-np-official');return v&&v.classList.contains('is-playing');},null,{timeout:12000});
  await page.waitForTimeout(400);const live=await mark.evaluate(el=>{const c=el.querySelector('canvas');const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let clear=0;for(let i=3;i<d.length;i+=4)if(!d[i])clear++;return{fromVideo:c._mpLast===el.querySelector('video'),clear:clear/(d.length/4)};});
  assert(live.fromVideo,'video frames are not keyed');assert(live.clear>.4,'video frame background is not transparent');}
 // Picker footer. Remove the cycling embed so the glass behind the footer stays still.
 await card.evaluate(el=>el.remove());
 await page.locator('.chat-plus').click();await page.locator('[data-act="music"]').click();const menu=page.getByRole('dialog',{name:'Share music'});await menu.waitFor();await page.waitForTimeout(600);
 const orb=menu.locator('.chat-music-orb'),film=menu.locator('.chat-music-official');await page.waitForFunction(()=>document.querySelector('.chat-music-orb.is-keyed'));
 const wave=await menu.locator('.chat-music-idle-wave i').evaluateAll(bars=>bars.map(b=>({name:getComputedStyle(b).animationName,count:b.getAnimations().length})));
 if(reduced){assert(wave.every(w=>w.name==='none'&&w.count===0),'reduced motion waveform animates');await page.waitForTimeout(900);assert.equal(await film.evaluate(v=>v.paused),true,'reduced motion film plays');}
 else{assert(wave.every(w=>w.name==='chat-music-eq'&&w.count===1),'waveform is static');
  const h1=await menu.locator('.chat-music-idle-wave i').evaluateAll(b=>b.map(x=>x.getBoundingClientRect().height));await page.waitForTimeout(350);const h2=await menu.locator('.chat-music-idle-wave i').evaluateAll(b=>b.map(x=>x.getBoundingClientRect().height));assert(h1.some((h,i)=>Math.abs(h-h2[i])>1),'waveform bars did not move');
  assert.equal(await film.evaluate(v=>v.loop),true);await film.evaluate(v=>{v.dataset.identity='original';});
  await page.waitForTimeout(1500);const loop=await film.evaluate(v=>({loop:v.loop,paused:v.paused,ended:v.ended}));assert(loop.loop&&!loop.paused&&!loop.ended,'footer icon is not looping '+JSON.stringify(loop));
  assert.equal(await orb.evaluate(el=>el.querySelector('canvas')._mpLast===el.querySelector('video')),true,'footer film is not keyed');
  await menu.getByRole('searchbox').fill('n');await page.waitForTimeout(400);await menu.getByRole('searchbox').fill('fr');await page.waitForTimeout(400);assert.equal(await film.getAttribute('data-identity'),'original','typing restarted the footer');assert.equal(await film.evaluate(v=>v.paused),false);
  await menu.getByRole('searchbox').fill('');await page.waitForTimeout(500);}
 await film.evaluate(v=>v.pause());await page.waitForTimeout(200);await film.evaluate(v=>{v.currentTime=.62;});await page.waitForTimeout(500);const footerState=await orb.evaluate(el=>{const c=el.querySelector('canvas'),v=el.querySelector('video');return{ink:c._mpInk,color:getComputedStyle(c).color,last:c._mpLast&&c._mpLast.tagName,t:v.currentTime,ready:v.readyState};});const footer=await transparency(page,orb,'.chat-music-key');if(!reduced)await film.evaluate(v=>v.play());const ob=await orb.boundingBox(),cb=await menu.locator('.chat-music-brand-copy').boundingBox(),fb={x:ob.x,y:Math.min(ob.y,cb.y),width:cb.x+cb.width-ob.x,height:Math.max(ob.height,cb.height)};const footerShot=OUT+`/footer-${theme}${reduced?'-reduced':''}.png`;await page.screenshot({path:footerShot,clip:{x:fb.x-12,y:fb.y-10,width:fb.width+24,height:fb.height+20}});
 if(!reduced){const handle=await film.elementHandle();await page.keyboard.press('Escape');await page.waitForTimeout(500);assert.equal(await handle.evaluate(v=>v.paused),true,'footer keeps playing after close');}
 assert.deepEqual(errors,[]);shots.push({theme,reduced,footerShot,embedShot});console.log(JSON.stringify({browser:KIND,theme,reduced,embed,footer,passed:'no blend/backdrop/background, transparent keyed logo, '+(reduced?'static reduced motion':'video keyed, footer loop, no restart while typing, paused on close, live EQ')}));
 await context.close();}
if(process.env.MP_SHEET){const ctx=await browser.newContext({viewport:{width:780,height:400},deviceScaleFactor:1});const p=await ctx.newPage();const img=f=>'data:image/png;base64,'+fs.readFileSync(f).toString('base64');const main=shots.filter(s=>!s.reduced);
 await p.setContent(`<body style="margin:0;padding:16px;background:#777;font:600 14px -apple-system,system-ui,sans-serif;color:#fff"><h3 style="margin:0 0 10px">Apple Music logo: keyed transparent (${KIND}, 390×844 @3x)</h3>${main.map(s=>`<div style="display:flex;gap:12px;align-items:flex-start;margin-bottom:14px"><div style="width:120px">${s.theme}</div><div><div>Picker footer</div><img style="width:300px" src="${img(s.footerShot)}"></div><div><div>Chat embed, logo state</div><img style="width:300px" src="${img(s.embedShot)}"></div></div>`).join('')}</body>`);await p.waitForTimeout(200);fs.mkdirSync(path.dirname(process.env.MP_SHEET),{recursive:true});await p.screenshot({path:process.env.MP_SHEET,fullPage:true});await ctx.close();}
await browser.close();})().catch(error=>{console.error(error);process.exit(1)});
