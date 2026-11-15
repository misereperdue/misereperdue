/* VIP-only Whop checkout. Price, identity and fulfillment belong to the server. */
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
  if (sheet) document.documentElement.classList.add('mp-sheet');
  const returnUrl = location.origin + '/whop-vip-preview' + (live ? '?checkout=1' : '') + (sheet ? (live ? '&' : '?') + 'sheet=1' : '');
  function notify(kind) { if (sheet) try { window.parent.postMessage({mpWhop:kind}, location.origin); } catch (_) {} }
  const tag = document.querySelector('.tag');
  if (tag) tag.textContent = live ? 'VIP' : 'SANDBOX PREVIEW';
  const price = document.querySelector('.price strong');
  const renewal = document.querySelector('.price span');
  const pricingNote = document.getElementById('pricing-note');
  if (price) price.textContent = live ? 'CA$13.98 initially' : 'CA$10 initially';
  if (renewal) renewal.textContent = live ? 'CA$3.99 every 30 days afterward' : 'CA$3 every 30 days afterward';
  if (pricingNote) pricingNote.textContent = live ? 'Taxes, currency conversion and any buyer fees are calculated by Whop at checkout. Review the final amount before paying.' : 'Sandbox checkout uses test payments.';
  button.textContent = live ? 'Continue to secure checkout' : 'Test sandbox checkout';
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
  function testMode(state) { return !!state.ownerWhopTest && state.checkoutProvider !== 'whop'; }
  function showTestSubscription(state) {
    if (testMode(state)) {
      if (tag) tag.textContent = 'PRIVATE LIVE TEST';
      button.textContent='Start separate live test';
      if (pricingNote) pricingNote.textContent='This is a separate real subscription for testing. Your existing VIP stays unchanged. Whop calculates taxes, currency conversion and buyer fees before payment.';
    }
    const test = state.ownerWhopTestSubscription;
    if (!test || !['active','revoked'].includes(test.status) || !testMode(state)) return false;
    button.hidden=true; mount.hidden=true;
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
  if (params.has('status') || params.has('complete')) {
    status.textContent = params.get('status') === 'failed' ? 'Payment was unsuccessful. You can try the same checkout again.' : params.get('status') === 'canceled' ? 'Checkout was canceled. You have not been upgraded.' : 'Checking your VIP membership…';
    if (token()) {
      // Browser status is only a hint. Access is read from the authenticated API.
      (async function () {
        for (let attempt=0;attempt<6;attempt++) {
          try {
            const state = await request('/api/whop/vip/sync',{method:'POST',body:'{}'});
            if (showTestSubscription(state)) return;
            if (state.checkoutProvider==='whop' && state.vip && state.provider === 'whop') {status.textContent='Your VIP membership is active. Welcome to MISÈRE PERDUE.';button.hidden=true;notify('done');return;}
          } catch (_) {status.textContent='We couldn’t check your membership. Open your profile to check its status.';return;}
          if (params.get('status') !== 'succeeded') break;
          await new Promise(resolve=>setTimeout(resolve,1500));
        }
        status.textContent='Your VIP membership has not been confirmed yet. Check your profile before starting another checkout.';
      })();
    } else status.textContent='Sign in to check your VIP membership.';
  }
  else if (live && token()) request('/api/whop/vip/sync',{method:'POST',body:'{}'}).then(function (state) {
    if (showTestSubscription(state)) return;
    if (state.vip && state.provider === 'whop' && state.checkoutProvider === 'whop') { status.textContent='Your VIP membership is active. Welcome to MISÈRE PERDUE.'; button.hidden=true; notify('done'); return; }
    if (sheet) button.click();
  }).catch(function () { if (sheet) button.click(); });
  else if (sheet) button.click();
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
      const body = await request('/api/whop/vip/checkout',{method:'POST',body:JSON.stringify({product:'vip'})});
      if (!/^ch_[A-Za-z0-9_-]+$/.test(body.checkoutConfigurationId || '') || body.sandbox !== !live) throw new Error('The checkout environment could not be verified.');
      if (testMode(state) && body.ownerTest!==true) throw new Error('The separate test checkout could not be verified.');
      const checkout=window.WhopElements(live ? {} : {environment:'sandbox'}).checkout.create({checkoutConfiguration:body.checkoutConfigurationId,returnUrl});
      mount.hidden=false;
      checkout.create('checkout').mount('#checkout');
      mounted=true;button.hidden=true;status.textContent=testMode(state) ? 'Complete the separate live test purchase below. Your existing VIP stays unchanged.' : 'Complete your VIP purchase securely below.';
    } catch(error) {status.textContent=error.message || 'Unable to load checkout.';button.disabled=false;}
  });
})();
