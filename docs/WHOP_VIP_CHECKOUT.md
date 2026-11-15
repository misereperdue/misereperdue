# Whop VIP checkout handoff

Paired drafts: [website #297](https://github.com/misereperdue/misereperdue/pull/297), [Worker #61](https://github.com/misereperdue/misery-worker/pull/61), acceptance task [#62](https://github.com/misereperdue/misery-worker/issues/62).

**The owner has now requested a private live test.** The paired rollout keeps public Whop flags off and allows only an authenticated owner to open a server-authorized, time-limited live test.

- Normal VIP product/cart entrypoints use the authenticated `/api/vip` response's `checkoutProvider`. When it is `whop`, a VIP-only cart opens `/whop-vip-preview?checkout=1`; mixed carts ask for a separate VIP purchase and preserve other items. Other products still use Shopify, and product/variant/3D render code is unchanged. Provider lookup failure cannot silently start a Shopify VIP subscription.
- The checkout page uses server-created configurations and the current Elements `checkout.create({checkoutConfiguration,returnUrl}).create('checkout').mount(...)` API. The SDK and all pricing/identity checks are server controlled; redirects only trigger an authenticated membership status read/poll and never grant VIP.
- Sandbox is the default on the preview page. It calls only `https://whop-staging.misereperdue.com` and uses a separately acquired `whop_sandbox_token`, not `chat_token`. Live checkout is accepted only on the production hostname with `?checkout=1` and an enabled, matching live server environment.
- The checkout page supports system light/dark styles and bounds its VIP artwork so mobile checkout is reachable. Existing shop design/renders are preserved.
- Whop management/cancellation never falls back to the Seal portal, including when Whop returns an error or no management URL.
- Scoped Elements CSP covers both extensionless and `.html` checkout URLs, removes the inherited global CSP first, and uses the documented SDK/provider origins. The Pages nonce middleware selects the same scoped policy; other pages retain the original CSP. Two middleware tests cover both URL forms and prevent leaking these permissions to other pages.
- Source/build pins: chat 524, shop 142, service worker 606; checkout JS 2. Refresh against main before any later merge.

Validation: `npm run verify`, `npm run check` (0 errors/warnings), Pages public-output copy, and seven mobile WebKit scenarios with API/SDK test doubles (dark/light sandbox, live routing, disabled/wrong environment, signed out, server-confirmed return). No horizontal overflow or page exceptions at 390px. These checks **do not establish real provider iframe/CSP/3DS behavior or real iPhone payment success**.

Next: deploy this draft to an isolated Pages preview; set that exact origin on `misery-whop-staging`, configure separate sandbox API key, webhook secret and plan, and create isolated test users there. See the Worker `docs/WHOP_MIGRATION_STAGING.md` for exact setup, provider permissions, acceptance matrix and rollback. Do not copy production secrets or account sessions to staging. Do not enable live Stars, remove Shopify or cancel existing Seal subscriptions.

The isolated backend is deployed with both flags OFF and no secrets. Its CORS/redirect site is the paired branch preview, `https://feature-whop-vip-preview-202.misereperdue.pages.dev`. The first deployed preview revealed the nonce middleware overriding `_headers`; the follow-up fixes this and CI now runs the regression tests. Real billing remains blocked on sandbox configuration.

## Owner-only live test

Latest instruction supersedes the sandbox gate for this limited test only. The direct production link is `/whop-vip-preview?checkout=1`; its server preflight must return `ownerWhopTest:true` for the authenticated owner. That permits a manually granted VIP owner to test a real purchase while preserving their existing VIP entitlement. An active/paid subscription still blocks a second subscription. Other accounts remain blocked, general storefront routing stays Shopify and public Whop flags remain off. New private checkouts expire after 24 hours; verified test subscription lifecycle events and cancellation must continue to work afterward. Checkout JS pin is now 3.

A real live purchase, recurring payment or refund has NOT been completed by deploying the page. The owner must enter/approve payment in Whop and the verified receipt/webhook/account mapping must be checked before reporting success or widening availability. Actual live CAD pricing is checked through the read-only Worker readiness endpoint before payment. Existing non-VIP cart/design behavior remains unchanged.
