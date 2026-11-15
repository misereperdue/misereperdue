# Whop VIP checkout handoff

Paired drafts: [website #297](https://github.com/misereperdue/misereperdue/pull/297), [Worker #61](https://github.com/misereperdue/misery-worker/pull/61), acceptance task [#62](https://github.com/misereperdue/misery-worker/issues/62).

**Production has not changed. Both PRs remain drafts until a real sandbox billing lifecycle passes.**

- Normal VIP product/cart entrypoints use the authenticated `/api/vip` response's `checkoutProvider`. When it is `whop`, a VIP-only cart opens `/whop-vip-preview?checkout=1`; mixed carts ask for a separate VIP purchase and preserve other items. Other products still use Shopify, and product/variant/3D render code is unchanged. Provider lookup failure cannot silently start a Shopify VIP subscription.
- The checkout page uses server-created configurations and the current Elements `checkout.create({checkoutConfiguration,returnUrl}).create('checkout').mount(...)` API. The SDK and all pricing/identity checks are server controlled; redirects only trigger an authenticated membership status read/poll and never grant VIP.
- Sandbox is the default on the preview page. It calls only `https://whop-staging.misereperdue.com` and uses a separately acquired `whop_sandbox_token`, not `chat_token`. Live checkout is accepted only on the production hostname with `?checkout=1` and an enabled, matching live server environment.
- The checkout page supports system light/dark styles and bounds its VIP artwork so mobile checkout is reachable. Existing shop design/renders are preserved.
- Whop management/cancellation never falls back to the Seal portal, including when Whop returns an error or no management URL.
- Scoped Elements CSP covers both extensionless and `.html` checkout URLs, removes the inherited global CSP first, and uses the documented SDK/provider origins. Other pages retain the original CSP.
- Source/build pins: chat 524, shop 142, service worker 606; checkout JS 2. Refresh against main before any later merge.

Validation: `npm run verify`, `npm run check` (0 errors/warnings), Pages public-output copy, and seven mobile WebKit scenarios with API/SDK test doubles (dark/light sandbox, live routing, disabled/wrong environment, signed out, server-confirmed return). No horizontal overflow or page exceptions at 390px. These checks **do not establish real provider iframe/CSP/3DS behavior or real iPhone payment success**.

Next: deploy this draft to an isolated Pages preview; set that exact origin on `misery-whop-staging`, configure separate sandbox API key, webhook secret and plan, and create isolated test users there. See the Worker `docs/WHOP_MIGRATION_STAGING.md` for exact setup, provider permissions, acceptance matrix and rollback. Do not copy production secrets or account sessions to staging. Do not enable live Stars, remove Shopify or cancel existing Seal subscriptions.
