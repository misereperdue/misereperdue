/* Expanded profile cards. Auth, catalog and existing mask geometry are injected by chat.js. */
(function () {
  'use strict';
  var seq = 0;
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function button(label, run, cls) { var b = el('button', cls || 'mp-profile-button', label); b.type = 'button'; b.addEventListener('click', run); return b; }
  function photos(user) { return (Array.isArray(user.profilePhotos) ? user.profilePhotos : []).filter(function (id) { return typeof id === 'string' && /^[A-Za-z0-9_-]{6,80}$/.test(id); }).slice(0, 3); }
  function artUrl(value) { try { var u = new URL(value); return u.protocol === 'https:' && /(^|\.)(mzstatic\.com|dzcdn\.net|deezer\.com)$/.test(u.hostname) ? u.href : ''; } catch (_) { return ''; } }
  function songUrl(value) { try { var u = new URL(value); return u.protocol === 'https:' && u.hostname === 'music.apple.com' ? u.href : ''; } catch (_) { return ''; } }
  function reduced() { return matchMedia('(prefers-reduced-motion: reduce)').matches; }
  function section(title) { var box = el('section', 'mp-profile-section'); box.appendChild(el('h3', '', title)); return box; }
  // Static gallery: all pinned photos are visible, with no flick/swipe behavior.
  function gallery(ids, origin) {
    var root = el('div', 'mp-profile-gallery');
    ids.forEach(function(id,i){var image=el('img');image.src=origin+'/api/media/'+encodeURIComponent(id);image.alt='Pinned photo '+(i+1);image.loading='lazy';image.decoding='async';root.appendChild(image);});
    return root;
  }
  /* Grim t537u redesign: Listening is one refined row (art, title/artist, a small live equaliser), then the
     pinned photo stack; empty states are a quiet glyph + line (own profile gets the way to fill them). */
  function details(user, options) {
    var out = el('div', 'mp-profile-details'), ids = photos(user), song = user.listening;
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
    if (ids.length) { var p = el('section', 'mp-profile-section mp-profile-photos'); p.appendChild(gallery(ids, options.origin)); out.appendChild(p); }
    if (!ids.length && !song) {
      var empty = el('div', 'mp-profile-empty');
      empty.innerHTML = '<span class="mp-profile-empty-g" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 12C2.5 7.52166 2.5 5.28249 3.89124 3.89124C5.28249 2.5 7.52166 2.5 12 2.5C16.4783 2.5 18.7175 2.5 20.1088 3.89124C21.5 5.28249 21.5 7.52166 21.5 12C21.5 16.4783 21.5 18.7175 20.1088 20.1088C18.7175 21.5 16.4783 21.5 12 21.5C7.52166 21.5 5.28249 21.5 3.89124 20.1088C2.5 18.7175 2.5 16.4783 2.5 12Z"/><path d="M13 14.5C13 15.8807 11.8807 17 10.5 17C9.11929 17 8 15.8807 8 14.5C8 13.1193 9.11929 12 10.5 12C11.8807 12 13 13.1193 13 14.5ZM13 14.5V7C13.3333 7.5 13.6 9.6 16 10"/></svg></span>';
      empty.appendChild(el('p', '', options.me ? 'Make this space yours with photos and a song.' : 'No photos or music added yet.'));
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
    var style=bar.getAttribute('style'), baseHeight=bar.getBoundingClientRect().height, animation=null, phase='compact', closed=false, detail=null;
    var previous=[].map.call(bar.children,function(child){var state={el:child,inert:child.inert,hidden:child.getAttribute('aria-hidden')};child.inert=true;child.setAttribute('aria-hidden','true');return state;});
    root.className='mp-profile-bar';root.id='mp-profile-bar';root.dataset.phase=phase;
    root.setAttribute('role','region');root.setAttribute('aria-label',user.username.toLowerCase()+"'s profile");
    bar.classList.add('is-profile-bar');bar.style.height=baseHeight+'px';bar.appendChild(root);
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
      // Keep the original body and its action listeners; the gallery is static.
      phase=next;root.dataset.phase=next;root.replaceChildren();bar.classList.toggle('is-profile-expanded',next!=='compact');
      var u=current();Object.assign(user,u);root.setAttribute('aria-label',u.username.toLowerCase()+"'s profile");
      if(next==='compact'){
        var row=el('div','mp-profile-summary');
        row.appendChild(icon('Close profile','M6 6 18 18M18 6 6 18',options.close));
        var expand=button('',function(){render('full');},'mp-profile-summary-open');expand.setAttribute('aria-label','Expand '+u.username.toLowerCase()+"'s profile");expand.setAttribute('aria-expanded','false');
        expand.appendChild(options.avatar(u));var tx=el('span','mp-profile-summary-copy');tx.appendChild(el('strong','',u.username.toLowerCase()));tx.appendChild(el('small','',(u.bio||('★ '+(u.points||0)+' points')).replace(/\s+/g,' ')));expand.appendChild(tx);expand.appendChild(el('span','mp-profile-summary-chevron','⌄'));row.appendChild(expand);root.appendChild(row);
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
      if(!reduced()&&root.animate)root.animate([{opacity:0,transform:'translateY(5px)'},{opacity:1,transform:'none'}],{duration:240,easing:'ease-out'});
    }
    root._edit=function(){options.edit(function(editor){render('edit',editor);},function(){render('full');});};
    root._refresh=function(){if(phase!=='edit')render(phase);};
    function outside(e){if(e.target.closest('.avatar-options-overlay,.rc-back,.chat-alert-backdrop'))return;if(phase!=='edit'&&!bar.contains(e.target)&&!options.anchor.contains(e.target))options.close();}
    function key(e){if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();if(phase==='edit')render('full');else if(phase==='full')render('compact');else options.close();}}
    function navigate(){options.close();}
    function resize(){size(false);}
    root._close=function(fast){
      if(closed)return;var closingHeight=bar.getBoundingClientRect().height;closed=true;if(animation)animation.cancel();
      document.removeEventListener('pointerdown',outside,true);document.removeEventListener('keydown',key,true);window.removeEventListener('hashchange',navigate);window.removeEventListener('popstate',navigate);window.removeEventListener('resize',resize);window.visualViewport&&visualViewport.removeEventListener('resize',resize);
      observer.disconnect();root.remove();bar.classList.remove('is-profile-bar','is-profile-expanded');if(style===null)bar.removeAttribute('style');else bar.setAttribute('style',style);
      previous.forEach(function(s){s.el.inert=s.inert;if(s.hidden===null)s.el.removeAttribute('aria-hidden');else s.el.setAttribute('aria-hidden',s.hidden);});
      if(!fast&&!reduced()&&bar.animate){bar._profileExit=bar.animate([{height:closingHeight+'px',borderRadius:closingHeight>baseHeight?'28px':'32px'},{height:baseHeight+'px',borderRadius:'32px'}],{duration:360,easing:'cubic-bezier(.22,1,.36,1)'});previous.forEach(function(s){s.el.animate&&s.el.animate([{opacity:0},{opacity:1}],{duration:260});});}
      if(!fast&&options.anchor.isConnected)options.anchor.focus&&options.anchor.focus({preventScroll:true});
    };
    var observer=new MutationObserver(function(){if(!bar.isConnected)options.close();});observer.observe(document.body,{childList:true,subtree:true});
    // Defer the outside listener so the opening avatar tap is never treated as dismissal.
    setTimeout(function(){if(!closed)document.addEventListener('pointerdown',outside,true);},0);
    document.addEventListener('keydown',key,true);window.addEventListener('hashchange',navigate);window.addEventListener('popstate',navigate);window.addEventListener('resize',resize);window.visualViewport&&visualViewport.addEventListener('resize',resize);
    render('compact');
    root.querySelector('.mp-profile-summary-open').focus({preventScroll:true});
  }
  function readPhoto(file) {
    return new Promise(function (resolve, reject) { if (!file || !/^image\/(jpeg|png|webp|gif)$/.test(file.type) || file.size > 8 * 1024 * 1024) return reject(Error('Choose a JPEG, PNG, WebP, or GIF under 8 MB.')); var reader = new FileReader(); reader.onerror = function () { reject(Error('Could not read this photo.')); }; reader.onload = function () { var image = new Image(); image.onerror = function () { reject(Error('Could not open this photo.')); }; image.onload = function () { try { var scale = Math.min(1, 1400 / Math.max(image.width, image.height)), canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(image.width * scale)); canvas.height = Math.max(1, Math.round(image.height * scale)); var ctx = canvas.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0,0,canvas.width,canvas.height); ctx.drawImage(image,0,0,canvas.width,canvas.height); resolve(canvas.toDataURL('image/jpeg', .88)); } catch (_) { reject(Error('Could not prepare this photo.')); } }; image.src = reader.result; }; reader.readAsDataURL(file); });
  }
  function editor(container, user, options) {
    var root = section('Music & photos'), draft = {profilePhotos:photos(user),listening:user.listening ? Object.assign({},user.listening) : null}, slots = el('div', 'mp-profile-edit-photos'), status = el('p','mp-profile-edit-status'), upload = el('input'), selected = 0, uploading = false, saving = false, epoch = 0, timer, controller;
    root.classList.add('mp-profile-editor'); root.id = 'mp-profile-editor-'+(++seq); status.setAttribute('role','status'); status.setAttribute('aria-live','polite'); upload.type='file'; upload.accept='image/jpeg,image/png,image/webp,image/gif'; upload.hidden=true;
    var photoHint=el('p','mp-profile-edit-hint','Up to three photos, in the order you choose.');root.appendChild(photoHint); root.appendChild(slots); root.appendChild(upload);
    function paintPhotos() { slots.replaceChildren(); for(var i=0;i<3;i++) (function(i){var slot=el('div','mp-profile-edit-slot'), choose=button(draft.profilePhotos[i]?'Replace photo '+(i+1):'Add photo '+(i+1),function(){selected=Math.min(i,draft.profilePhotos.length);upload.value='';upload.click();});choose.disabled=uploading||saving; if(draft.profilePhotos[i]){var img=el('img');img.src=options.origin+'/api/media/'+encodeURIComponent(draft.profilePhotos[i]);img.alt='Pinned photo '+(i+1);choose.textContent='';choose.setAttribute('aria-label','Replace pinned photo '+(i+1));choose.appendChild(img);slot.appendChild(choose);var remove=button('Remove',function(){draft.profilePhotos.splice(i,1);paintPhotos();});remove.disabled=uploading||saving;slot.appendChild(remove);if(i){var move=button('←',function(){var x=draft.profilePhotos[i-1];draft.profilePhotos[i-1]=draft.profilePhotos[i];draft.profilePhotos[i]=x;paintPhotos();});move.setAttribute('aria-label','Move photo '+(i+1)+' earlier');move.disabled=uploading||saving;slot.appendChild(move);}}else slot.appendChild(choose);slots.appendChild(slot);})(i); }
    upload.addEventListener('change',async function(){var file=upload.files&&upload.files[0];if(!file)return;uploading=true;save.disabled=true;paintPhotos();status.textContent='Uploading photo…';try{var data=await readPhoto(file),r=await options.api('/api/media',{method:'POST',body:{kind:'image',dataUrl:data,filename:file.name}});if(!r||!r.ok||!r.id)throw Error(r&&r.error||'Could not upload photo.');draft.profilePhotos[selected]=r.id;status.textContent='Photo ready. Save profile details to pin it.';}catch(e){status.textContent=e.message||'Could not upload photo.';}finally{uploading=false;if(root.isConnected){save.disabled=saving;paintPhotos();}}});
    var songLabel=el('label','mp-profile-field','Listening'),query=el('input');query.type='search';query.placeholder='Search songs or artists';query.autocomplete='off';songLabel.appendChild(query);root.appendChild(songLabel);var picked=el('div','mp-profile-picked'),results=el('div','mp-profile-song-results');root.appendChild(picked);root.appendChild(results);root.appendChild(photoHint);root.appendChild(slots);root.appendChild(upload);
    function paintSong(){picked.replaceChildren();if(!draft.listening)return;var t=el('div','mp-profile-picked-copy');t.appendChild(el('strong','',draft.listening.title));t.appendChild(el('span','',draft.listening.artist));picked.appendChild(t);picked.appendChild(button('Remove song',function(){draft.listening=null;paintSong();}));}
    query.addEventListener('input',function(){var version=++epoch;clearTimeout(timer);if(controller)controller.abort();results.replaceChildren();if(query.value.trim().length<2)return;timer=setTimeout(async function(){controller=new AbortController();results.textContent='Searching…';try{var tracks=await options.search(query.value.trim(),controller.signal);if(version!==epoch||!root.isConnected)return;results.replaceChildren();tracks.filter(function(t){return songUrl(t.trackViewUrl);}).slice(0,6).forEach(function(t){var song=options.normalize(t),b=button('',function(){draft.listening={title:song.title,artist:song.artist,url:songUrl(song.url),art:artUrl(song.art)};paintSong();query.value='';results.replaceChildren();epoch++;});b.appendChild(el('strong','',song.title));b.appendChild(el('span','',song.artist));results.appendChild(b);});if(!results.childNodes.length)results.textContent='No songs found. Try another search.';}catch(e){if(e.name!=='AbortError'&&version===epoch&&root.isConnected)results.textContent='Search unavailable. Try again.';}},280);});
    var save=button('Save profile details',async function(){if(uploading||saving)return;saving=true;save.disabled=true;paintPhotos();status.textContent='Saving…';try{var r=await options.api('/api/profile',{method:'POST',body:{city:user.city||'',profilePhotos:draft.profilePhotos.slice(),listening:draft.listening}});if(!r||!r.ok||!r.user)throw Error(r&&r.error||'Could not save profile.');options.saved(r.user);status.textContent='Profile details saved.';}catch(e){status.textContent=e.message||'Could not save profile.';}finally{saving=false;if(root.isConnected){save.disabled=false;paintPhotos();}}});root.appendChild(save);root.appendChild(status);paintPhotos();paintSong();container.appendChild(root);
    var observer=new MutationObserver(function(){if(!root.isConnected){epoch++;clearTimeout(timer);if(controller)controller.abort();observer.disconnect();}});observer.observe(document.body,{childList:true,subtree:true});return root;
  }
  window.MPProfiles={topBar:topBar,openBar:openBar,editor:editor};
})();
