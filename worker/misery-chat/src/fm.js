// ---- Misery FM (dc, 2026-11-09): owner-run live radio. No mic, no recording. ----
// State in the ChatRoom DO ("fm"). Everyone derives the same position from startedAt (or pos while paused);
// the DO alarm advances at each track end (and fires scheduled go-lives) and broadcasts { t:"fm" }.
const FM_TYPES = { "audio/mpeg": "mp3", "audio/mp3": "mp3", "audio/mp4": "m4a", "audio/x-m4a": "m4a", "audio/m4a": "m4a", "audio/aac": "aac", "audio/x-aac": "aac" };
const FM_IMG = { "image/jpeg": 1, "image/png": 1, "image/webp": 1 };
const FM_MAX = 25 * 1024 * 1024, FM_LIST_MAX = 200, FM_ART_MAX = 3 * 1024 * 1024, FM_WAVE_MAX = 40000;
const FM_EMOJI = ["\u{1F525}", "\u2764\uFE0F", "\u{1F62D}", "\u{1F64C}", "\u{1F480}", "\u{1F3B6}"];
async function fmAudio(req, env) {
  const m = new URL(req.url).pathname.match(/^\/api\/fm\/(audio|art|wave)\/([a-z0-9]{8,40})$/);
  if (!m || !env.FM_BUCKET) return new Response("not found", { status: 404 });
  const h = { "Access-Control-Allow-Origin": "*", "Accept-Ranges": "bytes", "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff", "Cross-Origin-Resource-Policy": "cross-origin" };
  const key = { audio: "t/", art: "a/", wave: "w/" }[m[1]] + m[2];
  const range = m[1] === "audio" ? req.headers.get("Range") : null;
  const obj = await env.FM_BUCKET.get(key, range ? { range: req.headers } : {});
  if (!obj) return new Response("not found", { status: 404, headers: h });
  const headers = new Headers(h);
  obj.writeHttpMetadata(headers);
  headers.set("ETag", obj.httpEtag);
  if (range && obj.range) {
    const r = obj.range, start = r.offset != null ? r.offset : obj.size - r.suffix, len = r.length != null ? r.length : obj.size - start;
    headers.set("Content-Range", "bytes " + start + "-" + (start + len - 1) + "/" + obj.size);
    headers.set("Content-Length", String(len));
    return new Response(req.method === "HEAD" ? null : obj.body, { status: 206, headers });
  }
  headers.set("Content-Length", String(obj.size));
  return new Response(req.method === "HEAD" ? null : obj.body, { status: 200, headers });
}
