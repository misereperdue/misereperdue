// Per-request CSP nonce for HTML pages.
// Our own pages have no inline scripts at all (script-src has no 'unsafe-inline').
// The nonce exists only so Cloudflare's injected Bot Fight Mode / JavaScript
// Detections snippet can run: Cloudflare reads the nonce from this header and
// adds it to the scripts it injects. Keep CSP in sync with _headers (fallback).
const CSP = "default-src 'self'; script-src 'self' https://challenges.cloudflare.com https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; media-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https://itunes.apple.com https://musicbrainz.org https://api.misereperdue.com wss://api.misereperdue.com https://shop.misereperdue.com https://cloudflareinsights.com https://ipapi.co; frame-src https://challenges.cloudflare.com https://www.youtube.com https://www.youtube-nocookie.com https://open.spotify.com https://w.soundcloud.com https://player.vimeo.com https://embed.music.apple.com; worker-src 'self' blob:; manifest-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests";

export async function onRequest({ next }) {
  const res = await next();
  const type = res.headers.get("content-type") || "";
  if (!type.includes("text/html")) return res;
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const nonce = btoa(String.fromCharCode(...bytes));
  const headers = new Headers(res.headers);
  headers.set("Content-Security-Policy", CSP.replace("script-src 'self'", "script-src 'self' 'nonce-" + nonce + "'"));
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}
