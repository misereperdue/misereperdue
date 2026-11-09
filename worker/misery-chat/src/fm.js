// ---- Misery FM (dc, 2026-11-09): owner-run live radio. No mic, no recording. ----
// State in the ChatRoom DO ("fm"): playlist, current index, startedAt, live. Everyone derives the same
// position from startedAt; the DO alarm advances at each track end and broadcasts { t:"fm" }.
const FM_TYPES = { "audio/mpeg": "mp3", "audio/mp3": "mp3", "audio/mp4": "m4a", "audio/x-m4a": "m4a", "audio/m4a": "m4a", "audio/aac": "aac", "audio/x-aac": "aac" };
const FM_MAX = 25 * 1024 * 1024, FM_LIST_MAX = 200;
async function fmAudio(req, env) {
  const m = new URL(req.url).pathname.match(/^\/api\/fm\/audio\/([a-z0-9]{8,40})$/);
  if (!m || !env.FM_BUCKET) return new Response("not found", { status: 404 });
  const h = { "Access-Control-Allow-Origin": "*", "Accept-Ranges": "bytes", "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff", "Cross-Origin-Resource-Policy": "cross-origin" };
  const range = req.headers.get("Range");
  const obj = await env.FM_BUCKET.get("t/" + m[1], range ? { range: req.headers } : {});
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
