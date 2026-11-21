/* Whop checkout page for VIP, Stars (?product=stars&pack=N) and the clothing bag (?product=cart&lines=[...]). Price, identity and fulfillment belong to the server. */
(function () {
  'use strict';
  const button = document.getElementById('begin');
  const status = document.getElementById('message');
  const mount = document.getElementById('checkout');
  const cancelTest = document.getElementById('cancel-test');
  if (!button || !status || !mount) return;
  const productionHost = ['misereperdue.com', 'www.misereperdue.com'].includes(location.hostname);
  // misereperdue.com is always live (the sandbox API only accepts preview origins, so sandbox there could never work;
  // links that lost ?checkout=1 used to land on a dead sandbox page). Previews/localhost stay sandbox.
  const live = productionHost;
  const api = live ? 'https://api.misereperdue.com' : 'https://whop-staging.misereperdue.com';
  // Sheet mode: shown inside the site's own payment sheet (per dc). Compact, starts checkout immediately,
  // and tells the site when VIP is confirmed so it can close the sheet.
  const sheet = new URLSearchParams(location.search).get('sheet') === '1' && window.parent !== window;
  const warmOnly = sheet && new URLSearchParams(location.search).get('warm') === '1';
  if (sheet) document.documentElement.classList.add('mp-sheet');
  if (sheet && /[?&]dock=1/.test(location.search)) document.documentElement.classList.add('mp-dock');
  var startWanted = sheet && !warmOnly;
  const returnUrl = location.origin + '/whop-vip-preview' + (live ? '?checkout=1' : '') + (sheet ? (live ? '&' : '?') + 'sheet=1' : '');
  function notify(kind, extra) { if (sheet) try { window.parent.postMessage(Object.assign({mpWhop:kind}, extra || {}), location.origin); } catch (_) {} }
  // The sheet sizes itself to this page (up to its max height).
  if (sheet && window.ResizeObserver) new ResizeObserver(function () { notify('height', {h: Math.ceil(document.querySelector('.wrap').getBoundingClientRect().height)}); }).observe(document.querySelector('.wrap'));
  if (sheet) {
    // The parent paints one scrim over the whole sheet (including the grabber strip this iframe cannot cover).
    var overlayOn = false;
    function syncOverlay() {
      var open = !!document.querySelector('dialog[data-element-overlay][open]');
      if (open === overlayOn) return;
      overlayOn = open;
      notify('overlay', {open: open});
    }
    new MutationObserver(function () {
      document.querySelectorAll('dialog[data-element-overlay]').forEach(function (d) {
        if (d.__mpBound) return;
        d.__mpBound = true;
        d.addEventListener('close', syncOverlay);
        d.addEventListener('cancel', syncOverlay);
      });
      syncOverlay();
    }).observe(document.documentElement, {subtree: true, childList: true, attributes: true, attributeFilter: ['open']});
    window.addEventListener('message', function (e) {
      if (e.origin !== location.origin || !e.data) return;
      if (e.data.mpWhop === 'peek') document.documentElement.classList.toggle('mp-peek', !!e.data.on);
      if (e.data.mpWhop === 'start') {
        if (startWanted && window.__mpWhopBegin) return;
        startWanted = true;
        if (window.__mpWhopBegin) window.__mpWhopBegin();
      }
    });
  }
  const skel = document.getElementById('skel');
  const receipt = document.getElementById('receipt');
  function dark() { return document.documentElement.getAttribute('data-theme') === 'dark'; }
  // Whop's frame is styled to read as part of the page: monotone, the site's own button, no repeated seller/item lines
  // (the receipt above names the item; Whop's live total, which includes any tax, stays visible).
  function appearance() {
    const d = dark(), ink = d ? '#f5f5f7' : '#1c1c1e', hair = d ? 'rgba(255,255,255,.14)' : 'rgba(0,0,0,.1)', field = d ? 'rgba(255,255,255,.05)' : '#fff';
    const input = {background:field, borderColor:hair, borderRadius:'12px'};
    return {theme:{appearance:d ? 'dark' : 'light', accentColor:'gray', grayColor:'slate'}, variables:{'--radius':'12px'}, classes:{
      'whop-Checkout':{background:'transparent'}, 'whop-CheckoutLayout':{background:'transparent'}, 'whop-CheckoutCollection':{background:'transparent'},
      'whop-CheckoutDetails':{background:'transparent'}, 'whop-CheckoutSummary':{background:'transparent'},
      'whop-CheckoutSeller':{display:'none'}, 'whop-CheckoutSellerLogo':{display:'none'}, 'whop-CheckoutItem':{display:'none'}, 'whop-CheckoutItemHeadline':{display:'none'},
      'whop-CheckoutTotal':{fontSize:'34px', fontWeight:'600', letterSpacing:'-0.02em', color:ink},
      // fields use Whop's own styling (overrides misplaced the card brand and address search icons)
      // Whop's live total (tax included once known) is the one price figure on the sheet
      'whop-CheckoutPriceContext':{fontSize:'13px'},
      'whop-PaymentMethods':{background:'transparent'}, 'whop-PaymentMethod':{background:'transparent'}, 'whop-PaymentMethodRow':{background:'transparent'},
      'whop-PaymentMethodDetail':{background:'transparent'}, 'whop-PaymentCardFields':{background:'transparent'}, 'whop-PaymentBillingBlock':{background:'transparent'},
      'whop-PaymentMethodSeparated':{background:'transparent', borderColor:hair, borderRadius:'14px'},
      'whop-CheckoutPayButton':{background:d ? '#dfe5ee' : '#0a1230', color:d ? '#111a32' : '#ffffff', borderRadius:'999px', height:'44px', fontSize:'15px', fontWeight:'600'}
    }};
  }
  function showDone(text, title) {
    if (starsPack) dropSess('stars', starsPack); else dropSess('vip');
    if (skel) skel.hidden = true; mount.hidden = true; button.hidden = true; status.textContent = '';
    if (receipt) receipt.hidden = true;
    let box = document.querySelector('.done');
    if (!box) { box = document.createElement('div'); box.className = 'done'; box.innerHTML = '<svg viewBox="0 0 56 56" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="28" cy="28" r="26"/><path d="M17 29l7.5 7.5L39 21"/></svg><h2></h2><p></p>'; receipt.after(box); }
    box.querySelector('h2').textContent = title || 'You\u2019re VIP';
    box.querySelector('p').textContent = text || 'Welcome to MIS\u00c8RE PERDUE.';
    var closeBtn = box.querySelector('.done-close');
    if (sheet) {
      if (!closeBtn) {
        closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'done-close';
        closeBtn.textContent = 'Close';
        closeBtn.addEventListener('click', function () { notify('close'); });
        box.appendChild(closeBtn);
      }
    } else if (closeBtn) closeBtn.remove();
    notify('done');
    // Whop can finish a payment outside the sheet (wallets, bank checks) and land here as a full page: once the
    // purchase is confirmed, go back to the shop instead of leaving the buyer on this page.
    if (!sheet && new URLSearchParams(location.search).get('sheet') === '1') setTimeout(function () { location.replace('/#shop'); }, 2600);
  }
  const tag = document.querySelector('.tag');
  if (tag) tag.textContent = live ? 'VIP' : 'SANDBOX PREVIEW';
  const price = document.querySelector('.price strong');
  const renewal = document.querySelector('.renew b');
  const pricingNote = document.getElementById('pricing-note');
  if (price) price.textContent = live ? 'CA$13.98' : 'CA$10';
  if (renewal) renewal.textContent = live ? 'CA$3.99' : 'CA$3';
  if (pricingNote) pricingNote.textContent = live ? 'Cancel anytime from your profile. Any tax is added to the total below before you pay.' : 'Sandbox checkout uses test payments.';
  button.textContent = live ? 'Continue to payment' : 'Test sandbox checkout';
  let mounted = false;
  function token() {
    // Sandbox sessions never reuse the production account token.
    return localStorage.getItem(live ? 'chat_token' : 'whop_sandbox_token');
  }
  async function request(path, init = {}) {
    const response = await fetch(api + path, {...init, headers:{Authorization:'Bearer '+token(), 'Content-Type':'application/json'}, signal:AbortSignal.timeout(12000), cache:'no-store'});
    const body = await response.json();
    if (!response.ok || !body.ok) throw new Error(body.error || 'Checkout is unavailable. Please try again later.');
    return body;
  }
  function sessKey(kind, n) { return 'mp_whop_sess_' + kind + (n ? '_' + n : ''); }
  function readSess(kind, n) {
    try {
      const s = JSON.parse(sessionStorage.getItem(sessKey(kind, n)) || 'null');
      if (s && typeof s.id === 'string' && /^ch_[A-Za-z0-9_-]+$/.test(s.id) && Date.now() - s.at < 8 * 60 * 1000) return s.id;
    } catch (_) {}
    return '';
  }
  function writeSess(kind, n, id, info) { try { sessionStorage.setItem(sessKey(kind, n), JSON.stringify({ id: id, at: Date.now(), info: info || null })); } catch (_) {} }
  function readInfo(kind, n) { try { const s = JSON.parse(sessionStorage.getItem(sessKey(kind, n)) || 'null'); return s && s.info || null; } catch (_) { return null; } }
  // Native checkout (dc t658u): the server's checkout answer says whether our own payment step (Whop Payment
  // Elements) is on, and names the public account and plan ids it mounts with. Price and charge stay server-side.
  function nativeInfo(body, product, displayTotal, payLabel) {
    if (!body || body.elements !== true || !/^biz_[A-Za-z0-9]{8,}$/.test(body.accountId || '') || !/^plan_[A-Za-z0-9]+$/.test(body.planId || '')) return null;
    return {elements:true, accountId:body.accountId, planId:body.planId, product:product, displayTotal:displayTotal, payLabel:payLabel};
  }
  function nativeAppearance() {
    const d = dark();
    return {theme:{appearance:d ? 'dark' : 'light', accentColor:'gray', grayColor:'slate', successColor:'green'}, variables:{'--radius':'14px'}};
  }
  function mountAny(info, configId, ret, onComplete, onFail) {
    if (info && info.elements === true && live && window.MPNativeCheckout && typeof window.WhopElements === 'function') {
      destroyCheckout();
      const gen = checkoutGen;
      button.hidden = true; if (skel) skel.hidden = false; mount.hidden = false; mount.classList.remove('loading');
      document.documentElement.classList.add('mp-native');
      try {
        activeCheckout = window.MPNativeCheckout.mount({el:mount, whop:window.WhopElements({}), product:info.product, checkoutId:configId, accountId:info.accountId, planId:info.planId,
          displayTotal:info.displayTotal, payLabel:info.payLabel, canSave:!!token() && info.product !== 'cart', signedIn:!!token(), returnUrl:ret, appearance:nativeAppearance, request:request,
          onReady:function () { if (gen !== checkoutGen) return; if (skel) skel.hidden = true; notify('ready'); },
          onPaid:function (st) { if (gen !== checkoutGen) return; mount.hidden = true; onComplete(st); },
          fallback:function () { if (gen !== checkoutGen) return; document.documentElement.classList.remove('mp-native'); activeCheckout = null; mountCheckout(configId, ret, onComplete, onFail); }});
        return;
      } catch (_) { document.documentElement.classList.remove('mp-native'); activeCheckout = null; }
    }
    mountCheckout(configId, ret, onComplete, onFail);
  }
  function dropSess(kind, n) { try { sessionStorage.removeItem(sessKey(kind, n)); } catch (_) {} }
  // Mounts Whop's checkout for a server-made configuration, styled to the page, behind the matching placeholder.
  // Exactly one embed: destroy any previous instance first, and ignore late callbacks from it.
  var checkoutGen = 0, activeCheckout = null, themeObs = null;
  function destroyCheckout() {
    checkoutGen += 1;
    if (themeObs) { try { themeObs.disconnect(); } catch (_) {} themeObs = null; }
    var inst = activeCheckout;
    activeCheckout = null;
    if (inst) {
      try {
        if (typeof inst.unmount === 'function') inst.unmount();
        else if (typeof inst.destroy === 'function') inst.destroy();
        else if (inst.checkout && typeof inst.checkout.unmount === 'function') inst.checkout.unmount();
      } catch (_) {}
    }
    mount.innerHTML = '';
  }
  function mountCheckout(configId, ret, onComplete, onFail) {
    destroyCheckout();
    var gen = checkoutGen;
    const checkout=window.WhopElements(live ? {} : {environment:'sandbox'}).checkout.create({checkoutConfiguration:configId,returnUrl:ret,appearance:appearance(),
      onComplete:function(){ if (gen !== checkoutGen) return; mount.hidden=true; onComplete(); }});
    activeCheckout = checkout;
    button.hidden=true;
    if (skel) skel.hidden=false;
    mount.hidden=false;
    mount.classList.add('loading');
    var settled = false;
    function finish(ok) {
      if (gen !== checkoutGen || settled) return;
      settled = true;
      clearTimeout(hangTimer);
      if (skel) skel.hidden = true;
      mount.classList.remove('loading');
      notify('ready');
      if (!ok) {
        destroyCheckout();
        mount.hidden = true;
        if (typeof onFail === 'function') onFail();
      }
    }
    var hangTimer = setTimeout(function () {
      if (gen !== checkoutGen) return;
      // Form already painted but onReady was late: keep it, do not mount a second embed.
      if (mount.childNodes.length) finish(true);
      else finish(false);
    }, 4000);
    checkout.create('checkout',{onReady:function(){ finish(true); }, onError:function(){ finish(false); }}).mount('#checkout');
    themeObs = new MutationObserver(function(){ if (gen !== checkoutGen) return; try { checkout.update({appearance:appearance()}); } catch (_) {} });
    themeObs.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
  }
  function testMode(state) { return !!state.ownerWhopTest && state.checkoutProvider !== 'whop'; }
  function showTestSubscription(state) {
    if (testMode(state)) {
      if (tag) tag.textContent = 'PRIVATE LIVE TEST';
      button.textContent='Start separate live test';
      if (pricingNote) pricingNote.textContent='This is a separate real subscription for testing. Your existing VIP stays unchanged. Whop calculates taxes, currency conversion and buyer fees before payment.';
    }
    const test = state.ownerWhopTestSubscription;
    if (!test || !['active','revoked'].includes(test.status) || !testMode(state)) return false;
    button.hidden=true; mount.hidden=true; if (skel) skel.hidden=true;
    if (cancelTest) cancelTest.hidden=test.status!=='active'||test.cancelled;
    status.textContent=test.status==='revoked' ? 'The live test subscription has ended. Your existing VIP is unchanged.'
      : test.cancelled ? 'Test renewal has been stopped. Your existing VIP is unchanged.'
      : 'Live test payment confirmed. Your existing VIP is unchanged. You can stop renewal of the separate test subscription below.';
    return true;
  }
  if (cancelTest) cancelTest.addEventListener('click',async function () {
    cancelTest.disabled=true;status.textContent='Stopping test renewal…';
    try {showTestSubscription(await request('/api/whop/vip/test/cancel',{method:'POST',body:'{}'}));}
    catch(error){status.textContent=error.message||'Unable to stop test renewal.';}
    finally {cancelTest.disabled=false;}
  });
  const params = new URLSearchParams(location.search);
  // Stars (per dc: "Purchase Stars" opens this sheet). Each purchase is credited by the server after it verifies
  // the payment with Whop; the browser only names the pack and asks the server to check.
  const STARS_PRICES = {500:4.99, 1100:9.99, 2400:19.99, 6500:49.99};
  const starsPack = params.get('product') === 'stars' ? Number(params.get('pack')) : 0;
  if (params.get('product') === 'stars') { runStars(starsPack); return; }
  if (params.get('product') === 'cart') { runCart(); return; }
  // Clothing bag (per dc): the cart page's Purchase opens this sheet. It shows the bag, asks for the shipping address,
  // then the server prices the bag and makes the payment. The address is remembered on this device only.
  function runCart() {
    document.title = 'Checkout — MISÈRE PERDUE';
    if (tag) tag.textContent = 'ORDER';
    const art = document.querySelector('.rc-art'), h1 = document.querySelector('h1'), sub = document.querySelector('.rc-sub');
    const fine = document.querySelector('.fine.page');
    if (fine) fine.innerHTML = 'Payment is confirmed by our server before your order is placed. <a href="/#shop">Return to shop</a>';
    let lines = [];
    try { lines = JSON.parse(params.get('lines') || '[]').filter(function (l) { return l && typeof l.id === 'string' && l.qty > 0; }).slice(0, 10); } catch (_) {}
    if (h1) h1.textContent = 'Your order';
    if (sub) sub.textContent = '';
    button.textContent = 'Continue to payment';
    if (skel) skel.hidden = true;
    if (!lines.length) { status.textContent = 'Your bag is empty.'; button.hidden = true; notify('ready'); return; }
    if (!live) { status.textContent = 'Checkout runs on misereperdue.com.'; button.hidden = true; notify('ready'); return; }
    const money = function (v) { return 'CA$' + (Math.round(v * 100) / 100).toFixed(2).replace(/\.00$/, ''); };
    // Bag summary from the catalog (display only: the server sets the price)
    const list = document.createElement('ul'); list.className = 'cart-lines';
    receipt.appendChild(list);
    fetch('/data/catalog.json?v=2', { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(function (d) {
      const by = {}; (d.products || []).forEach(function (p) { by[p.id] = p; });
      let total = 0, count = 0;
      list.innerHTML = '';
      lines.forEach(function (l) {
        const p = by[l.id]; if (!p) return;
        const unit = Number(p.priceRange && p.priceRange.minVariantPrice.amount || 0);
        total += unit * l.qty; count += l.qty;
        const li = document.createElement('li');
        li.innerHTML = '<img alt=""><span></span><b></b>';
        if (p.featuredImage) li.firstChild.src = p.featuredImage.url; else li.firstChild.remove();
        li.querySelector('span').textContent = p.title + (l.qty > 1 ? ' × ' + l.qty : '');
        li.querySelector('b').textContent = money(unit * l.qty);
        list.appendChild(li);
        if (art && art.isConnected && p.featuredImage && !art.dataset.set) { art.src = p.featuredImage.url; art.dataset.set = '1'; }
      });
      if (sub) sub.textContent = count + (count === 1 ? ' item' : ' items') + ' · ' + money(total);
      if (pricingNote) pricingNote.textContent = 'Any tax is added to the total below before you pay.';
      // header art: the bag's photos fanned out (up to three)
      const pics = []; lines.forEach(function (l) { const p = by[l.id]; if (p && p.featuredImage && pics.indexOf(p.featuredImage.url) < 0) pics.push(p.featuredImage.url); });
      if (art && pics.length > 1) { const stack = document.createElement('div'); stack.className = 'rc-stack n' + Math.min(3, pics.length); pics.slice(0, 3).forEach(function (u) { const im = document.createElement('img'); im.src = u; im.alt = ''; stack.appendChild(im); }); art.replaceWith(stack); }
    }).catch(function () {});
    // Whop's payment form asks for the shipping address (per dc: no second address form here).
    notify('ready');
    const ret = location.origin + '/whop-vip-preview?checkout=1&product=cart' + (sheet ? '&sheet=1' : '');
    if (params.has('status') || params.has('complete')) {
      button.hidden = true;
      if (params.get('status') === 'failed' || params.get('status') === 'canceled') { status.textContent = params.get('status') === 'failed' ? 'Payment was unsuccessful. You can try again from your bag.' : 'Checkout was canceled.'; return; }
      showDone('We emailed your receipt. We’ll email again when it ships.', 'Order placed');
      return;
    }
    let started = false;
    button.addEventListener('click', async function () {
      if (started || button.disabled) return;
      button.disabled = true; status.textContent = '';
      try {
        if (typeof window.WhopElements !== 'function') throw new Error('The payment form could not load. Please reload this page.');
        const body = await request('/api/whop/cart/checkout', { method: 'POST', body: JSON.stringify({ lines: lines }) });
        if (!/^ch_[A-Za-z0-9_-]+$/.test(body.checkoutConfigurationId || '')) throw new Error('The checkout could not be verified.');
        started = true;
        mountAny(nativeInfo(body, 'cart', Number(body.total) || 0, 'Place order'), body.checkoutConfigurationId, ret, function () {
          showDone('We emailed your receipt. We’ll email again when it ships.', 'Order placed');
        }, function () {
          started = false; button.disabled = false; button.hidden = false;
          if (skel) skel.hidden = true;
          status.textContent = 'Checkout couldn’t load. Please try again.';
        });
      } catch (error) { status.textContent = error.message || 'Unable to load checkout.'; button.disabled = false; button.hidden = false; if (skel) skel.hidden = true; notify('ready'); }
    });
    window.__mpWhopBegin = function () { button.click(); };
    if (sheet) { button.hidden = true; if (skel) skel.hidden = false; button.click(); }
  }
  function runStars(n) {
    const fmt = function (v) { return Number(v).toLocaleString('en-US'); };
    document.title = 'Stars Checkout \u2014 MIS\u00c8RE PERDUE';
    if (tag) tag.textContent = 'STARS';
    const art = document.querySelector('.rc-art'), h1 = document.querySelector('h1'), sub = document.querySelector('.rc-sub');
    function setArt() { if (art && STARS_PRICES[n]) art.src = '/img/stars-variant-' + n + '-' + (dark() ? 'dark' : 'light') + '.jpg?v=2'; }
    setArt(); new MutationObserver(setArt).observe(document.documentElement, {attributes:true, attributeFilter:['data-theme']});
    if (h1) h1.textContent = STARS_PRICES[n] ? fmt(n) + ' Stars' : 'Stars';
    if (sub) sub.textContent = 'Added to your account right after payment';
    if (pricingNote) pricingNote.textContent = 'Stars are non-refundable once added. Any tax is added to the total below before you pay.';
    const fine = document.querySelector('.fine.page');
    if (fine) fine.innerHTML = 'Payment is confirmed by our server before Stars are added. <a href="/#shop">Return to shop</a>';

    button.textContent = 'Continue to payment';
    if (!STARS_PRICES[n]) { status.textContent = 'Choose a Stars pack in the shop.'; button.hidden = true; return; }
    if (!live) { status.textContent = 'Stars checkout runs on misereperdue.com.'; button.hidden = true; return; }
    const ret = location.origin + '/whop-vip-preview?checkout=1&product=stars&pack=' + n + (sheet ? '&sheet=1' : '');
    async function confirmStars(paid) {
      for (let attempt = 0; attempt < (paid ? 10 : 1); attempt++) {
        try {
          const s = await request('/api/whop/stars/sync', {method:'POST', body:'{}'});
          if (s.credited > 0 || s.latestPaid) { showDone('Your balance is ' + fmt(s.points) + '.', fmt(n) + ' stars added to your account'); return; }
        } catch (_) { status.textContent = 'We couldn\u2019t check your Stars. They appear as soon as payment is confirmed.'; return; }
        if (!paid) break;
        await new Promise(function (r) { setTimeout(r, 1500); });
      }
      status.textContent = 'Payment received. Your Stars will appear shortly.';
    }
    if (params.has('status') || params.has('complete')) {
      if (params.get('status') === 'failed' || params.get('status') === 'canceled') { status.textContent = params.get('status') === 'failed' ? 'Payment was unsuccessful. You can try again.' : 'Checkout was canceled.'; return; }
      button.hidden = true; status.textContent = 'Adding your Stars\u2026';
      if (token()) confirmStars(true); else status.textContent = 'Sign in to see your Stars.';
      return;
    }
    let started = false;
    button.addEventListener('click', async function () {
      if (started || button.disabled) return;
      if (!token()) { status.textContent = 'Sign in to MIS\u00c8RE PERDUE before buying Stars.'; button.hidden = false; if (skel) skel.hidden = true; return; }
      button.disabled = true; status.textContent = '';
      try {
        const st = await request('/api/whop/stars/status');
        if (!st.enabled) throw new Error('Stars checkout is not available yet.');
        if (Math.abs(Number(st.packs && st.packs[n]) - STARS_PRICES[n]) > 0.001) throw new Error('Stars pricing has changed. Checkout has not been opened.');
        if (typeof window.WhopElements !== 'function') throw new Error('The payment form could not load. Please reload this page.');
        function useId(id, fromCache, info) {
          mountAny(info, id, ret, function () { dropSess('stars', n); status.textContent = 'Adding your Stars\u2026'; confirmStars(true); }, function () {
            dropSess('stars', n);
            if (fromCache) {
              started = false; button.disabled = false;
              button.click();
              return;
            }
            started = false; button.disabled = false; button.hidden = false;
            if (skel) skel.hidden = true;
            status.textContent = 'Checkout couldn\u2019t load. Please try again.';
          });
          started = true;
        }
        const cached = readSess('stars', n);
        if (cached) useId(cached, true, readInfo('stars', n));
        else {
          const body = await request('/api/whop/stars/checkout', {method:'POST', body:JSON.stringify({pack:n})});
          if (!/^ch_[A-Za-z0-9_-]+$/.test(body.checkoutConfigurationId || '') || body.pack !== n) throw new Error('The checkout could not be verified.');
          const info = nativeInfo(body, 'stars', STARS_PRICES[n], 'Buy Stars');
          writeSess('stars', n, body.checkoutConfigurationId, info);
          useId(body.checkoutConfigurationId, false, info);
        }
      } catch (error) { status.textContent = error.message || 'Unable to load checkout.'; button.disabled = false; button.hidden = false; if (skel) skel.hidden = true; notify('ready'); }
    });
    window.__mpWhopBegin = function () { button.click(); };
    if (sheet) {
      button.hidden = true; if (skel) skel.hidden = false;
      if (warmOnly && !startWanted) notify('warm');
      if (!warmOnly || startWanted) button.click();
    }
  }
  if (params.has('status') || params.has('complete')) {
    status.textContent = params.get('status') === 'failed' ? 'Payment was unsuccessful. You can try the same checkout again.' : params.get('status') === 'canceled' ? 'Checkout was canceled. You have not been upgraded.' : 'Checking your VIP membership…';
    if (token()) confirmVip(params.get('status') === 'succeeded');
    else status.textContent='Sign in to check your VIP membership.';
  }
  // Browser status is only a hint. Access is read from the authenticated API.
  async function confirmVip(paid) {
        for (let attempt=0;attempt<(paid ? 8 : 1);attempt++) {
          try {
            const state = await request('/api/whop/vip/sync',{method:'POST',body:'{}'});
            if (showTestSubscription(state)) return;
            if (state.checkoutProvider==='whop' && state.vip && state.provider === 'whop') {showDone();return;}
          } catch (_) {status.textContent='We couldn’t check your membership. Open your profile to check its status.';return;}
          if (!paid) break;
          await new Promise(resolve=>setTimeout(resolve,1500));
        }
        status.textContent='Your VIP membership has not been confirmed yet. Check your profile before starting another checkout.';
  }
  // Opening the page checks for an existing Whop membership first; in the sheet, checkout then starts by itself.
  function autoStart() {
    if (params.has('status') || params.has('complete')) return;
    if (sheet) { button.hidden = true; if (skel) skel.hidden = false; }
    window.__mpWhopBegin = function () { button.click(); };
    function kick() { if (!warmOnly || startWanted) button.click(); else notify('warm'); }
    if (live && token()) request('/api/whop/vip/sync',{method:'POST',body:'{}'}).then(function (state) {
      if (showTestSubscription(state)) return;
      if (state.vip && state.provider === 'whop' && state.checkoutProvider === 'whop') { showDone(); return; }
      if (sheet) kick();
    }).catch(function () { if (sheet) kick(); });
    else if (sheet) kick();
  }
  button.addEventListener('click', async function () {
    if (mounted || button.disabled) return;
    if (!token()) {status.textContent=live ? 'Sign in to MISÈRE PERDUE before buying VIP.' : 'Sign in with an isolated sandbox test account before testing checkout.';return;}
    button.disabled=true; status.textContent='Preparing secure checkout…';
    try {
      const state = await request('/api/vip');
      if (showTestSubscription(state)) return;
      if (state.checkoutEnvironment !== (live ? 'live' : 'sandbox') || !state.whopCheckoutEnabled) throw new Error('This checkout is not enabled yet.');
      if (!testMode(state) && (state.vip || state.status === 'active')) throw new Error(live ? 'You already have VIP, and this account is not set up for the private live test. Sign in with the owner account, then reload this page.' : 'You already have VIP. Manage your membership from your profile.');
      if (live && !(await request('/api/whop/vip/readiness')).ready) throw new Error('VIP pricing has changed. Checkout has not been opened.');
      if (typeof window.WhopElements !== 'function') throw new Error('The payment form could not load. Please reload this page.');
      function useId(id, fromCache, ownerTestFlag, info) {
        if (testMode(state) && fromCache === false && ownerTestFlag!==true) throw new Error('The separate test checkout could not be verified.');
        mountAny(testMode(state) ? null : info, id, returnUrl, function(){ dropSess('vip'); status.textContent='Confirming your VIP\u2026'; confirmVip(true); }, function () {
          dropSess('vip');
          if (fromCache) {
            mounted=false; button.disabled=false;
            button.click();
            return;
          }
          mounted=false; button.disabled=false; button.hidden=false;
          if (skel) skel.hidden=true;
          status.textContent='Checkout couldn\u2019t load. Please try again.';
        });
        mounted=true;
      }
      const cached = !testMode(state) && readSess('vip');
      if (cached) useId(cached, true, undefined, readInfo('vip'));
      else {
        const body = await request('/api/whop/vip/checkout',{method:'POST',body:JSON.stringify({product:'vip'})});
        const info = nativeInfo(body, 'vip', live ? 13.98 : 10, 'Subscribe');
        if (!/^ch_[A-Za-z0-9_-]+$/.test(body.checkoutConfigurationId || '') || body.sandbox !== !live) throw new Error('The checkout environment could not be verified.');
        if (testMode(state) && body.ownerTest!==true) throw new Error('The separate test checkout could not be verified.');
        writeSess('vip', 0, body.checkoutConfigurationId, info);
        useId(body.checkoutConfigurationId, false, body.ownerTest, info);
      }
      status.textContent=testMode(state) ? 'This is a separate live test. Your existing VIP stays unchanged.' : '';
    } catch(error) {status.textContent=error.message || 'Unable to load checkout.';button.disabled=false;button.hidden=false;if (skel) skel.hidden=true;notify('ready');}
  });
  autoStart();
})();
