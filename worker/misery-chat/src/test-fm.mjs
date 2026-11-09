// Node logic test for the Misery FM Worker excerpts (mocked R2 + DO storage, fake clock). node test-fm.mjs
import fs from 'fs';import assert from 'assert/strict';
const rd=f=>fs.readFileSync(new URL('./'+f,import.meta.url),'utf8'),d=rd('fm_do.js');
const methods=d.slice(d.indexOf('  /* ---------- Misery FM ---------- */'),d.lastIndexOf('\n}'));
const top=rd('fm.js');
const json=(x,st)=>new Response(JSON.stringify(x),{status:st||200,headers:{'Content-Type':'application/json'}}),err=(m,st)=>json({ok:false,error:m},st||400);
const objs=new Map();
const bucket={put:async(k,b)=>{objs.set(k,new Uint8Array(b))},delete:async k=>objs.delete(k),get:async k=>objs.has(k)?{size:objs.get(k).length,body:objs.get(k),httpEtag:'"e"',writeHttpMetadata(){}}:null};
let NOW=1e12;const RD=Date;globalThis.Date=class extends RD{static now(){return NOW}};
const C=new Function('json','err','bucket','WebSocketPair',top+'\nreturn class R{constructor(){this.state={storage:{m:new Map(),get:async k=>this.state.storage.m.get(k),put:async(k,v)=>this.state.storage.m.set(k,structuredClone(v)),setAlarm:async t=>{this.alarmAt=t},deleteAlarm:async()=>{this.alarmAt=null}}};this.env={FM_BUCKET:bucket};this.sent=[];this.user=null;this.dev="d1"}fmCast(o){this.sent.push(o)}async bearerUser(){return this.user}deviceIdFromReq(){return this.dev}clientIp(){return "1.1.1.1"}\n'+methods.replace(/\n  fmCast\(obj\) \{[\s\S]*?\n  \}\n/,'\n')+'};')(json,err,bucket,null);
const r=new C();
const call=async(p,init={})=>{const q=new Request('https://x'+p,init);const res=await r.fmRoute(q,p.split('?')[0]);return [res.status,await res.json()];};
const ctl=b=>call('/api/fm/control',{method:'POST',body:JSON.stringify(b)});
const up=(q,type='audio/mpeg')=>call('/api/fm/upload?'+q,{method:'POST',headers:{'Content-Type':type},body:new Uint8Array(100)});
const st=async()=>(await call('/api/fm/state'))[1].fm;
let s,b;
// owner gating
[s]=await up('title=A');assert.equal(s,403);[s]=await ctl({action:'live'});assert.equal(s,403);
r.user={username:'dc',owner:true};
[s]=await up('title=A','text/plain');assert.equal(s,415);
[s,b]=await up('title=One&artist=dc&album=LP&year=2024%20x&genre=Rap&explicit=1&dur=10');assert.equal(s,200);const A=b.id;
assert.deepEqual(['One','dc','LP','2024','Rap',true],['title','artist','album','year','genre','explicit'].map(k=>b.fm.list[0][k]));
const B=(await up('title=Two&dur=20','audio/mp4'))[1].id,Cc=(await up('title=Three&dur=30'))[1].id,D=(await up('title=Four&dur=40'))[1].id;
[s]=await ctl({action:'live'});assert.equal(s,200);let f=await st();assert(f.live&&f.idx===0);assert.deepEqual(f.upNext.slice(0,3),[B,Cc,D]);
assert.equal(r.alarmAt,NOW+10e3+250);
// pause / resume keep the position
NOW+=4e3;await ctl({action:'pause'});f=await st();assert(f.paused&&Math.abs(f.pos-4)<.01);assert.equal(r.alarmAt,null);
NOW+=60e3;f=await st();assert.equal(f.idx,0,'paused station must not advance');
await ctl({action:'resume'});f=await st();assert(!f.paused&&f.startedAt===NOW-4e3);
// seek, restart, skip, prev
await ctl({action:'seek',pos:8});f=await st();assert.equal(f.startedAt,NOW-8e3);
await ctl({action:'restart'});f=await st();assert.equal(f.startedAt,NOW);
await ctl({action:'skip'});f=await st();assert.equal(f.list[f.idx].id,B);assert.equal(f.hist[0].id,A);
NOW+=1e3;await ctl({action:'prev'});f=await st();assert.equal(f.list[f.idx].id,A,'prev within 3s goes back');assert.deepEqual(f.upNext[0],B,'prev re-queues the current one');
// auto-advance via alarm; history; stats
NOW+=10.1e3;await r.alarm();f=await st();assert.equal(f.list[f.idx].id,B);assert(f.stats.played>=2);
// play next queue wins over order
await ctl({action:'next',id:D});f=await st();assert.equal(f.upNext[0],D);
NOW+=20.1e3;await r.alarm();f=await st();assert.equal(f.list[f.idx].id,D);assert.equal(f.q.length,0);
// repeat one / off
await ctl({action:'repeat',mode:'one'});f=await st();assert.equal(f.upNext[0],D);
NOW+=40.1e3;await r.alarm();f=await st();assert.equal(f.list[f.idx].id,D);
await ctl({action:'repeat',mode:'off'});f=await st();assert.deepEqual(f.upNext,[]);
NOW+=40.1e3;await r.alarm();f=await st();assert.equal(f.live,false,'repeat off ends after the last song');
// shuffle: permutation of all ids, upNext from it
await ctl({action:'repeat',mode:'all'});await ctl({action:'live'});await ctl({action:'shuffle',on:true});f=await st();
assert(f.shuffle&&f.upNext.length===6&&new Set(f.upNext.slice(0,3)).size===3&&!f.upNext.slice(0,3).includes(f.list[f.idx].id));
const n1=f.upNext[0];NOW+=f.list[f.idx].dur*1e3+100;await r.alarm();f=await st();assert.equal(f.list[f.idx].id,n1);
await ctl({action:'shuffle',on:false});
// move (drag to index), edit, art, wave, remove deletes files
await ctl({action:'move',id:D,to:0});f=await st();assert.equal(f.list[0].id,D);
[s]=await ctl({action:'edit',id:B,title:'Two (edit)',artist:'X',album:'Al',year:'1999',genre:'Pop',notes:'hi',explicit:false});f=await st();
const tb=f.list.find(t=>t.id===B);assert.deepEqual([tb.title,tb.artist,tb.album,tb.year,tb.genre,tb.notes,tb.explicit],['Two (edit)','X','Al','1999','Pop','hi',false]);
[s]=await call('/api/fm/art?id='+B,{method:'POST',headers:{'Content-Type':'image/gif'},body:new Uint8Array(5)});assert.equal(s,415);
[s,b]=await call('/api/fm/art?id='+B,{method:'POST',headers:{'Content-Type':'image/jpeg'},body:new Uint8Array(50)});assert.equal(s,200);const art1=b.fm.list.find(t=>t.id===B).art;assert(objs.has('a/'+art1));
[s,b]=await call('/api/fm/art?id='+B,{method:'POST',headers:{'Content-Type':'image/png'},body:new Uint8Array(50)});const art2=b.fm.list.find(t=>t.id===B).art;assert(art2!==art1&&!objs.has('a/'+art1),'replace deletes the old cover');
await call('/api/fm/wave?id='+B,{method:'POST',headers:{'Content-Type':'application/octet-stream'},body:new Uint8Array(300)});assert(objs.has('w/'+B));
await ctl({action:'artdel',id:B});assert(!objs.has('a/'+art2));
await call('/api/fm/art?id='+B,{method:'POST',headers:{'Content-Type':'image/jpeg'},body:new Uint8Array(50)});
const art3=(await st()).list.find(t=>t.id===B).art;await ctl({action:'remove',id:B});assert(!objs.has('t/'+B)&&!objs.has('w/'+B)&&!objs.has('a/'+art3));
// note, schedule (alarm goes live), crossfade shortens the timeline
await ctl({action:'note',text:'  back at 9 \u0007 '});assert.equal((await st()).note,'back at 9');
await ctl({action:'stop'});[s]=await ctl({action:'sched',at:NOW+90*864e5});assert.equal(s,400);
await ctl({action:'sched',at:NOW+5e3});f=await st();assert(!f.live&&f.sched===NOW+5e3&&r.alarmAt===NOW+5e3);
NOW+=5e3;await r.alarm();f=await st();assert(f.live&&!f.sched&&f.startedAt===NOW-0);
await ctl({action:'xf',sec:4.2});f=await st();assert.equal(f.xf,4);assert.equal(r.alarmAt,f.startedAt+(f.list[f.idx].dur-4)*1e3+250);
// listeners + reactions (rate limited, broadcast)
r.user=null;r.dev='a';await call('/api/fm/listen',{method:'POST',body:'{"on":true}'});r.dev='b';[s,b]=await call('/api/fm/listen',{method:'POST',body:'{"on":true}'});assert.equal(b.listeners,2);
assert.deepEqual(r.sent.filter(m=>m.t==='fml').map(m=>m.n),[1,2]);NOW+=80e3;assert.equal((await st()).listeners,0,'stale listeners expire');
[s]=await call('/api/fm/react',{method:'POST',body:JSON.stringify({e:'lol'})});assert.equal(s,400);
[s]=await call('/api/fm/react',{method:'POST',body:JSON.stringify({e:'\u{1F525}'})});assert.equal(s,200);
[s]=await call('/api/fm/react',{method:'POST',body:JSON.stringify({e:'\u{1F525}'})});assert.equal(s,429);
NOW+=700;[s]=await call('/api/fm/react',{method:'POST',body:JSON.stringify({e:'\u{1F64C}'})});assert.equal(s,200);
assert.equal(r.sent.filter(m=>m.t==='fmr').length,2);r.user={username:'dc',owner:true};await ctl({action:'note',text:'x'});assert((await st()).stats.reacts>=2);
// every change broadcast a full state
assert(r.sent.filter(m=>m.t==='fm').length>20);
console.log('fm worker logic ok; broadcasts',r.sent.length);
