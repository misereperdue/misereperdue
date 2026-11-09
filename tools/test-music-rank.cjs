// Music search ranking against recorded Apple responses (tools/fixtures/music-rank.json).
// Replay is fully offline; MP_RECORD=1 refreshes the fixture from the real iTunes API.
// Pass 1: the Worker's Deezer search fails -> iTunes CA+US ranking. Pass 2: Deezer results from
// tools/fixtures/music-deezer.json (recorded from the Worker's musicSearch) lead, iTunes fills the rest.
const{chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const ROOT=path.resolve(__dirname,'..'),FIX=path.join(__dirname,'fixtures/music-rank.json'),REC=!!process.env.MP_RECORD;
const T={'.html':'text/html','.css':'text/css','.js':'application/javascript','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp','.json':'application/json','.woff2':'font/woff2'};
const KEEP=['trackId','artistId','trackName','artistName','collectionName','collectionId','trackExplicitness','trackViewUrl'];
const fold=s=>String(s).normalize('NFD').replace(/\p{M}+/gu,'').toLowerCase();
// [query, top-1 title (exact, '' = any), top-1 artist contains, top-N all by artist]
const CASES=[
 ['blinding lights','Blinding Lights','the weeknd'],
 ['beyoncé','','beyonce',3],
 ['nights frank','Nights','frank ocean'],
 ['celine dion','','celine dion',3],
 ['drake','','drake',3],
 ['hey jude','Hey Jude','the beatles'],
 ['espresso','Espresso','sabrina carpenter'],
 ['sza kill bill','Kill Bill','sza'],
 ['not like us','Not Like Us','kendrick lamar'],
 ['frank ocean nights','Nights','frank ocean'],
 ['birds of a','BIRDS OF A FEATHER','billie eilish'],
 ['pink pony','Pink Pony Club','chappell roan'],
 ['apt rose','APT.','rose'],
 ['blinding lights remix',/remix/i,''],
 ['future some more','','future',3],
 ['some more future','','future',3],
 ['drake hotline bling','Hotline Bling','drake'],
 ['the weeknd starboy',/^Starboy/,'the weeknd']
];
const DZ=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/music-deezer.json'),'utf8'));let dzOn=false;
const DZ_CASES=[['future some more','SOME MORE','future'],['some more future','SOME MORE','future'],['drake hotline bling','Hotline Bling','drake'],['the weeknd starboy',/^Starboy/,'the weeknd'],['blinding lights','Blinding Lights','the weeknd'],['beyoncé','','beyonce',2]];
(async()=>{const fix=REC?{}:JSON.parse(fs.readFileSync(FIX,'utf8')),miss=[];
 const browser=await chromium.launch({executablePath:process.env.MP_CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const c=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'});
 const user={username:'tester',points:4,hasRecovery:true,hasPassword:true,member:true};
 await c.addInitScript(()=>{localStorage.setItem('chat_token','test-only');sessionStorage.setItem('rc_later','1');});
 await c.routeWebSocket(/api\.misereperdue\.com/,s=>{setTimeout(()=>s.send(JSON.stringify({t:'hello',you:user,messages:[],online:1,caps:{}})),40);});
 await c.route('**/*',async r=>{const u=new URL(r.request().url());
  if(u.hostname==='itunes.apple.com'){
   if(u.searchParams.has('media'))return r.fulfill({status:301,headers:{location:'musics://itunes.apple.com'+u.pathname+u.search}});
   const k=u.pathname+u.search;
   if(REC){const res=await r.fetch();const j=await res.json();j.results=(j.results||[]).map(t=>Object.fromEntries(KEEP.filter(f=>f in t).map(f=>[f,t[f]])));j.results.forEach(t=>{if(t.trackViewUrl)t.trackViewUrl=t.trackViewUrl.replace(/\/album\/[^/]+\//,'/album/x/').split('&uo=')[0];});fix[k]=j.results;return r.fulfill({json:j});}
   if(!(k in fix))miss.push(k);return r.fulfill({json:{results:fix[k]||[]}});}
  if(u.hostname==='api.misereperdue.com'&&u.pathname==='/api/music/search'){const q=u.searchParams.get('q');return dzOn&&DZ[q]?r.fulfill({json:DZ[q]}):r.fulfill({status:503,json:{ok:false}});}
  if(u.hostname==='api.misereperdue.com'){let d={ok:true,messages:[]};if(u.pathname==='/api/me')d={ok:true,user};else if(u.pathname==='/api/ws-ticket')d={ticket:'t'};return r.fulfill({json:d});}
  if(u.hostname==='misereperdue.com'){const f=path.join(ROOT,u.pathname==='/'?'index.html':decodeURIComponent(u.pathname));if(fs.existsSync(f)&&fs.statSync(f).isFile())return r.fulfill({path:f,contentType:T[path.extname(f)]||'application/octet-stream'});return r.fulfill({status:404,body:''});}
  return r.abort();});
 const p=await c.newPage();await p.goto('https://misereperdue.com/#journal');await p.locator('.chat-plus').waitFor();await p.waitForTimeout(600);
 await p.locator('.chat-plus').click();await p.locator('[data-act="music"]').click();const q=p.locator('.chat-music-q');await q.waitFor();
 const table=[],fails=[];
 for(const[pass,list]of[[0,CASES],[1,DZ_CASES]])for(const[s,title,artist,n]of list){dzOn=!!pass;await q.fill('');await p.waitForTimeout(50);await q.fill(s);await q.press('Enter');
  await p.waitForFunction(()=>{const st=document.querySelector('.chat-music-status');return !document.querySelector('.chat-music-results[aria-busy]')&&st&&!/SEARCHING/.test(st.textContent);},null,{timeout:15000});
  const rows=await p.$$eval('.chat-music-track',bs=>bs.map(b=>[b.querySelector('strong').textContent,b.querySelector('.chat-music-artist').textContent]));
  table.push([(pass?'dz ':'')+s,rows.slice(0,3).map(r=>r.join(' — '))]);
  const [t0,a0]=rows[0]||['',''];
  const ok=(!title||(title instanceof RegExp?title.test(t0):t0===title))&&fold(a0).includes(artist)&&rows.slice(0,n||1).every(r=>fold(r[1]).includes(artist));
  if(!ok)fails.push((pass?'deezer ':'')+s+' -> '+rows.slice(0,3).map(r=>r.join(' — ')).join(' | '));}
 await browser.close();
 if(REC){fs.writeFileSync(FIX,JSON.stringify(fix));console.log('recorded',Object.keys(fix).length,'responses');}
 if(process.env.MP_TABLE)for(const[s,r]of table)console.log(s.padEnd(22),r.join(' | '));
 assert.deepEqual(miss,[],'unrecorded iTunes requests (re-run with MP_RECORD=1)');
 assert.deepEqual(fails,[],'ranking');
 console.log(JSON.stringify({passed:CASES.length+' iTunes-ranked + '+DZ_CASES.length+' Deezer-led queries'}));})().catch(e=>{console.error(e.message);process.exit(1);});
