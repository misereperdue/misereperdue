// Per-request CSP nonce for HTML pages.
// Our own pages have no inline scripts at all (script-src has no 'unsafe-inline').
// The nonce exists only so Cloudflare's injected Bot Fight Mode / JavaScript
// Detections snippet can run: Cloudflare reads the nonce from this header and
// adds it to the scripts it injects. Keep CSP in sync with _headers (fallback).
const CSP = "default-src 'self'; script-src 'self' https://challenges.cloudflare.com https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; media-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https://api.klipy.com https://*.mzstatic.com https://itunes.apple.com https://musicbrainz.org https://api.misereperdue.com wss://api.misereperdue.com https://cloudflareinsights.com https://ipapi.co; frame-src 'self' https://challenges.cloudflare.com https://www.youtube.com https://www.youtube-nocookie.com https://open.spotify.com https://w.soundcloud.com https://player.vimeo.com https://embed.music.apple.com; worker-src 'self' blob:; manifest-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests";


// /shop, /globe and /chat (per dc): people get the app on that tab; search engines and link previewers
// get the plain page built for them (same title, description and share tags either way).
const APP_PAGES = { "/shop": 1, "/globe": 1, "/chat": 1 };
const BOTS = /bot\b|bot\/|crawl|spider|slurp|facebookexternalhit|meta-externalagent|facebookcatalog|embedly|whatsapp|telegram|discord|slack|linkedin|pinterest|snapchat|skype|vkshare|quora|reddit|applebot|google-|googleother|bingpreview|tumblr|iframely|mastodon|bluesky|lighthouse|pagespeed|curl\/|wget|python-|go-http|preview/i;
const SEO_TAGS = /<title>[\s\S]*?<\/title>|<meta (?:name="description"|name="twitter:[^"]+"|property="og:[^"]+")[^>]*>|<link rel="canonical"[^>]*>/g;

async function appPage(request, env, next) {
  const page = await next();
  if (!page.ok || !(page.headers.get("content-type") || "").includes("text/html")) return page;
  const tags = ((await page.text()).match(SEO_TAGS) || []).join("\n");
  const app = await env.ASSETS.fetch(new Request(new URL("/", request.url), request));
  const out = new HTMLRewriter()
    .on('title, meta[name="description"], link[rel="canonical"], meta[property^="og:"], meta[name^="twitter:"]', { element(el) { el.remove(); } })
    .on("head", { element(el) { el.append(tags, { html: true }); } })
    .transform(app);
  const headers = new Headers(out.headers);
  headers.set("Vary", "User-Agent");
  return new Response(out.body, { status: 200, headers });
}

export async function onRequest({ request, next, env }) {
  const path = new URL(request.url).pathname.replace(/\/$/, "") || "/";
  // home.html is the plain home page for search engines; it only exists at /, never as /home
  if (path === "/home") return Response.redirect(new URL("/", request.url).toString(), 301);
  const bot = BOTS.test(request.headers.get("user-agent") || "");
  const human = request.method === "GET" && APP_PAGES[path] && !bot;
  // per dc: Google ranked /info above the home page because the app's home HTML has ~19 words;
  // search engines and link previewers get a real home page (same <head>), people keep the app
  const homeForBots = request.method === "GET" && path === "/" && bot;
  const res = human ? await appPage(request, env, next)
    : homeForBots ? await env.ASSETS.fetch(new Request(new URL("/home", request.url), request))
    : await next();
  const type = res.headers.get("content-type") || "";
  if (!type.includes("text/html")) return res;
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const nonce = btoa(String.fromCharCode(...bytes));
  const headers = new Headers(res.headers);
  headers.set("X-MP-Release", "profile-cards-431");
  if (APP_PAGES[path] || path === "/") headers.set("Vary", "User-Agent");
  headers.set("Content-Security-Policy", CSP.replace("script-src 'self'", "script-src 'self' 'nonce-" + nonce + "'"));
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}
