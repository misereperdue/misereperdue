// Shared divider style: every divider must match the main/chat + menu divider (.chat-pmenu-sep).
// Static fixture page with the real site.css; no network. Runs in WebKit (iPhone) and Chromium.
// Run: MP_PLAYWRIGHT=<playwright-core> node tools/test-dividers.cjs
const pw=require(process.env.MP_PLAYWRIGHT||'playwright'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const ROOT=path.resolve(__dirname,'..'),OUT=process.env.MP_TEST_ARTIFACTS||'/tmp/mp-dividers';fs.mkdirSync(OUT,{recursive:true});
const CSS=fs.readFileSync(path.join(ROOT,'css/site.css'),'utf8');
// [label, markup, element selector, kind]
const T=[
 ['Shop product actions','<div class="actions">Add to cart</div>','.actions','top'],
 ['Product comment','<div class="comment">Nice hoodie</div>','.comment','top'],
 ['Cart grand total','<div id="cart-total"><div class="trow grand">Total $40</div></div>','#cart-total .trow.grand','top'],
 ['Orders footer','<div class="ord-foot">Order #12</div>','.ord-foot','top'],
 ['Dashboard rows','<div class="dash-box"><div class="dash-urow">Row A</div><div class="dash-urow">Row B</div></div>','.dash-urow + .dash-urow','top'],
 ['Profile full button','<button class="mp-pb-full">View full profile</button>','.mp-pb-full','top'],
 ['Music picker footer','<div class="chat-music-footer">Powered by Deezer</div>','.chat-music-footer','top'],
 ['Music branding','<div class="chat-music-branding">Deezer</div>','.chat-music-branding','top'],
 ['Music now-playing pin','<div style="position:relative;height:30px"><div class="chat-gp-pin" style="display:block">Pinned</div></div>','.chat-gp-pin','top'],
 ['Globe signature','<div class="forum-sig">— dc</div>','.forum-sig','top'],
 ['Globe toolbar','<div class="forum-toolbar">B I U</div>','.forum-toolbar','bottom'],
 ['Globe rich toolbar keeps its card border','<div class="forum-toolbar mp-tbar">B I U</div>','.forum-toolbar.mp-tbar','keep'],
 ['Globe embed bar','<div class="forum-embedbar">link</div>','.forum-embedbar','bottom'],
 ['Poll option (q3)','<div class="chat-poll-q3"><div class="chat-poll-opt">Option A</div><div class="chat-poll-opt">Option B</div></div>','.chat-poll-opt:first-child','bottom'],
 ['Music result list','<div class="chat-gp-row"><div class="chat-gp-body" style="position:relative">Song A</div></div><div class="chat-gp-row"><div class="chat-gp-body" style="position:relative">Song B</div></div>','.chat-gp-row + .chat-gp-row .chat-gp-body','pseudo'],
 ['Recovery "or"','<div class="rc-or" style="display:flex;align-items:center;gap:8px">or</div>','.rc-or','or'],
 ['Globe toolbar separator','<div class="mp-tbar"><span class="mp-tb-sep"></span></div>','.mp-tb-sep','v'],
 ['Reaction divider','<div style="display:flex;height:30px"><span class="chat-react-divider"></span></div>','.chat-react-divider','v'],
];
const page=(theme)=>`<!doctype html><html data-theme="${theme}"><head><meta name="viewport" content="width=device-width"><style>${CSS}</style>
<style>body{margin:0;padding:12px;min-height:100vh;background:${theme==='dark'?'#0a1030':'#eef1f7'}}.fx{position:relative;margin:0 0 10px;padding:6px 0}.fx>i{display:block;font:600 11px system-ui;color:var(--muted);margin:0 0 4px 12px;font-style:normal}</style></head><body>
<div class="fx"><i>Reference: chat + menu divider</i><div class="chat-plus-menu is-in" style="position:relative;bottom:auto;opacity:1;transform:none"><div class="chat-pmenu-row">Music</div><div class="chat-pmenu-sep" id="ref"></div><div class="chat-pmenu-row">Misery FM</div></div></div>
${T.map((t,i)=>`<div class="fx" id="fx${i}"><i>${t[0]}</i>${t[1]}</div>`).join('')}</body></html>`;
(async()=>{
 const res=[];
 for(const eng of ['webkit','chromium']){
  const b=await pw[eng].launch(eng==='chromium'?{executablePath:process.env.MP_CHROMIUM_PATH||'/usr/bin/google-chrome',args:['--no-sandbox']}:{});
  for(const theme of ['dark','light']){
   const c=await b.newContext(eng==='webkit'?{...pw.devices['iPhone 14'],colorScheme:theme}:{viewport:{width:390,height:844},colorScheme:theme});
   const p=await c.newPage();await p.setContent(page(theme));
   const r=await p.evaluate(T=>{
    const cs=(e,ps)=>getComputedStyle(e,ps||null),ref=document.getElementById('ref'),rc=cs(ref);
    // resolve the reference colour token on a probe so comparisons are colour-exact
    const probe=document.createElement('div');probe.style.color='color-mix(in srgb,var(--ink) 16%,transparent)';document.body.appendChild(probe);const want=cs(probe).color;
    const out={ref:{h:rc.height,bg:rc.backgroundImage},want,items:[]};
    T.forEach((t,i)=>{const e=document.querySelector('#fx'+i+' '+t[2]);if(!e){out.items.push({l:t[0],miss:1});return;}const s=cs(e);let o={l:t[0],k:t[3]};
     if(t[3]==='top'||t[3]==='bottom'){const side=t[3]==='top'?'Top':'Bottom';o.w=s['border'+side+'Width'];o.st=s['border'+side+'Style'];o.img=s.borderImageSource;o.slice=s.borderImageSlice;}
     else if(t[3]==='pseudo'){const q=cs(e,'::before');o.h=q.height;o.img=q.backgroundImage;}
     else if(t[3]==='or'){const q=cs(e,'::before'),a=cs(e,'::after');o.h=q.height;o.img=q.backgroundImage+' | '+a.backgroundImage;}
     else if(t[3]==='keep'){o.img=s.borderImageSource;o.lw=s.borderLeftWidth;}
     else {o.w=s.width;o.img=s.backgroundImage;}
     out.items.push(o);});
    return out;},T);
   assert.equal(r.ref.h,'1px');assert.match(r.ref.bg,/linear-gradient/);
   const col=r.want.replace(/\s/g,'');
   for(const o of r.items){
    assert(!o.miss,'missing '+o.l);
    if(o.k==='keep'){assert.equal(o.img,'none',o.l+' '+JSON.stringify(o));continue;}
    assert.match(o.img,/linear-gradient/,o.l+' not gradient: '+o.img);
    assert(o.img.replace(/\s/g,'').includes(col)||o.img.replace(/\s/g,'').includes(col.replace('color(srgb','color(srgb')),o.l+' colour '+o.img+' want '+col);
    if(o.k==='top'||o.k==='bottom'){assert.equal(o.w,'1px',o.l+' width');assert.equal(o.st,'solid',o.l);assert.match(o.slice,/^1/,o.l+' slice');}
    if(o.k==='pseudo'||o.k==='or')assert.equal(o.h,'1px',o.l);
    if(o.k==='v')assert.equal(o.w,'1px',o.l);
   }
   // the reference itself must use the very same colour
   assert(r.ref.bg.replace(/\s/g,'').includes(col),'ref colour '+r.ref.bg);
   await p.screenshot({path:`${OUT}/dividers-${eng}-${theme}.png`,fullPage:true});
   res.push({eng,theme,checked:r.items.length});await c.close();
  }
  await b.close();
 }
 console.log(JSON.stringify(res));console.log('dividers ok');
})().catch(e=>{console.error(e);process.exit(1);});
