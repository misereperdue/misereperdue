/* VIP-only Whop checkout. Price, identity and fulfillment belong to the server. */
(function () {
  'use strict';
  const button = document.getElementById('begin');
  const status = document.getElementById('message');
  const mount = document.getElementById('checkout');
  if (!button || !status || !mount) return;
  const productionHost = ['misereperdue.com', 'www.misereperdue.com'].includes(location.hostname);
  const live = productionHost && new URLSearchParams(location.search).get('checkout') === '1';
  const api = live ? 'https://api.misereperdue.com' : 'https://whop-staging.misereperdue.com';
  const returnUrl = location.origin + '/whop-vip-preview' + (live ? '?checkout=1' : '');
  const tag = document.querySelector('.tag');
  if (tag) tag.textContent = live ? 'VIP MEMBERSHIP' : 'SANDBOX PREVIEW';
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
  const params = new URLSearchParams(location.search);
  if (params.has('status') || params.has('complete')) {
    status.textContent = params.get('status') === 'failed' ? 'Payment was unsuccessful. You can try the same checkout again.' : params.get('status') === 'canceled' ? 'Checkout was canceled. You have not been upgraded.' : 'Checking your VIP membership…';
    if (token()) {
      // Browser status is only a hint. Access is read from the authenticated API.
      (async function () {
        for (let attempt=0;attempt<6;attempt++) {
          try {
            const state = await request('/api/vip');
            if (state.vip && state.provider === 'whop') {status.textContent='Your VIP membership is active. Welcome to MISÈRE PERDUE.';button.hidden=true;return;}
          } catch (_) {status.textContent='We couldn’t check your membership. Open your profile to check its status.';return;}
          if (params.get('status') !== 'succeeded') break;
          await new Promise(resolve=>setTimeout(resolve,1500));
        }
        status.textContent='Your VIP membership has not been confirmed yet. Check your profile before starting another checkout.';
      })();
    } else status.textContent='Sign in to check your VIP membership.';
  }
  button.addEventListener('click', async function () {
    if (mounted || button.disabled) return;
    if (!token()) {status.textContent=live ? 'Sign in to MISÈRE PERDUE before buying VIP.' : 'Sign in with an isolated sandbox test account before testing checkout.';return;}
    button.disabled=true; status.textContent='Preparing secure checkout…';
    try {
      const state = await request('/api/vip');
      if (state.checkoutEnvironment !== (live ? 'live' : 'sandbox') || !state.whopCheckoutEnabled) throw new Error('This checkout is not enabled yet.');
      if (state.vip || state.status === 'active') throw new Error('You already have VIP. Manage your membership from your profile.');
      if (typeof window.WhopElements !== 'function') throw new Error('The payment form could not load. Please reload this page.');
      const body = await request('/api/whop/vip/checkout',{method:'POST',body:JSON.stringify({product:'vip'})});
      if (!/^ch_[A-Za-z0-9_-]+$/.test(body.checkoutConfigurationId || '') || body.sandbox !== !live) throw new Error('The checkout environment could not be verified.');
      const checkout=window.WhopElements(live ? {} : {environment:'sandbox'}).checkout.create({checkoutConfiguration:body.checkoutConfigurationId,returnUrl});
      mount.hidden=false;
      checkout.create('checkout').mount('#checkout');
      mounted=true;button.hidden=true;status.textContent='Complete your VIP purchase securely below.';
    } catch(error) {status.textContent=error.message || 'Unable to load checkout.';button.disabled=false;}
  });
})();
