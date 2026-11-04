// Same-origin song search fallback for chat "now listening" cards (per dc).
// Deezer's API has no CORS, so proxy it and return only what the card needs.
export async function onRequestGet({ request }) {
  const q = (new URL(request.url).searchParams.get("q") || "").slice(0, 140).trim();
  if (!q) return Response.json([], { status: 400 });
  try {
    const r = await fetch("https://api.deezer.com/search?limit=15&q=" + encodeURIComponent(q), { cf: { cacheTtl: 86400, cacheEverything: true } });
    const j = await r.json();
    const out = ((j && j.data) || []).map((t) => ({
      trackName: t.title, artistName: (t.artist && t.artist.name) || "",
      art: ((t.album && (t.album.cover_big || t.album.cover_medium)) || "").replace(/^http:/, "https:"),
    }));
    return Response.json(out, { headers: { "Cache-Control": "public, max-age=86400" } });
  } catch (e) {
    return Response.json([], { status: 502 });
  }
}
