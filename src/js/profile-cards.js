/* Status-bar profiles. Auth, avatar rendering and catalog access are injected by chat.js. */
  /* One curve for every morph and menu (per dc): iOS-style ease-out, no overshoot. */
  var MP_EASE='cubic-bezier(.32,.72,0,1)';window.MP_EASE=MP_EASE;
  /* Smoothness (per dc): while any morph/transition (finite WAAPI animation of 150ms+) runs, html gets
     .mp-morphing and the always-on decorations pause (site.css), so the morph gets the frames. */
  (function(){var E=Element.prototype,orig=E.animate;if(!orig||orig._mp)return;var n=0,H=document.documentElement;
    E.animate=function(k,o){var a=orig.apply(this,arguments);try{var d=typeof o==='number'?o:o&&o.duration,it=o&&typeof o==='object'?o.iterations:1;if(d>=150&&it!==Infinity){n++;H.classList.add('mp-morphing');var end=function(){if(--n<=0){n=0;H.classList.remove('mp-morphing');}};a.finished.then(end,end);}}catch(e){}return a;};E.animate._mp=1;})();
(function () {
  'use strict';
  var seq = 0;
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function button(label, run, cls) { var b = el('button', cls || 'mp-profile-button', label); b.type = 'button'; b.addEventListener('click', run); return b; }
  function artUrl(value) { try { var u = new URL(value); return u.protocol === 'https:' && /(^|\.)(mzstatic\.com|dzcdn\.net|deezer\.com|scdn\.co|sndcdn\.com)$/.test(u.hostname) ? u.href : ''; } catch (_) { return ''; } }
  /* The site's star (per dc): the top bar's filled, rounded, accent-blue star, used in every menu. */
  window.MPStar=function(cls){return '<svg data-ph="1" class="mp-star'+(cls?' '+cls:'')+'" viewBox="2.3 2.3 19.4 18.5" aria-hidden="true"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9L12 3.5Z" fill="currentColor" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/></svg>';};
  function songUrl(value) { try { var u = new URL(value); return u.protocol === 'https:' && ['music.apple.com','open.spotify.com','spotify.link','soundcloud.com','www.soundcloud.com','on.soundcloud.com'].indexOf(u.hostname)>=0&&!u.port&&!u.username&&!u.password ? u.href : ''; } catch (_) { return ''; } }
  function reduced() { return matchMedia('(prefers-reduced-motion: reduce)').matches; }
  function section(title) { var box = el('section', 'mp-profile-section'); box.appendChild(el('h3', '', title)); return box; }
  // Profile details contain listening only; pinned photos are retired.
  function details(user, options) {
    var out = el('div', 'mp-profile-details'), song = user.listening;
    if (song && song.title && song.artist) {
      var music = section('Listening'), card = el('div', 'mp-profile-song');
      var cov = el('span', 'mp-profile-song-art'), art = artUrl(song.art);
      if (art) { var image = el('img'); image.src = art; image.alt = ''; image.loading = 'lazy'; image.onerror = function () { image.remove(); cov.classList.add('is-empty'); }; cov.appendChild(image); songTone(art, card); } else cov.classList.add('is-empty');
      cov.appendChild(el('span', 'mp-profile-song-note', '\u266B'));
      card.appendChild(cov);
      var copy=el('span','mp-profile-song-copy'),title=el('span','mp-profile-song-title');title.appendChild(el('strong','',song.title));if(song.explicit===true){var explicit=el('span','mp-profile-explicit fm-e','E');explicit.setAttribute('aria-label','Explicit');explicit.setAttribute('role','img');title.appendChild(explicit);}copy.appendChild(title);if(song.album)copy.appendChild(el('span','mp-profile-song-album',song.album));
      var artist=el('span','mp-profile-song-artist'),avatar=el('span','mp-profile-artist-avatar'),artistImage=artUrl(song.artistArt);avatar.setAttribute('aria-hidden','true');avatar.appendChild(el('span','',Array.from(song.artist.trim())[0]||'♪'));if(artistImage){var artistImg=el('img');artistImg.src=artistImage;artistImg.alt='';artistImg.loading='lazy';artistImg.onerror=function(){artistImg.remove();};avatar.appendChild(artistImg);}artist.appendChild(avatar);artist.appendChild(el('span','mp-profile-artist-name',song.artist));copy.appendChild(artist);card.appendChild(copy);
      var eq = el('span', 'mp-profile-eq mp-am-np'); eq.setAttribute('aria-hidden', 'true'); eq.innerHTML = amNote(); card.appendChild(eq);
      music.appendChild(card); out.appendChild(music);
      if(options.resolve&&song.url&&(song.artistArt===undefined||song.explicit===undefined||song.album===undefined)){cachedResolve(song.url,options.resolve).then(function(metadata){if(out.isConnected&&user.listening===song){Object.assign(song,metadata);options.enriched&&options.enriched();}}).catch(function(){});}
    }
    // Owner editing is available in the toolbar above the name.
    if (options.manage) {var manage=button('Manage',options.manage,'mp-profile-manage-link');manage.insertAdjacentHTML('afterbegin',svg('M12 7.5a3.5 3.5 0 1 1-7 0a3.5 3.5 0 1 1 7 0ZM2.5 20c0-3.6 2.7-6 6-6c1.2 0 2.3.3 3.2.9M20.6 13.4a1.5 1.5 0 0 1 0 2.1L15.5 20.6l-3 .8l.8-3l5.1-5.1a1.5 1.5 0 0 1 2.1 0Z'));out.appendChild(manage);}
    if (options.me && options.signout) {var so=button('',function(){options.signout(so);},'mp-profile-manage-link mp-profile-signout');so.innerHTML=svg('M15 17.6c-.1 2-1.7 3.7-3.7 3.7c-.4 0-.9 0-1.4-.1c-3.3-.3-6-3.1-6.2-6.5c-.1-.9-.1-1.8-.1-2.7s0-1.8.1-2.7c.2-3.4 2.9-6.2 6.2-6.5c.5-.1 1-.1 1.4-.1c2 0 3.6 1.7 3.7 3.7M21 12H10M21 12c0-.7-1.9-2.1-2.5-2.7M21 12c0 .7-1.9 2.1-2.5 2.7')+'<span>Sign out</span>';out.appendChild(so);}
    [].forEach.call(out.children, function (c, i) { c.style.setProperty('--i', i); });
    return out;
  }
  var resolvedSongs=new Map();
  function cachedResolve(url,resolve){var hit=resolvedSongs.get(url);if(hit&&Date.now()-hit.t<300000)return hit.p;var p=resolve(url).then(function(value){return value.listening||value;}).catch(function(e){resolvedSongs.delete(url);throw e;});if(resolvedSongs.size>100)resolvedSongs.clear();resolvedSongs.set(url,{t:Date.now(),p:p});return p;}
  /* Now playing (per dc): the Apple Music note bouncing, with synth bubbles bouncing up behind it. */
  /* Now playing (per dc): the Apple Account dot rings. 4 offset rings of 24 dots that grow outward,
     coloured clockwise teal > cyan > blue > violet > magenta > pink > coral > peach; built once. */
  var AM_DOTS=(function(){var stops=[[0,[159,191,196]],[40,[76,195,236]],[90,[91,143,240]],[130,[143,108,240]],[165,[200,74,224]],[195,[232,63,168]],[230,[240,87,122]],[270,[247,136,120]],[315,[237,180,138]],[360,[159,191,196]]];
    function col(a){for(var k=1;k<stops.length;k++)if(a<=stops[k][0]){var A=stops[k-1],B=stops[k],t=(a-A[0])/(B[0]-A[0]);return 'rgb('+A[1].map(function(v,n){return Math.round(v+(B[1][n]-v)*t);}).join(',')+')';}return 'rgb(159,191,196)';}
    var rings=[[53,2.8,0],[64,3.3,-6],[77,3.9,-12],[92,4.6,-18]],out='';
    /* One <svg> per ring so each ring is its own GPU layer: the ripple and the turn are composited. */
    rings.forEach(function(r,ri){var g='';for(var d=0;d<24;d++){var a=(7.5+r[2]+d*15+360)%360,rad=(a-90)*Math.PI/180;g+='<circle cx="'+(r[0]*Math.cos(rad)).toFixed(1)+'" cy="'+(r[0]*Math.sin(rad)).toFixed(1)+'" r="'+r[1]+'" fill="'+col(a)+'"/>';}out+='<svg class="mp-am-ring" style="--r:'+ri+'" viewBox="-100 -100 200 200">'+g+'</svg>';});
    return '<span class="mp-am-dots" aria-hidden="true">'+out+'</span>';})();
  /* Song text adapts to the album cover (per dc): the cover fades out before the text, so text sits on the
     card in theme colours, and the album/artist lines take a tint of the cover's colour (greys skipped).
     Needs a CORS image; otherwise plain theme colours. */
  function songTone(src,card){try{var im=new Image();im.crossOrigin='anonymous';im.decoding='async';im.onload=function(){try{var c=document.createElement('canvas');c.width=c.height=12;var x=c.getContext('2d',{willReadFrequently:true});x.drawImage(im,0,0,12,12);var d=x.getImageData(6,0,6,12).data,r=0,g=0,b=0,k=0;for(var i=0;i<d.length;i+=4){r+=d[i];g+=d[i+1];b+=d[i+2];k++;}r/=k;g/=k;b/=k;
      var m=Math.max(r,g,b),n=Math.min(r,g,b);if(m-n<18){card.style.removeProperty('--song-tint');return;}card.style.setProperty('--song-tint','rgb('+Math.round(r)+','+Math.round(g)+','+Math.round(b)+')');}catch(e){}};im.src=src;}catch(e){}}
  function amNote(){return AM_DOTS+'<svg viewBox="0 0 24 24"><path fill="currentColor" d="M19.2 3.1 9.6 5.2c-.5.1-.9.6-.9 1.1v9.4a3.1 3.1 0 1 0 1.6 2.7V9.6l8.1-1.8v6.1a3.1 3.1 0 1 0 1.6 2.7V4.1c0-.7-.6-1.2-1.3-1Z"/></svg>';}
  function synth(){return svg('M4 9v6M8 5v14M12 8v8M16 3v18M20 7v10');}
  function svg(path) {return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+path+'"/></svg>';}
  function badgePicker(user, options) {
    var root=section(options.grant?'Badges':'Display badge'),grid=el('div','mp-badge-grid'),status=el('p','mp-profile-edit-status'),pending=false;
    root.classList.add('mp-badge-picker');root.dataset.mode=options.grant?'grant':'active';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
    if(options.grant)root.appendChild(el('p','mp-settings-hint','Tap a badge to grant or remove it.'));
    root.appendChild(grid);root.appendChild(status);
    var labels={'100':'100',heart:'Heart',member:'VIP',kitty:'Hello Kitty',mask:'Sleep mask',verified:'Verified',robot:'Bot'};
    function paint(){grid.replaceChildren();var ids=options.grant?['member','kitty','mask']:(user.badges||[]).filter(function(id){return (!user.owner||id==='verified')&&options.allowed(user.username,id);});
      if(!options.grant){var active=options.active(user);if(active&&ids.indexOf(active)<0&&options.allowed(user.username,active)&&(!user.owner||active==='verified'))ids.push(active);ids.unshift(null);}
      if(options.grant&&user.username.toLowerCase()==='grim')ids=['robot'];
      ids.forEach(function(id){var selected=options.grant?(user.badges||[]).indexOf(id)>=0:options.active(user)===id,b=button('',function(){save(id);},'mp-badge-choice');b.disabled=pending||(options.grant&&id==='robot');b.dataset.badge=id||'none';b.setAttribute('aria-pressed',String(selected));b.setAttribute('aria-label',(options.grant?'Toggle ':'Display ')+(labels[id]||'No badge'));b.classList.toggle('is-selected',selected);
        var mark=el('span','mp-badge-mark');mark.innerHTML=id?options.art(id):svg('M6 6 18 18M18 6 6 18');mark.setAttribute('aria-hidden','true');b.appendChild(mark);grid.appendChild(b);});
    }
    async function save(id){if(pending)return;pending=true;status.textContent='Saving…';paint();try{var body=options.grant?{username:user.username,badge:id}:{badge:id};var r=await options.api('/api/badge',{method:'POST',body:body});if(!r||!r.ok||!r.user)throw Error(r&&r.error||'Could not update badge.');user=r.user;options.changed(user);status.textContent=options.grant?'Badges updated.':'Display badge updated.';}catch(e){status.textContent=e.message||'Could not update badge.';}finally{pending=false;if(root.isConnected)paint();}}
    paint();return root;
  }
  function management(user, options) {
    var root=el('div','mp-profile-management'),identity=el('div','mp-manage-identity'),copy=el('div');identity.appendChild(options.avatar(user));copy.appendChild(el('strong','',user.username.toLowerCase()));copy.appendChild(el('small','',user.numId?'#'+user.numId:'User'));identity.appendChild(copy);root.appendChild(identity);
    var changed=options.changed;root.appendChild(badgePicker(user,Object.assign({},options,{grant:true,changed:function(u){Object.assign(user,u);changed(user);}})));
    var access=section('Chat access'),status=el('p','mp-profile-edit-status'),ban=button('',async function(){ban.disabled=true;status.textContent='Updating…';try{var r=await options.api('/api/ban',{method:'POST',body:{username:user.username,banned:!user.banned}});if(!r||!r.ok||typeof r.banned!=='boolean')throw Error(r&&r.error||'Could not update access.');user.banned=r.banned;changed(user);status.textContent=user.banned?'User is banned from chat.':'Chat access restored.';}catch(e){status.textContent=e.message||'Could not update access.';}finally{ban.disabled=false;paint();}},'mp-manage-ban');
    function paint(){ban.textContent=user.banned?'Restore chat access':'Ban from chat';ban.classList.toggle('is-danger',!user.banned);ban.setAttribute('aria-pressed',String(!!user.banned));}
    status.setAttribute('role','status');access.appendChild(ban);access.appendChild(status);root.appendChild(access);paint();return root;
  }
  // Group existing controls without recreating them or losing their save handlers.
  function settings(sheet) {
    var nodes=[].slice.call(sheet.children),groups={},current='Profile';
    var hints={Profile:'Photo, name, bio & badge',Listening:'Choose your song',Signature:'Your forum signature',Notifications:'Push preferences',Account:'Password, connections & recovery',VIP:'Membership, renewal & cancel'};
    function group(name){if(groups[name])return groups[name];var d=el('details','mp-settings-group'),summary=el('summary'),text=el('span'),content=el('div','mp-settings-content');d.dataset.settings=name;d.open=name==='Profile';text.appendChild(el('strong','',name));text.appendChild(el('small','',hints[name]));summary.appendChild(text);summary.insertAdjacentHTML('beforeend',svg('M7 10c2 0 4 4 5 4s3-4 5-4'));d.appendChild(summary);d.appendChild(content);sheet.appendChild(d);groups[name]=content;return content;}
    nodes.forEach(function(node){
      if(node.matches('.chat-sheet-x,.chat-sheet-share,.chat-sheet-points')){node.remove();return;}
      if(node.matches('.chat-err')){sheet.prepend(node);return;}
      if(node.matches('.chat-logout')){sheet.appendChild(node);return;}
      if(node.matches('.mp-profile-editor')){group('Listening').appendChild(node);current='Listening';return;}
      if(node.matches('.chat-pw-title')){var title=node.textContent.trim();if(['Notifications','Signature','Change password','VIP'].indexOf(title)>=0){current=title==='Change password'?'Account':title;node.remove();return;}}
      group(current).appendChild(node);
    });
    var photo=sheet.querySelector('.chat-sheet-big');if(photo){photo.classList.add('mp-settings-photo');var copy=el('span');copy.appendChild(el('strong','','Profile photo'));copy.appendChild(el('small','','Tap your avatar to change it'));photo.appendChild(copy);}
  }
  function topBar() {
    var bar=document.querySelector('.panel.on .chat-head');
    return bar && bar.getClientRects().length ? bar : document.querySelector('.nav');
  }

  function chatHead() {
    var bar=document.querySelector('.panel.on .chat-head');
    return bar && bar.getClientRects().length ? bar : null;
  }
  function commitPendingExit(bar) {
    if(bar&&bar._mpCommitExit)bar._mpCommitExit();
    else if(bar&&bar._profileExit){try{bar._profileExit.cancel()}catch(e){}bar._profileExit=null;}
  }
  function closeBar(fast) {
    var root=document.querySelector('.mp-profile-bar');
    if(root&&root._close)root._close(!!fast);
    commitPendingExit(document.querySelector('.panel.on .chat-head')||document.querySelector('.nav'));
  }
  /* Generic top-bar morph sheet (per dc): same machinery as the profile bar — the status bar
     keeps its glass (no transparent flash), height eases open, Back closes with a reverse morph.
     Only a visible Chat/Globe header; never the shop nav pill.
     Close keeps the sheet in the bar until the reverse morph finishes so the chrome is never
     left as a tall empty shell (WebKit especially); a later open/fast close commits immediately. */
  function openSheet(opts) {
    opts=opts||{};
    var bar=chatHead();
    if(!bar)return null;
    closeBar(true);
    if(bar._mpCommitExit)bar._mpCommitExit();
    window.MPFM && MPFM.yieldBar && MPFM.yieldBar();
    document.dispatchEvent(new CustomEvent('mp-topbar-claim',{detail:{owner:opts.owner||'sheet'}}));
    bar=chatHead();
    if(!bar)return null;
    if(bar._mpCommitExit)bar._mpCommitExit();
    if(bar._profileExit){try{bar._profileExit.cancel()}catch(e){}bar._profileExit=null;}
    var style=bar.getAttribute('style'), barRect=bar.getBoundingClientRect(), baseHeight=barRect.height, baseWidth=barRect.width, animation=null, closed=false, committed=false, fades=[], entryTimer;
    var root=el('div','mp-profile-bar mp-ntf-morph');
    root.setAttribute('role','dialog');
    root.setAttribute('aria-label',opts.title||'Menu');
    root.tabIndex=-1;
    var backdrop=el('div','mp-profile-backdrop');backdrop.setAttribute('aria-hidden','true');
    var previous=[].map.call(bar.children,function(child){var rect=child.getBoundingClientRect();var state={el:child,inert:child.inert,hidden:child.getAttribute('aria-hidden'),opacity:getComputedStyle(child).opacity,style:child.getAttribute('style'),rect:rect};child.inert=true;child.setAttribute('aria-hidden','true');return state;});
    bar.classList.add('is-profile-bar','is-profile-expanded','is-ntf-bar');
    if(!reduced())bar.classList.add('is-profile-entering');
    bar.style.height=baseHeight+'px';
    bar.appendChild(root);
    if(!reduced())previous.forEach(function(s){if(s.rect.width&&s.rect.height){Object.assign(s.el.style,{position:'absolute',left:(s.rect.left-barRect.left-bar.clientLeft)+'px',top:(s.rect.top-barRect.top-bar.clientTop)+'px',right:'auto',bottom:'auto',width:s.rect.width+'px',height:s.rect.height+'px',margin:'0'});}});
    function restoreStyles(){previous.forEach(function(s){if(s.style===null)s.el.removeAttribute('style');else s.el.setAttribute('style',s.style);});}
    function pinChrome(){
      var now=bar.getBoundingClientRect();
      previous.forEach(function(s){
        if(!(s.rect.width&&s.rect.height))return;
        Object.assign(s.el.style,{position:'absolute',left:(s.rect.left-now.left-bar.clientLeft)+'px',top:(s.rect.top-now.top-bar.clientTop)+'px',right:'auto',bottom:'auto',width:s.rect.width+'px',height:s.rect.height+'px',margin:'0'});
      });
    }
    function size(animate){
      if(closed||committed)return;
      var before=bar.getBoundingClientRect(), beforeH=before.height, beforeW=before.width;
      if(animation){animation.cancel();animation=null;}
      var vv=window.visualViewport,bottom=vv?vv.offsetTop+vv.height:innerHeight,available=Math.max(100,bottom-bar.getBoundingClientRect().top-16);
      var scroll=root.querySelector('.mp-profile-bar-scroll'),content=scroll&&scroll.firstElementChild,cs=scroll?getComputedStyle(scroll):null,ms=content?getComputedStyle(content):null,head=root.querySelector('.mp-profile-bar-head');
      /* Natural height = the sheet's own padding + header + the real header-to-list gap + the list. */
      var rs=getComputedStyle(root),rootPad=(parseFloat(rs.paddingTop)||0)+(parseFloat(rs.paddingBottom)||0);
      var gap=head&&scroll?Math.max(0,scroll.getBoundingClientRect().top-head.getBoundingClientRect().bottom):0;
      var natural=rootPad+(head?head.offsetHeight:0)+gap+(cs?(parseFloat(cs.paddingTop)||0)+(parseFloat(cs.paddingBottom)||0):0)+(content?content.offsetHeight+(ms?((parseFloat(ms.marginTop)||0)+(parseFloat(ms.marginBottom)||0)):0):0)+2;
      var cap=opts.maxHeight!=null?opts.maxHeight:480;
      var height=Math.min(available, cap, Math.max(baseHeight,natural||baseHeight));
      bar.style.height=height+'px';
      if(animate&&!reduced()&&bar.animate){animation=bar.animate([{height:beforeH+'px',borderRadius:beforeH<=baseHeight+1?'32px':'28px'},{height:height+'px',borderRadius:'28px'}],{duration:460,easing:MP_EASE});animation.onfinish=function(){animation=null;};}
    }
    function commitRestore(){
      if(committed)return;
      committed=true;closed=true;
      if(bar._profileExit){try{bar._profileExit.cancel()}catch(e){}bar._profileExit=null;}
      bar._mpCommitExit=null;
      if(root.parentNode)root.remove();
      restoreStyles();
      bar.classList.remove('is-profile-bar','is-profile-expanded','is-profile-entering','is-profile-leaving','is-ntf-bar');
      if(style===null)bar.removeAttribute('style');else bar.setAttribute('style',style);
      previous.forEach(function(s){s.el.inert=s.inert;if(s.hidden===null)s.el.removeAttribute('aria-hidden');else s.el.setAttribute('aria-hidden',s.hidden);});
      if(opts.onClose)try{opts.onClose(true)}catch(e){}
    }
    function close(fast){
      if(committed)return;
      if(closed){if(fast)commitRestore();return;}
      closed=true;
      clearTimeout(entryTimer);fades.forEach(function(a){a.cancel();});root.getAnimations().forEach(function(a){a.cancel();});
      if(animation){animation.cancel();animation=null;}
      document.removeEventListener('pointerdown',outside,true);document.removeEventListener('keydown',key,true);
      window.removeEventListener('hashchange',navigate);window.removeEventListener('popstate',navigate);window.removeEventListener('resize',resize);
      window.visualViewport&&visualViewport.removeEventListener('resize',resize);
      document.removeEventListener('mp-topbar-claim',onClaim);
      observer.disconnect();
      bar._mpCommitExit=commitRestore;
      if(fast||reduced()||!bar.animate){commitRestore();return;}
      var closing=bar.getBoundingClientRect();
      pinChrome();
      bar.classList.add('is-profile-leaving');
      bar.classList.remove('is-profile-entering');
      root.style.pointerEvents='none';
      if(root.animate)root.animate([{opacity:1},{opacity:0}],{duration:220,fill:'forwards',easing:MP_EASE});
      previous.forEach(function(s){s.el.animate&&s.el.animate([{opacity:0},{opacity:s.opacity}],{duration:260,easing:MP_EASE});});
      bar._profileExit=bar.animate([{height:closing.height+'px',borderRadius:'28px'},{height:baseHeight+'px',borderRadius:'32px'}],{duration:360,easing:'cubic-bezier(.22,1,.36,1)',fill:'forwards'});
      var done=function(){commitRestore();};
      bar._profileExit.onfinish=done;
      if(bar._profileExit.finished)bar._profileExit.finished.then(done,done);
      setTimeout(done,450);
    }
    root._close=close;
    /* Same header as the other top-bar menus (profile, Powers, Stars): round Back, centred title, round Close. */
    var head=el('div','mp-profile-bar-head');
    var ctl=function(label,x,path){var b=el('button','mp-profile-control');b.type='button';b.setAttribute('aria-label',label);b.setAttribute('data-x',x);b.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+path+'"/></svg>';b.addEventListener('click',function(e){e.stopPropagation();close();});return b;};
    var back=ctl('Back','back','M15 6 9 12 15 18'),title=el('strong','',opts.title||''),xbtn=ctl('Close','close','M6 6 18 18M18 6 6 18');
    head.appendChild(back);head.appendChild(title);head.appendChild(xbtn);
    var scroll=el('div','mp-profile-bar-scroll');
    var body=el('div',opts.bodyClass||'mp-ntf-list');
    scroll.appendChild(body);
    root.appendChild(backdrop);root.appendChild(head);root.appendChild(scroll);
    function outside(e){if(e.target.closest('.avatar-options-overlay,.rc-back,.chat-alert-backdrop'))return;if(!bar.contains(e.target))close();}
    function key(e){if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();close();}}
    function navigate(){close(true);}
    function resize(){size(false);}
    function onClaim(ev){if(committed)return;if(ev.detail&&ev.detail.owner&&ev.detail.owner!==(opts.owner||'sheet'))close(true);}
    var observer=new MutationObserver(function(){if(!bar.isConnected)close(true);});observer.observe(document.body,{childList:true,subtree:true});
    setTimeout(function(){if(!closed&&!committed)document.addEventListener('pointerdown',outside,true);},0);
    document.addEventListener('mp-topbar-claim',onClaim);
    document.addEventListener('keydown',key,true);window.addEventListener('hashchange',navigate);window.addEventListener('popstate',navigate);window.addEventListener('resize',resize);window.visualViewport&&visualViewport.addEventListener('resize',resize);
    if(!reduced()){previous.forEach(function(s){if(s.el.animate)fades.push(s.el.animate([{opacity:s.opacity},{opacity:0}],{duration:180,fill:'forwards',easing:'ease-out'}));});entryTimer=setTimeout(function(){if(closed||committed)return;bar.classList.remove('is-profile-entering');restoreStyles();fades.forEach(function(a){a.cancel();});fades=[];},400);}
    if(!reduced()&&root.animate)root.animate([{opacity:0,transform:'translateY(6px) scale(.985)'},{opacity:1,transform:'none'}],{duration:340,delay:80,fill:'backwards',easing:MP_EASE});
    size(true);
    root.focus({preventScroll:true});
    return {root:root,body:body,bar:bar,resize:function(){size(true);},close:close};
  }
  // The real status bar owns every phase. Only content crossfades; its glass never fades.
  function openBar(root, body, user, options) {
    closeBar(true);
    var bar=topBar();
    commitPendingExit(bar);
    document.dispatchEvent(new CustomEvent('mp-topbar-claim',{detail:{owner:'profile'}}));
    bar=topBar(); if(!bar)return;
    commitPendingExit(bar);
    if(bar._profileExit){try{bar._profileExit.cancel()}catch(e){}bar._profileExit=null;}
    window.MPFM && MPFM.yieldBar && MPFM.yieldBar();
    var style=bar.getAttribute('style'), baseHeight=bar.getBoundingClientRect().height, animation=null, phase='compact', closed=false, detail=null, entering=true, entryTimer, fades=[], contentObserver=null, contentSize={w:0,h:0};
    var backdrop=el('div','mp-profile-backdrop');backdrop.setAttribute('aria-hidden','true');
    var barRect=bar.getBoundingClientRect();
    var previous=[].map.call(bar.children,function(child){var rect=child.getBoundingClientRect();var state={el:child,inert:child.inert,hidden:child.getAttribute('aria-hidden'),opacity:getComputedStyle(child).opacity,style:child.getAttribute('style'),rect:rect};child.inert=true;child.setAttribute('aria-hidden','true');return state;});
    root.className='mp-profile-bar';root.id='mp-profile-bar';root.dataset.phase=phase;
    root.setAttribute('role','region');root.setAttribute('aria-label',user.username.toLowerCase()+"'s profile");
    bar.classList.add('is-profile-bar');if(!reduced())bar.classList.add('is-profile-entering');bar.style.height=baseHeight+'px';bar.appendChild(root);
    if(!reduced())previous.forEach(function(s){if(s.rect.width&&s.rect.height){Object.assign(s.el.style,{position:'absolute',left:(s.rect.left-barRect.left-bar.clientLeft)+'px',top:(s.rect.top-barRect.top-bar.clientTop)+'px',right:'auto',bottom:'auto',width:s.rect.width+'px',height:s.rect.height+'px',margin:'0'});}});
    function restoreStyles(){previous.forEach(function(s){if(s.style===null)s.el.removeAttribute('style');else s.el.setAttribute('style',s.style);});}
    function current(){return options.current ? options.current() : user;}
    function icon(label,path,run){var b=button('',function(e){e.stopPropagation();run();},'mp-profile-control');b.setAttribute('aria-label',label);b.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+path+'"/></svg>';return b;}
    function size(animate){
      if(closed)return;
      var before=bar.getBoundingClientRect().height;if(animation){animation.cancel();animation=null;}
      var vv=window.visualViewport,bottom=vv?vv.offsetTop+vv.height:innerHeight,available=Math.max(100,bottom-bar.getBoundingClientRect().top-16);
      var natural=baseHeight;if(phase!=='compact'){var scroll=root.querySelector('.mp-profile-bar-scroll'),content=scroll.firstElementChild,cs=getComputedStyle(scroll),ms=content?getComputedStyle(content):null;if(content)contentSize={w:content.offsetWidth,h:content.offsetHeight};natural=root.querySelector('.mp-profile-bar-head').offsetHeight+(parseFloat(cs.paddingTop)||0)+(parseFloat(cs.paddingBottom)||0)+(content?content.offsetHeight+(parseFloat(ms.marginTop)||0)+(parseFloat(ms.marginBottom)||0):0);}
      var height=phase==='compact'?baseHeight:Math.min(available,phase==='edit'||phase==='page'?640:560,natural);
      bar.style.height=height+'px';
      if(animate&&!reduced()&&bar.animate){animation=bar.animate([{height:before+'px',borderRadius:before<=baseHeight+1?'32px':'28px'},{height:height+'px',borderRadius:phase==='compact'?'32px':'28px'}],{duration:460,easing:MP_EASE});animation.onfinish=function(){animation=null;};}
    }
    var pageTitle='';function sub(p){return p==='edit'||p==='manage'||p==='page';}
    function pageBack(){var page=root.querySelector('.mp-profile-bar-scroll>*');return !!(page&&typeof page._back==='function'&&page._back());}
    function goBack(){if(pageBack())return;if(sub(phase))render('full');else if(phase==='full')render('compact');else options.close();}
    function header(title,back){var h=el('div','mp-profile-bar-head');h.appendChild(icon('Back','M15 6 9 12 15 18',back));h.appendChild(el('strong','',title));h.appendChild(icon('Close profile','M6 6 18 18M18 6 6 18',options.close));return h;}
    function render(next,editor){
      if(closed)return;
      // Keep the original profile body and its action listeners.
      phase=next;root.dataset.phase=next;root.replaceChildren(backdrop);bar.classList.toggle('is-profile-expanded',next!=='compact');
      var u=current();Object.assign(user,u);
      var avatar=options.avatar(u),image=avatar.querySelector('img');
      if(image){var art=backdrop.querySelector('img');if(!art){art=el('img');art.alt='';backdrop.appendChild(art);}if(art.src!==image.src)art.src=image.src;art.onerror=function(){art.remove();};}else backdrop.replaceChildren();
      root.setAttribute('aria-label',u.username.toLowerCase()+"'s profile");
      if(next==='compact'){
        var row=el('div','mp-profile-summary');
        row.appendChild(icon('Close profile','M6 6 18 18M18 6 6 18',options.close));
        var expand=button('',function(){render('full');},'mp-profile-summary-open');expand.setAttribute('aria-label','Expand '+u.username.toLowerCase()+"'s profile");expand.setAttribute('aria-expanded','false');
        expand.appendChild(avatar);
        var tx=el('span','mp-profile-summary-copy'),title=el('span','mp-profile-summary-title');
        title.appendChild(el('strong','',u.username.toLowerCase()));var score=el('span','mp-profile-summary-score');score.setAttribute('aria-label',(u.points||0)+' stars');score.innerHTML=window.MPStar();score.title=(u.points||0)+' stars';score.appendChild(el('span','',new Intl.NumberFormat('en',{notation:'compact',maximumFractionDigits:1}).format(u.points||0)));tx.appendChild(title);
        if(u.bio){var bioText=u.bio.replace(/\s+/g,' ').trim(),letters=Array.from(bioText);tx.appendChild(el('small','mp-profile-summary-bio',letters.slice(0,60).join('')+(letters.length>60?'…':'')));}
        var info=[];if(u.listening&&u.listening.title){var playing=el('small','mp-profile-summary-info is-listening'),mark=el('span','mp-profile-summary-synth');mark.innerHTML=synth();mark.setAttribute('aria-hidden','true');playing.appendChild(mark);playing.appendChild(el('strong','',u.listening.title));if(u.listening.artist)playing.appendChild(el('span','',' · '+u.listening.artist));tx.appendChild(playing);}
        else {if(u.member)info.push('VIP');if(u.numId)info.push('#'+u.numId);if(u.createdAt)info.push('joined '+new Date(u.createdAt).toLocaleDateString(undefined,{month:'short',year:'numeric'}).toLowerCase());}
        if(info.length)tx.appendChild(el('small','mp-profile-summary-info',info.join(' · ')));
        expand.appendChild(tx);expand.appendChild(score);var chevron=el('span','mp-profile-summary-chevron');chevron.innerHTML=svg('M7 10c2 0 4 4 5 4s3-4 5-4');chevron.setAttribute('aria-hidden','true');expand.appendChild(chevron);row.appendChild(expand);root.appendChild(row);
      } else {
        root.appendChild(header(next==='edit'?'Settings':next==='manage'?'Manage':next==='page'?pageTitle:'Profile',goBack));
        var scroll=el('div','mp-profile-bar-scroll');root.appendChild(scroll);
        if(sub(next)){scroll.appendChild(editor);}
        else {
          if(options.sync)options.sync(u);
          var nm=body.querySelector('.mp-pb-name-t'),bio=body.querySelector('.mp-pb-bio'),pts=body.querySelector('.mp-pb-pts b'),av=body.querySelector('.mp-pb-av');
          if(nm)nm.textContent=u.username.toLowerCase();if(bio){bio.textContent=u.bio||'';bio.hidden=!u.bio;}if(pts)pts.textContent=u.points||0;
          if(av){var old=av.querySelector('.chat-avatar-wrap');if(old)old.replaceWith(options.avatar(u,"lg"));}
          if(detail)detail.remove();detail=details(u,Object.assign({},options,{manage:options.manage?root._manage:null,enriched:function(){root._refresh();}}));if(detail.childElementCount)body.appendChild(detail);scroll.appendChild(body);
        }
      }
      size(true);
      if(contentObserver){contentObserver.disconnect();var content=root.querySelector('.mp-profile-bar-scroll>*');if(content)contentObserver.observe(content);}
      var focus=root.querySelector(next==='compact'?'.mp-profile-summary-open':'.mp-profile-bar-head button');focus&&focus.focus({preventScroll:true});
      if(!reduced()&&root.animate){root.getAnimations().forEach(function(a){a.cancel();});var frames=[{opacity:0,transform:'translateY(6px) scale(.985)'},{opacity:1,transform:'none'}];if(entering)root.animate(frames,{duration:340,delay:80,fill:'backwards',easing:MP_EASE});else [].forEach.call(root.children,function(child){if(child!==backdrop)child.animate(frames,{duration:320,delay:50,fill:'backwards',easing:MP_EASE});});}
    }
    root._edit=function(){options.edit(function(editor){render('edit',editor);},function(){render('full');});};
    root._manage=function(){if(options.manage)render('manage',options.manage());};
    root._refresh=function(){if(!sub(phase))render(phase);};
    /* Generic sub-page (Powers, Stars): the profile morphs into it; Back returns to the profile. */
    root._page=function(title,page){pageTitle=title;render('page',page);};
    root._back=goBack;
    root.addEventListener('toggle',function(){size(true);},true);
    function outside(e){if(e.target.closest('.avatar-options-overlay,.rc-back,.chat-alert-backdrop'))return;if(!sub(phase)&&!bar.contains(e.target)&&!options.anchor.contains(e.target))options.close();}
    function key(e){if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();goBack();}}
    function navigate(){options.close();}
    function resize(){size(false);}
    function onClaim(ev){if(closed)return;if(ev.detail&&ev.detail.owner&&ev.detail.owner!=='profile')root._close(true);}
    root._close=function(fast){
      if(closed)return;clearTimeout(entryTimer);fades.forEach(function(a){a.cancel();});root.getAnimations().forEach(function(a){a.cancel();});var closingHeight=bar.getBoundingClientRect().height;closed=true;if(animation)animation.cancel();
      document.removeEventListener('pointerdown',outside,true);document.removeEventListener('keydown',key,true);window.removeEventListener('hashchange',navigate);window.removeEventListener('popstate',navigate);window.removeEventListener('resize',resize);window.visualViewport&&visualViewport.removeEventListener('resize',resize);document.removeEventListener('mp-topbar-claim',onClaim);
      observer.disconnect();if(contentObserver)contentObserver.disconnect();root.remove();restoreStyles();bar.classList.remove('is-profile-bar','is-profile-expanded','is-profile-entering');if(style===null)bar.removeAttribute('style');else bar.setAttribute('style',style);
      previous.forEach(function(s){s.el.inert=s.inert;if(s.hidden===null)s.el.removeAttribute('aria-hidden');else s.el.setAttribute('aria-hidden',s.hidden);});
      if(!fast&&!reduced()&&bar.animate){bar._profileExit=bar.animate([{height:closingHeight+'px',borderRadius:closingHeight>baseHeight?'28px':'32px'},{height:baseHeight+'px',borderRadius:'32px'}],{duration:360,easing:'cubic-bezier(.22,1,.36,1)'});previous.forEach(function(s){s.el.animate&&s.el.animate([{opacity:0},{opacity:1}],{duration:260});});}
      if(!fast&&options.anchor.isConnected)options.anchor.focus&&options.anchor.focus({preventScroll:true});
    };
    var observer=new MutationObserver(function(){if(!bar.isConnected)options.close();});observer.observe(document.body,{childList:true,subtree:true});
    if(window.ResizeObserver)contentObserver=new ResizeObserver(function(){var content=root.querySelector('.mp-profile-bar-scroll>*');if(content&&(Math.abs(content.offsetWidth-contentSize.w)>.5||Math.abs(content.offsetHeight-contentSize.h)>.5))size(true);});
    // Defer the outside listener so the opening avatar tap is never treated as dismissal.
    setTimeout(function(){if(!closed)document.addEventListener('pointerdown',outside,true);},0);
    document.addEventListener('mp-topbar-claim',onClaim);
    document.addEventListener('keydown',key,true);window.addEventListener('hashchange',navigate);window.addEventListener('popstate',navigate);window.addEventListener('resize',resize);window.visualViewport&&visualViewport.addEventListener('resize',resize);
    render('compact');
    if(!reduced()){previous.forEach(function(s){if(s.el.animate)fades.push(s.el.animate([{opacity:s.opacity},{opacity:0}],{duration:180,fill:'forwards',easing:'ease-out'}));});entryTimer=setTimeout(function(){bar.classList.remove('is-profile-entering');restoreStyles();fades.forEach(function(a){a.cancel();});fades=[];},400);}
    entering=false;
    root.querySelector('.mp-profile-summary-open').focus({preventScroll:true});
  }
  function editor(container, user, options) {
    var root=section('Listening'),draft={listening:user.listening?Object.assign({},user.listening):null},status=el('p','mp-profile-edit-status'),saving=false,loading=false,epoch=0,timer,controller;
    root.classList.add('mp-profile-editor');root.id='mp-profile-editor-'+(++seq);status.setAttribute('role','status');status.setAttribute('aria-live','polite');
    var label=el('label','mp-profile-field','Song link'),input=el('input');input.type='url';input.inputMode='url';input.autocomplete='off';input.maxLength=600;input.placeholder='Apple Music, Spotify or SoundCloud URL';input.value=draft.listening&&draft.listening.url||'';label.appendChild(input);root.appendChild(label);
    var hint=el('p','mp-settings-hint','Paste a track link to fill in the song and artist.'),picked=el('div','mp-profile-picked');root.appendChild(hint);root.appendChild(picked);
    function paint(){picked.replaceChildren();if(!draft.listening)return;var text=el('div','mp-profile-picked-copy');text.appendChild(el('strong','',draft.listening.title));text.appendChild(el('span','',draft.listening.artist));picked.appendChild(text);picked.appendChild(button('Remove song',function(){epoch++;if(controller)controller.abort();clearTimeout(timer);loading=false;draft.listening=null;input.value='';save.disabled=saving;status.textContent='Save to remove the song.';paint();}));}
    async function resolve(){var value=input.value.trim(),version=++epoch;if(controller)controller.abort();if(!value){draft.listening=null;loading=false;save.disabled=saving;status.textContent='';paint();return;}if(!songUrl(value)){loading=false;save.disabled=true;status.textContent='Paste an Apple Music, Spotify or SoundCloud track link.';return;}
      loading=true;save.disabled=true;controller=new AbortController();var current=controller,deadline=setTimeout(function(){current.abort();},23000);status.textContent='Reading song details…';
      try{var response=await options.resolve(value,controller.signal);if(version!==epoch||!root.isConnected)return;var song=response.listening||response;if(!song.title||!song.artist||!songUrl(song.url))throw Error('Song details unavailable. Try another track link.');draft.listening={title:song.title,artist:song.artist,url:song.url,art:artUrl(song.art),artistArt:artUrl(song.artistArt),explicit:typeof song.explicit==='boolean'?song.explicit:null,provider:song.provider||null};input.value=song.url;status.textContent='Song ready. Save profile details to show it.';loading=false;save.disabled=saving;paint();}
      catch(e){if(version===epoch&&root.isConnected){loading=false;save.disabled=true;status.textContent=e.name==='AbortError'?'Lookup timed out. Paste the link again to retry.':e.message||'Could not read this song. Try again.';}}
      finally{clearTimeout(deadline);}
    }
    input.addEventListener('input',function(){epoch++;if(controller)controller.abort();clearTimeout(timer);loading=true;save.disabled=true;status.textContent='';timer=setTimeout(resolve,500);});
    input.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();clearTimeout(timer);resolve();}});
    var save=button('Save profile details',async function(){if(saving||loading)return;saving=true;save.disabled=true;status.textContent='Saving…';try{var r=await options.api('/api/profile',{method:'POST',body:{listening:draft.listening}});if(!r||!r.ok||!r.user)throw Error(r&&r.error||'Could not save profile.');options.saved(r.user);status.textContent='Profile details saved.';}catch(e){status.textContent=e.message||'Could not save profile.';}finally{saving=false;if(root.isConnected)save.disabled=loading;}});root.appendChild(save);root.appendChild(status);paint();container.appendChild(root);
    var observer=new MutationObserver(function(){if(!root.isConnected){epoch++;clearTimeout(timer);if(controller)controller.abort();observer.disconnect();}});observer.observe(document.body,{childList:true,subtree:true});return root;
  }
  window.MPProfiles={songUrl:songUrl,topBar:topBar,chatHead:chatHead,openBar:openBar,openSheet:openSheet,closeBar:closeBar,editor:editor,badgePicker:badgePicker,management:management,settings:settings};
})();
