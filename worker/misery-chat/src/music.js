// ---- /api/music/search: Deezer relevance, mapped to Apple Music tracks (dc, 2026-11-09) ----
// Deezer's public search (no key) finds the song; each hit is mapped to an Apple track by
// normalized title + primary artist (+ duration within 3s). Order = Deezer's. No media= param
// on iTunes (Mobile Safari gets 301 to musics:// with it; harmless here but keep it uniform).
function mzNorm(s) {
  return String(s || "").normalize("NFD").replace(/\p{M}+/gu, "").toLowerCase().replace(/\s*[(\[].*$/, "").split(" - ")[0]
    .replace(/[^\p{L}\p{N} ]+/gu, " ").replace(/\s+/g, " ").trim();
}
function mzPrimary(a) { return mzNorm(String(a || "").split(/\s*(?:&|,|\bx\b|\bfeat\.?|\bwith\b)\s*/i)[0]); }
async function mzJson(url, ms) {
  const ac = new AbortController(), to = setTimeout(() => ac.abort(), ms || 4000);
  try {
    const r = await fetch(url, { signal: ac.signal, headers: { "Accept": "application/json" }, cf: { cacheTtl: 600, cacheEverything: true } });
    if (!r.ok) throw new Error("upstream " + r.status);
    return await r.json();
  } finally { clearTimeout(to); }
}
function mzItunes(path) { return mzJson("https://itunes.apple.com/" + path).then((d) => (d && d.results || []).filter((t) => t && t.trackId && t.trackName && t.artistName && t.trackViewUrl)).catch(() => []); }
// -1 = not the same recording; higher = better
function mzScore(dz, t) {
  const title = mzNorm(t.trackName), want = [mzNorm(dz.title), mzNorm(dz.title_short)];
  if (!title || want.indexOf(title) < 0) return -1;
  const a = mzPrimary(t.artistName), da = mzPrimary(dz.artist && dz.artist.name), full = mzNorm(t.artistName);
  if (!da || (a !== da && (" " + full + " ").indexOf(" " + da + " ") < 0)) return -1;
  let s = a === da ? 3 : 1;
  const dt = t.trackTimeMillis && dz.duration ? Math.abs(t.trackTimeMillis - dz.duration * 1000) : null;
  if (dt != null) { if (dt > 10000) return -1; if (dt <= 3000) s += 2; }
  if ((t.trackExplicitness === "explicit") === !!dz.explicit_lyrics) s += 1;
  if (t.country && t.country !== "CAN") s -= 0.5;
  return s;
}
function mzPick(dz, list) { let best = null, bs = -1; for (const t of list) { const s = mzScore(dz, t); if (s > bs) { bs = s; best = t; } } return best; }
// Apple Music's public web search page lists songs the iTunes Search index can miss; ids only, then lookup.
async function mzAppleWeb(term) {
  try {
    const ac = new AbortController(), to = setTimeout(() => ac.abort(), 4000);
    const r = await fetch("https://music.apple.com/ca/search?term=" + encodeURIComponent(term), { signal: ac.signal, headers: { "Accept": "text/html", "User-Agent": "Mozilla/5.0 (compatible; MisereMusic/1.0)" }, cf: { cacheTtl: 600, cacheEverything: true } });
    clearTimeout(to);
    if (!r.ok) return [];
    const html = await r.text(), m = html.match(/<script type="application\/json" id="serialized-server-data">([\s\S]*?)<\/script>/);
    if (!m) return [];
    const ids = [];
    (function walk(o, d) {
      if (!o || d > 40 || ids.length >= 12) return;
      if (Array.isArray(o)) { for (const v of o) walk(v, d + 1); return; }
      if (typeof o !== "object") return;
      const cd = o.contentDescriptor;
      if (cd && cd.kind === "song" && cd.identifiers && /^\d{1,18}$/.test(String(cd.identifiers.storeAdamID || "")) && ids.indexOf(String(cd.identifiers.storeAdamID)) < 0) ids.push(String(cd.identifiers.storeAdamID));
      for (const k in o) walk(o[k], d + 1);
    })(JSON.parse(m[1]), 0);
    return ids;
  } catch (e) { return []; }
}
const MZ_KEEP = ["trackId", "artistId", "collectionId", "trackName", "artistName", "collectionName", "trackExplicitness", "trackViewUrl", "artworkUrl100", "previewUrl", "trackTimeMillis", "trackNumber", "discNumber", "releaseDate", "primaryGenreName"];
async function musicSearch(q) {
  const dz = await mzJson("https://api.deezer.com/search?limit=25&q=" + encodeURIComponent(q));
  const hits = (dz && dz.data || []).filter((t) => t && t.type === "track" && t.title && t.artist && t.artist.name).slice(0, 20);
  if (!hits.length) return [];
  const pool = [].concat(...await Promise.all(["ca", "us"].map((c) => mzItunes("search?entity=song&limit=50&country=" + c + "&term=" + encodeURIComponent(q)))));
  const out = hits.map((h) => mzPick(h, pool));
  // targeted: exact "artist title" for top hits Apple's plain search ranked out
  await Promise.all(out.map((t, i) => t || i >= 8 ? null : mzItunes("search?entity=song&limit=15&country=ca&term=" + encodeURIComponent(hits[i].artist.name + " " + (hits[i].title_short || hits[i].title)))
    .then((list) => { out[i] = mzPick(hits[i], list); })));
  // last resort for the top hits: Apple Music's own web search, then lookup by id
  const miss = out.map((t, i) => (t || i >= 5 ? -1 : i)).filter((i) => i >= 0).slice(0, 3);
  if (miss.length) {
    const idLists = await Promise.all(miss.map((i) => mzAppleWeb(hits[i].artist.name + " " + (hits[i].title_short || hits[i].title))));
    const ids = [...new Set([].concat(...idLists))].slice(0, 40);
    if (ids.length) {
      const found = await mzItunes("lookup?country=ca&id=" + ids.join(","));
      miss.forEach((i) => { out[i] = mzPick(hits[i], found); });
    }
  }
  const seen = new Set(), tracks = [];
  out.forEach((t, i) => {
    if (!t || seen.has(t.trackId)) return;
    seen.add(t.trackId);
    const o = {};
    for (const k of MZ_KEEP) if (t[k] != null) o[k] = t[k];
    o.dz = i;
    tracks.push(o);
  });
  return tracks;
}
const mzHits = new Map(), mzOwner = new Map();
async function handleMusicSearch(req, env, ctx, stub) {
  const url = new URL(req.url), q = String(url.searchParams.get("q") || "").replace(/\s+/g, " ").trim().slice(0, 120);
  if (q.length < 2) return json({ ok: true, tracks: [] });
  const key = new Request("https://music.cache/v1/" + encodeURIComponent(q.toLowerCase()));
  try { const hit = await caches.default.match(key); if (hit) { const r = new Response(hit.body, hit); const h = cors({}, req); for (const k in h) r.headers.set(k, h[k]); return r; } } catch (e) {}
  // per-IP limit on uncached searches; dc's devices/networks are never limited
  const ip = req.headers.get("CF-Connecting-IP") || "unknown", now = Date.now(), win = mzHits.get(ip) || { t: now, n: 0 };
  if (now - win.t > 60000) { win.t = now; win.n = 0; }
  win.n++; mzHits.set(ip, win);
  if (mzHits.size > 5000) mzHits.clear();
  if (win.n > 40) {
    let own = mzOwner.get(ip);
    if (!own || now - own.t > 600000) {
      let ok = false;
      try { const r = await stub.fetch("https://internal/__internal/owner-exempt", { method: "POST", headers: { "X-Internal": "music", "CF-Connecting-IP": ip, "X-Device-Id": req.headers.get("X-Device-Id") || "" } }); ok = !!(await r.json()).owner; } catch (e) {}
      own = { t: now, ok }; mzOwner.set(ip, own);
    }
    if (!own.ok) return new Response(JSON.stringify({ ok: false, error: "slow down" }), { status: 429, headers: cors({ "Content-Type": "application/json", "Retry-After": "30" }, req) });
  }
  let tracks;
  try { tracks = await musicSearch(q); } catch (e) { return new Response(JSON.stringify({ ok: false, error: "catalog unavailable" }), { status: 502, headers: cors({ "Content-Type": "application/json" }, req) }); }
  const body = JSON.stringify({ ok: true, src: "deezer", tracks });
  try { ctx.waitUntil(caches.default.put(key, new Response(body, { headers: { "Content-Type": "application/json", "Cache-Control": "max-age=600" } }))); } catch (e) {}
  return new Response(body, { status: 200, headers: cors({ "Content-Type": "application/json", "Cache-Control": "private, max-age=60" }, req) });
}
