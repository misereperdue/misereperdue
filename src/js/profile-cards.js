/* Status-bar profiles. Auth, avatar rendering and catalog access are injected by chat.js. */
(function () {
  'use strict';
  var seq = 0;
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function button(label, run, cls) { var b = el('button', cls || 'mp-profile-button', label); b.type = 'button'; b.addEventListener('click', run); return b; }
  function artUrl(value) { try { var u = new URL(value); return u.protocol === 'https:' && /(^|\.)(mzstatic\.com|dzcdn\.net|deezer\.com)$/.test(u.hostname) ? u.href : ''; } catch (_) { return ''; } }
  function songUrl(value) { try { var u = new URL(value); return u.protocol === 'https:' && u.hostname === 'music.apple.com' ? u.href : ''; } catch (_) { return ''; } }
  function reduced() { return matchMedia('(prefers-reduced-motion: reduce)').matches; }
  function section(title) { var box = el('section', 'mp-profile-section'); box.appendChild(el('h3', '', title)); return box; }
  // Profile details contain listening only; pinned photos are retired.
  function details(user, options) {
    var out = el('div', 'mp-profile-details'), song = user.listening;
    if (song && song.title && song.artist) {
      var music = section('Listening'), card = el(songUrl(song.url) ? 'a' : 'div', 'mp-profile-song');
      if (card.tagName === 'A') { card.href = songUrl(song.url); card.target = '_blank'; card.rel = 'noopener noreferrer'; card.setAttribute('aria-label', song.title + ' by ' + song.artist + ', open in Apple Music'); }
      var cov = el('span', 'mp-profile-song-art'), art = artUrl(song.art);
      if (art) { var image = el('img'); image.src = art; image.alt = ''; image.loading = 'lazy'; image.onerror = function () { image.remove(); cov.classList.add('is-empty'); }; cov.appendChild(image); } else cov.classList.add('is-empty');
      cov.appendChild(el('span', 'mp-profile-song-note', '\u266B'));
      card.appendChild(cov);
      var copy = el('span', 'mp-profile-song-copy'); copy.appendChild(el('strong', '', song.title)); copy.appendChild(el('span', '', song.artist)); card.appendChild(copy);
      var eq = el('span', 'mp-profile-eq'); eq.setAttribute('aria-hidden', 'true'); for (var i = 0; i < 4; i++) eq.appendChild(el('i')); card.appendChild(eq);
      if (card.tagName === 'A') { var chev = el('span', 'mp-profile-song-go'); chev.setAttribute('aria-hidden', 'true'); chev.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9.00005 6C9.00005 6 15 10.4189 15 12C15 13.5812 9 18 9 18"/></svg>'; card.appendChild(chev); }
      music.appendChild(card); out.appendChild(music);
    }
    if (!song) {
      var empty = el('div', 'mp-profile-empty');
      empty.innerHTML = '<span class="mp-profile-empty-g" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 12C2.5 7.52166 2.5 5.28249 3.89124 3.89124C5.28249 2.5 7.52166 2.5 12 2.5C16.4783 2.5 18.7175 2.5 20.1088 3.89124C21.5 5.28249 21.5 7.52166 21.5 12C21.5 16.4783 21.5 18.7175 20.1088 20.1088C18.7175 21.5 16.4783 21.5 12 21.5C7.52166 21.5 5.28249 21.5 3.89124 20.1088C2.5 18.7175 2.5 16.4783 2.5 12Z"/><path d="M13 14.5C13 15.8807 11.8807 17 10.5 17C9.11929 17 8 15.8807 8 14.5C8 13.1193 9.11929 12 10.5 12C11.8807 12 13 13.1193 13 14.5ZM13 14.5V7C13.3333 7.5 13.6 9.6 16 10"/></svg></span>';
      empty.appendChild(el('p', '', options.me ? 'Choose a song to make this space yours.' : 'No music added yet.'));
      out.appendChild(empty);
    }
    // Owner editing is available in the toolbar above the name.
    if (options.manage) out.appendChild(button('Manage user', options.manage));
    [].forEach.call(out.children, function (c, i) { c.style.setProperty('--i', i); });
    return out;
  }
  function topBar() {
    var bar=document.querySelector('.panel.on .chat-head');
    return bar && bar.getClientRects().length ? bar : document.querySelector('.nav');
  }
  // The real status bar owns every phase. Only content crossfades; its glass never fades.
  function openBar(root, body, user, options) {
    var bar=topBar(); if(!bar)return;
    if(bar._profileExit){bar._profileExit.cancel();bar._profileExit=null;}
    window.MPFM && MPFM.yieldBar && MPFM.yieldBar();
    var style=bar.getAttribute('style'), baseHeight=bar.getBoundingClientRect().height, animation=null, phase='compact', closed=false, detail=null, entering=true, entryTimer, fades=[];
    var backdrop=el('div','mp-profile-backdrop');backdrop.setAttribute('aria-hidden','true');
    var previous=[].map.call(bar.children,function(child){var state={el:child,inert:child.inert,hidden:child.getAttribute('aria-hidden'),opacity:getComputedStyle(child).opacity};child.inert=true;child.setAttribute('aria-hidden','true');return state;});
    root.className='mp-profile-bar';root.id='mp-profile-bar';root.dataset.phase=phase;
    root.setAttribute('role','region');root.setAttribute('aria-label',user.username.toLowerCase()+"'s profile");
    bar.classList.add('is-profile-bar');if(!reduced())bar.classList.add('is-profile-entering');bar.style.height=baseHeight+'px';bar.appendChild(root);
    function current(){return options.current ? options.current() : user;}
    function icon(label,path,run){var b=button('',function(e){e.stopPropagation();run();},'mp-profile-control');b.setAttribute('aria-label',label);b.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+path+'"/></svg>';return b;}
    function size(animate){
      if(closed)return;
      var before=bar.getBoundingClientRect().height;if(animation){animation.cancel();animation=null;}
      var vv=window.visualViewport,bottom=vv?vv.offsetTop+vv.height:innerHeight,available=Math.max(100,bottom-bar.getBoundingClientRect().top-16);
      var height=phase==='compact'?baseHeight:Math.min(available,phase==='edit'?640:560,root.querySelector('.mp-profile-bar-head').offsetHeight+root.querySelector('.mp-profile-bar-scroll').scrollHeight);
      bar.style.height=height+'px';
      if(animate&&!reduced()&&bar.animate){animation=bar.animate([{height:before+'px',borderRadius:before<=baseHeight+1?'32px':'28px'},{height:height+'px',borderRadius:phase==='compact'?'32px':'28px'}],{duration:420,easing:'cubic-bezier(.22,1,.36,1)'});animation.onfinish=function(){animation=null;};}
    }
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
        title.appendChild(el('strong','',u.username.toLowerCase()));title.appendChild(el('span','mp-profile-summary-score','★ '+(u.points||0)));tx.appendChild(title);
        if(u.bio)tx.appendChild(el('small','mp-profile-summary-bio',u.bio.replace(/\s+/g,' ')));
        var info=[];if(u.listening&&u.listening.title){info.push('♫ '+u.listening.title+(u.listening.artist?' · '+u.listening.artist:''));}
        else {if(u.member)info.push('VIP');if(u.numId)info.push('#'+u.numId);if(u.createdAt)info.push('joined '+new Date(u.createdAt).toLocaleDateString(undefined,{month:'short',year:'numeric'}).toLowerCase());}
        if(info.length)tx.appendChild(el('small','mp-profile-summary-info',info.join(' · ')));
        expand.appendChild(tx);expand.appendChild(el('span','mp-profile-summary-chevron','⌄'));row.appendChild(expand);root.appendChild(row);
      } else {
        root.appendChild(header(next==='edit'?'Edit profile':'Profile',function(){render(next==='edit'?'full':'compact');}));
        var scroll=el('div','mp-profile-bar-scroll');root.appendChild(scroll);
        if(next==='edit'){scroll.appendChild(editor);}
        else {
          var nm=body.querySelector('.mp-pb-name-t'),bio=body.querySelector('.mp-pb-bio'),pts=body.querySelector('.mp-pb-pts b'),av=body.querySelector('.mp-pb-av');
          if(nm)nm.textContent=u.username.toLowerCase();if(bio){bio.textContent=u.bio||'';bio.hidden=!u.bio;}if(pts)pts.textContent=u.points||0;
          if(av){var old=av.querySelector('.chat-avatar-wrap');if(old)old.replaceWith(options.avatar(u,"lg"));}
          if(detail)detail.remove();detail=details(u,options);body.appendChild(detail);scroll.appendChild(body);
        }
      }
      size(true);
      var focus=root.querySelector(next==='compact'?'.mp-profile-summary-open':'.mp-profile-bar-head button');focus&&focus.focus({preventScroll:true});
      if(!reduced()&&root.animate){root.getAnimations().forEach(function(a){a.cancel();});var frames=[{opacity:0,transform:'translateY(3px)'},{opacity:1,transform:'none'}];if(entering)root.animate(frames,{duration:300,delay:80,fill:'backwards',easing:'ease-out'});else [].forEach.call(root.children,function(child){if(child!==backdrop)child.animate(frames,{duration:220,easing:'ease-out'});});}
    }
    root._edit=function(){options.edit(function(editor){render('edit',editor);},function(){render('full');});};
    root._refresh=function(){if(phase!=='edit')render(phase);};
    function outside(e){if(e.target.closest('.avatar-options-overlay,.rc-back,.chat-alert-backdrop'))return;if(phase!=='edit'&&!bar.contains(e.target)&&!options.anchor.contains(e.target))options.close();}
    function key(e){if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();if(phase==='edit')render('full');else if(phase==='full')render('compact');else options.close();}}
    function navigate(){options.close();}
    function resize(){size(false);}
    root._close=function(fast){
      if(closed)return;clearTimeout(entryTimer);fades.forEach(function(a){a.cancel();});root.getAnimations().forEach(function(a){a.cancel();});var closingHeight=bar.getBoundingClientRect().height;closed=true;if(animation)animation.cancel();
      document.removeEventListener('pointerdown',outside,true);document.removeEventListener('keydown',key,true);window.removeEventListener('hashchange',navigate);window.removeEventListener('popstate',navigate);window.removeEventListener('resize',resize);window.visualViewport&&visualViewport.removeEventListener('resize',resize);
      observer.disconnect();root.remove();bar.classList.remove('is-profile-bar','is-profile-expanded','is-profile-entering');if(style===null)bar.removeAttribute('style');else bar.setAttribute('style',style);
      previous.forEach(function(s){s.el.inert=s.inert;if(s.hidden===null)s.el.removeAttribute('aria-hidden');else s.el.setAttribute('aria-hidden',s.hidden);});
      if(!fast&&!reduced()&&bar.animate){bar._profileExit=bar.animate([{height:closingHeight+'px',borderRadius:closingHeight>baseHeight?'28px':'32px'},{height:baseHeight+'px',borderRadius:'32px'}],{duration:360,easing:'cubic-bezier(.22,1,.36,1)'});previous.forEach(function(s){s.el.animate&&s.el.animate([{opacity:0},{opacity:1}],{duration:260});});}
      if(!fast&&options.anchor.isConnected)options.anchor.focus&&options.anchor.focus({preventScroll:true});
    };
    var observer=new MutationObserver(function(){if(!bar.isConnected)options.close();});observer.observe(document.body,{childList:true,subtree:true});
    // Defer the outside listener so the opening avatar tap is never treated as dismissal.
    setTimeout(function(){if(!closed)document.addEventListener('pointerdown',outside,true);},0);
    document.addEventListener('keydown',key,true);window.addEventListener('hashchange',navigate);window.addEventListener('popstate',navigate);window.addEventListener('resize',resize);window.visualViewport&&visualViewport.addEventListener('resize',resize);
    render('compact');
    if(!reduced()){previous.forEach(function(s){if(s.el.animate)fades.push(s.el.animate([{opacity:s.opacity},{opacity:0}],{duration:180,fill:'forwards',easing:'ease-out'}));});entryTimer=setTimeout(function(){bar.classList.remove('is-profile-entering');fades.forEach(function(a){a.cancel();});fades=[];},400);}
    entering=false;
    root.querySelector('.mp-profile-summary-open').focus({preventScroll:true});
  }
  function editor(container, user, options) {
    var root = section('Listening'), draft = {listening:user.listening ? Object.assign({},user.listening) : null}, status = el('p','mp-profile-edit-status'), saving = false, epoch = 0, timer, controller;
    root.classList.add('mp-profile-editor');root.id='mp-profile-editor-'+(++seq);status.setAttribute('role','status');status.setAttribute('aria-live','polite');
    var songLabel=el('label','mp-profile-field','Choose a song'),query=el('input');query.type='search';query.placeholder='Search songs or artists';query.autocomplete='off';songLabel.appendChild(query);root.appendChild(songLabel);var picked=el('div','mp-profile-picked'),results=el('div','mp-profile-song-results');root.appendChild(picked);root.appendChild(results);
    function paintSong(){picked.replaceChildren();if(!draft.listening)return;var t=el('div','mp-profile-picked-copy');t.appendChild(el('strong','',draft.listening.title));t.appendChild(el('span','',draft.listening.artist));picked.appendChild(t);picked.appendChild(button('Remove song',function(){draft.listening=null;paintSong();}));}
    query.addEventListener('input',function(){var version=++epoch;clearTimeout(timer);if(controller)controller.abort();results.replaceChildren();if(query.value.trim().length<2)return;timer=setTimeout(async function(){controller=new AbortController();results.textContent='Searching…';try{var tracks=await options.search(query.value.trim(),controller.signal);if(version!==epoch||!root.isConnected)return;results.replaceChildren();tracks.filter(function(t){return songUrl(t.trackViewUrl);}).slice(0,6).forEach(function(t){var song=options.normalize(t),b=button('',function(){draft.listening={title:song.title,artist:song.artist,url:songUrl(song.url),art:artUrl(song.art)};paintSong();query.value='';results.replaceChildren();epoch++;});b.appendChild(el('strong','',song.title));b.appendChild(el('span','',song.artist));results.appendChild(b);});if(!results.childNodes.length)results.textContent='No songs found. Try another search.';}catch(e){if(e.name!=='AbortError'&&version===epoch&&root.isConnected)results.textContent='Search unavailable. Try again.';}},280);});
    var save=button('Save profile details',async function(){if(saving)return;saving=true;save.disabled=true;status.textContent='Saving…';try{var r=await options.api('/api/profile',{method:'POST',body:{listening:draft.listening}});if(!r||!r.ok||!r.user)throw Error(r&&r.error||'Could not save profile.');options.saved(r.user);status.textContent='Profile details saved.';}catch(e){status.textContent=e.message||'Could not save profile.';}finally{saving=false;if(root.isConnected){save.disabled=false;}}});root.appendChild(save);root.appendChild(status);paintSong();container.appendChild(root);
    var observer=new MutationObserver(function(){if(!root.isConnected){epoch++;clearTimeout(timer);if(controller)controller.abort();observer.disconnect();}});observer.observe(document.body,{childList:true,subtree:true});return root;
  }
  window.MPProfiles={topBar:topBar,openBar:openBar,editor:editor};
})();
