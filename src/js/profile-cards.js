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
  /* Grim t535u: pinned photos are a native scroll-snap strip of square thumbnails (momentum flicks, no JS
     animation); arrow keys step one photo; data-index tracks the photo snapped at the start */
  function carousel(ids, origin) {
    var root = el('div', 'mp-profile-carousel'), deck = el('div', 'mp-profile-deck'), announce = el('span', 'mp-profile-sr'), index = 0, raf = 0;
    root.setAttribute('role', 'region'); root.setAttribute('aria-label', 'Pinned photos'); root.setAttribute('aria-roledescription', 'carousel'); deck.tabIndex = 0; deck.setAttribute('aria-label', 'Pinned photos, swipe or use arrow keys'); announce.setAttribute('aria-live', 'polite');
    var cards = ids.map(function (id, i) { var card = el('div', 'mp-profile-photo'), image = el('img'); image.src = origin + '/api/media/' + encodeURIComponent(id); image.alt = 'Pinned photo ' + (i + 1); image.draggable = false; image.loading = 'lazy'; image.decoding = 'async'; card.appendChild(image); deck.appendChild(card); return card; });
    function step() { return cards.length > 1 ? cards[1].offsetLeft - cards[0].offsetLeft : 1; }
    function sync() { raf = 0; var i = Math.max(0, Math.min(cards.length - 1, Math.round(deck.scrollLeft / step()))); if (deck.scrollWidth > deck.clientWidth + 2 && deck.scrollLeft + deck.clientWidth >= deck.scrollWidth - 2) i = cards.length - 1; if (i !== index || root.dataset.index == null) { index = i; root.dataset.index = i; announce.textContent = 'Photo ' + (i + 1) + ' of ' + cards.length; } }
    deck.addEventListener('scroll', function () { if (!raf) raf = requestAnimationFrame(sync); }, {passive:true});
    deck.addEventListener('keydown', function (e) { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); e.stopPropagation(); deck.scrollBy({left: (e.key === 'ArrowLeft' ? -1 : 1) * step(), behavior: reduced() ? 'auto' : 'smooth'}); } });
    root.dataset.index = 0; root.appendChild(deck); root.appendChild(announce); return root;
  }
  function details(user, options) {
    var out = el('div', 'mp-profile-details'), ids = photos(user), song = user.listening;
    if (ids.length) { var p = el('section', 'mp-profile-section mp-profile-photos'); p.appendChild(carousel(ids, options.origin)); out.appendChild(p); }
    if (song && song.title && song.artist) { var music = section('Listening'), card = el(songUrl(song.url) ? 'a' : 'div', 'mp-profile-song'); if (card.tagName === 'A') { card.href = songUrl(song.url); card.target = '_blank'; card.rel = 'noopener noreferrer'; } var art = artUrl(song.art); if (art) { var image = el('img'); image.src = art; image.alt = ''; image.loading = 'lazy'; card.appendChild(image); } else card.appendChild(el('span', 'mp-profile-song-note', '♫')); var copy = el('span', 'mp-profile-song-copy'); copy.appendChild(el('strong', '', song.title)); copy.appendChild(el('span', '', song.artist)); card.appendChild(copy); music.appendChild(card); out.appendChild(music); }
    if (user.city) { var city = el('section', 'mp-profile-section mp-profile-loc'); city.appendChild(el('p', 'mp-profile-city', user.city)); out.appendChild(city); }
    if (options.me) { if (!ids.length && !song && !user.city) out.appendChild(el('p', 'mp-profile-empty', 'Make this space yours with photos, a song, and your city.')); out.appendChild(button('Edit profile details', options.edit)); }
    else if (!ids.length && !song && !user.city) out.appendChild(el('p', 'mp-profile-empty', 'No photos, music, or city added yet.'));
    if (options.manage) out.appendChild(button('Manage user', options.manage));
    return out;
  }
  /* Grim (t529u): grow/shrink keeps the #48 tap anchoring. The stem tip stays on the tapped element, the
     side (above/below) is re-chosen by room, the card stays inside the visible viewport minus safe areas
     and below the top bars (falls back to the full viewport only when there's no room), and the
     scrolling body is capped to that room instead of pushing the card off its anchor. During the size
     animation the glass, outline and stem track the animated box every frame. */
  function topBars(vh) { var y = 0; document.querySelectorAll('.panel.on .chat-head, .nav').forEach(function (h) { var r = h.getBoundingClientRect(), cs = getComputedStyle(h); if (r.height && cs.visibility !== 'hidden' && cs.display !== 'none' && r.bottom > y && r.bottom < vh / 2) y = r.bottom; }); return y; }
  function resize(b, options, old) {
    if (!b.isConnected || !b._a) return;
    var vv = window.visualViewport, ox = vv ? vv.offsetLeft : 0, oy = vv ? vv.offsetTop : 0, vw = vv ? vv.width : innerWidth, vh = vv ? vv.height : innerHeight;
    var ins = options.insets ? options.insets() : {t:0,r:0,b:0,l:0}, M = 10, TH = options.stem || 13, wasBelow = b.classList.contains('is-below');
    var minX = ox + ins.l + M, maxX = ox + vw - ins.r - M, minY0 = oy + ins.t + M, maxY = oy + vh - ins.b - M, minY = Math.max(minY0, topBars(vh) + 8);
    var expanded = b.classList.contains('is-expanded'), body = b.querySelector('.mp-pb-body');
    if (b._profileAnimation) { b._profileAnimation.cancel(); b._profileAnimation = null; }
    b.classList.remove('is-sizing', 'is-capped');
    b.style.width = expanded ? Math.min(340, maxX - minX) + 'px' : '';
    body.style.maxHeight = '';
    var w = b.offsetWidth, h = b.offsetHeight, r = b._a.getBoundingClientRect(), t = b._tap, tx = t ? t.x : r.left + r.width / 2, ty = t ? t.y : r.top + r.height / 2;
    var tipB = (t ? Math.min(r.bottom, ty + 28) : r.bottom) + 4, tipA = (t ? Math.max(r.top, ty - 28) : r.top) - 4;
    function rooms(top) { return [maxY - tipB - TH, tipA - TH - top]; }
    var rm = rooms(minY);
    // the bars only limit the card while it can still be at least as tall as the compact card
    if (Math.max(rm[0], rm[1]) < Math.min(h, Math.max(old ? old.height : 0, 220))) { minY = minY0; rm = rooms(minY); }
    var below = h <= rm[0] || (h > rm[1] && rm[0] >= rm[1]), room = Math.max(120, below ? rm[0] : rm[1]);
    b.classList.toggle('is-capped', h > room);
    if (h > room) { body.style.maxHeight = Math.floor(room) + 'px'; h = b.offsetHeight; }
    var top = below ? tipB + TH : tipA - TH - h, left = w > maxX - minX ? minX + (maxX - minX - w) / 2 : Math.max(minX, Math.min(tx - w / 2, maxX - w));
    b.classList.toggle('is-below', below); b.classList.toggle('is-above', !below);
    b.style.left = left + 'px'; b.style.top = top + 'px';
    b.style.setProperty('--ay', (below ? -TH : h + TH) + 'px');
    function mask() { var q = b.getBoundingClientRect(), ax = Math.max(26, Math.min(tx - q.left, q.width - 26)); b.style.setProperty('--ax', ax + 'px'); options.mask(q.width, q.height, ax, below); }
    if (old && !reduced() && b.animate && wasBelow === below) {
      b.classList.add('is-sizing');
      var a = b.animate([{width:old.width+'px',height:old.height+'px',left:old.left+'px',top:old.top+'px'},{width:w+'px',height:h+'px',left:left+'px',top:top+'px'}], {duration:300,easing:'cubic-bezier(.2,.8,.2,1)'});
      b._profileAnimation = a;
      var tick = function () { if (b._profileAnimation !== a) return; if (!b.isConnected || b.classList.contains('is-out')) { a.cancel(); return; } mask(); requestAnimationFrame(tick); };
      var done = function () { if (b._profileAnimation !== a) return; b._profileAnimation = null; b.classList.remove('is-sizing'); mask(); };
      a.onfinish = done; a.oncancel = function () { if (b._profileAnimation === a) { b._profileAnimation = null; b.classList.remove('is-sizing'); } };
      mask(); requestAnimationFrame(tick);
    } else {
      mask();
      if (old && !reduced() && b.animate) b.querySelector('.mp-pb-scale').animate([{opacity:.4,transform:'scale(.97)'},{opacity:1,transform:'none'}], {duration:220,easing:'cubic-bezier(.2,.8,.2,1)'});
    }
  }
  function toggle(b, user, options) {
    var old = b.getBoundingClientRect(), expanded = !b.classList.contains('is-expanded'), full = b.querySelector('.mp-pb-full');
    if (b._profileDetails) b._profileDetails.remove(); b.classList.toggle('is-expanded', expanded); full.setAttribute('aria-expanded', expanded ? 'true' : 'false'); full.querySelector('span').textContent = expanded ? 'Show less' : 'Full profile';
    if (expanded) { b._profileDetails = details(user, options); b.querySelector('.mp-pb-body').appendChild(b._profileDetails); }
    b._profileOptions = options; resize(b, options, old);
  }
  function refresh(b, user) { if (!b.classList.contains('is-expanded') || !b._profileOptions) return; b._profileDetails.remove(); b._profileDetails = details(user, b._profileOptions); b.querySelector('.mp-pb-body').appendChild(b._profileDetails); resize(b, b._profileOptions); }
  function readPhoto(file) {
    return new Promise(function (resolve, reject) { if (!file || !/^image\/(jpeg|png|webp|gif)$/.test(file.type) || file.size > 8 * 1024 * 1024) return reject(Error('Choose a JPEG, PNG, WebP, or GIF under 8 MB.')); var reader = new FileReader(); reader.onerror = function () { reject(Error('Could not read this photo.')); }; reader.onload = function () { var image = new Image(); image.onerror = function () { reject(Error('Could not open this photo.')); }; image.onload = function () { try { var scale = Math.min(1, 1400 / Math.max(image.width, image.height)), canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(image.width * scale)); canvas.height = Math.max(1, Math.round(image.height * scale)); var ctx = canvas.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0,0,canvas.width,canvas.height); ctx.drawImage(image,0,0,canvas.width,canvas.height); resolve(canvas.toDataURL('image/jpeg', .88)); } catch (_) { reject(Error('Could not prepare this photo.')); } }; image.src = reader.result; }; reader.readAsDataURL(file); });
  }
  function editor(container, user, options) {
    var root = section('Expanded profile'), draft = {profilePhotos:photos(user),listening:user.listening ? Object.assign({},user.listening) : null}, slots = el('div', 'mp-profile-edit-photos'), status = el('p','mp-profile-edit-status'), upload = el('input'), selected = 0, uploading = false, saving = false, epoch = 0, timer, controller;
    root.classList.add('mp-profile-editor'); root.id = 'mp-profile-editor-'+(++seq); status.setAttribute('role','status'); status.setAttribute('aria-live','polite'); upload.type='file'; upload.accept='image/jpeg,image/png,image/webp,image/gif'; upload.hidden=true;
    root.appendChild(el('p','mp-profile-edit-hint','Pin up to three photos. Swipe order follows the numbers.')); root.appendChild(slots); root.appendChild(upload);
    function paintPhotos() { slots.replaceChildren(); for(var i=0;i<3;i++) (function(i){var slot=el('div','mp-profile-edit-slot'), choose=button(draft.profilePhotos[i]?'Replace photo '+(i+1):'Add photo '+(i+1),function(){selected=Math.min(i,draft.profilePhotos.length);upload.value='';upload.click();});choose.disabled=uploading||saving; if(draft.profilePhotos[i]){var img=el('img');img.src=options.origin+'/api/media/'+encodeURIComponent(draft.profilePhotos[i]);img.alt='Pinned photo '+(i+1);choose.textContent='';choose.setAttribute('aria-label','Replace pinned photo '+(i+1));choose.appendChild(img);slot.appendChild(choose);var remove=button('Remove',function(){draft.profilePhotos.splice(i,1);paintPhotos();});remove.disabled=uploading||saving;slot.appendChild(remove);if(i){var move=button('←',function(){var x=draft.profilePhotos[i-1];draft.profilePhotos[i-1]=draft.profilePhotos[i];draft.profilePhotos[i]=x;paintPhotos();});move.setAttribute('aria-label','Move photo '+(i+1)+' earlier');move.disabled=uploading||saving;slot.appendChild(move);}}else slot.appendChild(choose);slots.appendChild(slot);})(i); }
    upload.addEventListener('change',async function(){var file=upload.files&&upload.files[0];if(!file)return;uploading=true;save.disabled=true;paintPhotos();status.textContent='Uploading photo…';try{var data=await readPhoto(file),r=await options.api('/api/media',{method:'POST',body:{kind:'image',dataUrl:data,filename:file.name}});if(!r||!r.ok||!r.id)throw Error(r&&r.error||'Could not upload photo.');draft.profilePhotos[selected]=r.id;status.textContent='Photo ready. Save profile details to pin it.';}catch(e){status.textContent=e.message||'Could not upload photo.';}finally{uploading=false;if(root.isConnected){save.disabled=saving;paintPhotos();}}});
    var cityLabel=el('label','mp-profile-field','City'),city=el('input');city.type='text';city.maxLength=80;city.value=user.city||'';city.placeholder='City, country';cityLabel.appendChild(city);root.appendChild(cityLabel);
    var songLabel=el('label','mp-profile-field','Listening'),query=el('input');query.type='search';query.placeholder='Search songs or artists';query.autocomplete='off';songLabel.appendChild(query);root.appendChild(songLabel);var picked=el('div','mp-profile-picked'),results=el('div','mp-profile-song-results');root.appendChild(picked);root.appendChild(results);
    function paintSong(){picked.replaceChildren();if(!draft.listening)return;var t=el('div','mp-profile-picked-copy');t.appendChild(el('strong','',draft.listening.title));t.appendChild(el('span','',draft.listening.artist));picked.appendChild(t);picked.appendChild(button('Remove song',function(){draft.listening=null;paintSong();}));}
    query.addEventListener('input',function(){var version=++epoch;clearTimeout(timer);if(controller)controller.abort();results.replaceChildren();if(query.value.trim().length<2)return;timer=setTimeout(async function(){controller=new AbortController();results.textContent='Searching…';try{var tracks=await options.search(query.value.trim(),controller.signal);if(version!==epoch||!root.isConnected)return;results.replaceChildren();tracks.filter(function(t){return songUrl(t.trackViewUrl);}).slice(0,6).forEach(function(t){var song=options.normalize(t),b=button('',function(){draft.listening={title:song.title,artist:song.artist,url:songUrl(song.url),art:artUrl(song.art)};paintSong();query.value='';results.replaceChildren();epoch++;});b.appendChild(el('strong','',song.title));b.appendChild(el('span','',song.artist));results.appendChild(b);});if(!results.childNodes.length)results.textContent='No songs found. Try another search.';}catch(e){if(e.name!=='AbortError'&&version===epoch&&root.isConnected)results.textContent='Search unavailable. Try again.';}},280);});
    var save=button('Save profile details',async function(){if(uploading||saving)return;saving=true;save.disabled=true;paintPhotos();status.textContent='Saving…';try{var r=await options.api('/api/profile',{method:'POST',body:{city:city.value.trim(),profilePhotos:draft.profilePhotos.slice(),listening:draft.listening}});if(!r||!r.ok||!r.user)throw Error(r&&r.error||'Could not save profile.');options.saved(r.user);status.textContent='Profile details saved.';}catch(e){status.textContent=e.message||'Could not save profile.';}finally{saving=false;if(root.isConnected){save.disabled=false;paintPhotos();}}});root.appendChild(save);root.appendChild(status);paintPhotos();paintSong();container.appendChild(root);
    var observer=new MutationObserver(function(){if(!root.isConnected){epoch++;clearTimeout(timer);if(controller)controller.abort();observer.disconnect();}});observer.observe(document.body,{childList:true,subtree:true});return root;
  }
  window.MPProfiles={place:function(b,o){resize(b,o);},toggle:toggle,refresh:refresh,editor:editor,dispose:function(b){if(b._profileAnimation)b._profileAnimation.cancel();}};
})();
