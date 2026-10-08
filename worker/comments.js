/* MISERY comment backend — Cloudflare Worker.
 *
 * Deploy: paste this file as your Worker's code in the Cloudflare dashboard
 * (Workers & Pages > Create Worker). Then add two secrets under
 * Settings > Variables > Secrets:
 *   GITHUB_TOKEN  — fine-grained PAT, repo misereperdue/misereperdue,
 *                   Contents: read and write. Nothing else.
 *   OWNER_SECRET  — any long random string you invent. Only your device knows
 *                   it; deletes are rejected without it.
 *
 * API:
 *   GET  /api/comments                 -> { comments: [...] } (fresh from GitHub)
 *   POST /api/comments                 { slug, parentId, name, text }
 *   POST /api/comments/vote            { id, dir: 1 | -1 }
 *   POST /api/comments/delete          { id, secret }
 */

const REPO = "misereperdue/misereperdue";
const FILE = "comments.json";
const GH_API = "https://api.github.com/repos/" + REPO + "/contents/" + FILE;
const SITE = "https://misereperdue.com";

function cors(res) {
  res.headers.set("Access-Control-Allow-Origin", SITE);
  res.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type");
  res.headers.set("Access-Control-Max-Age", "86400");
  return res;
}
function json(data, status) {
  return cors(
    new Response(JSON.stringify(data), {
      status: status || 200,
      headers: { "Content-Type": "application/json" }
    })
  );
}

function clean(s, max) {
  return String(s == null ? "" : s)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, max);
}
function validSlug(s) {
  return /^[a-z0-9][a-z0-9-]{0,80}$/i.test(s || "");
}

/* crude per-isolate rate limit: 20 writes/min per IP */
const hits = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < 60000);
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 2000) hits.clear();
  return arr.length > 20;
}

async function getFile(token) {
  const r = await fetch(GH_API, {
    headers: {
      Authorization: "Bearer " + token,
      Accept: "application/vnd.github+json",
      "User-Agent": "misery-comments"
    }
  });
  if (!r.ok) throw new Error("read " + r.status);
  const f = await r.json();
  let rows = [];
  try {
    rows = JSON.parse(
      decodeURIComponent(escape(atob(f.content.replace(/\s/g, ""))))
    );
  } catch (e) {
    rows = [];
  }
  return { rows: Array.isArray(rows) ? rows : [], sha: f.sha };
}

async function putFile(token, rows, sha) {
  const body = JSON.stringify(rows, null, 2);
  const r = await fetch(GH_API, {
    method: "PUT",
    headers: {
      Authorization: "Bearer " + token,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "User-Agent": "misery-comments"
    },
    body: JSON.stringify({
      message: "Update comments",
      content: btoa(unescape(encodeURIComponent(body))),
      sha: sha
    })
  });
  return r;
}

/* read-modify-write with retry on sha conflict */
async function mutate(token, fn) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const { rows, sha } = await getFile(token);
    const out = fn(rows) || rows;
    const r = await putFile(token, out, sha);
    if (r.ok) return out;
    if (r.status !== 409 && r.status !== 422) throw new Error("write " + r.status);
  }
  throw new Error("conflict");
}

function normalize(c) {
  return {
    id: String(c.id || ""),
    slug: c.slug || "",
    parentId: c.parentId ? String(c.parentId) : null,
    name: String(c.name || "anon").slice(0, 40),
    text: String(c.text || "").slice(0, 2000),
    createdAt: +c.createdAt || Date.now(),
    up: Math.max(0, +c.up || 0),
    down: Math.max(0, +c.down || 0)
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return cors(new Response(null, { status: 204 }));

    try {
      /* ---- list ---- */
      if (url.pathname === "/api/comments" && request.method === "GET") {
        const { rows } = await getFile(env.GITHUB_TOKEN);
        return json({ comments: rows.map(normalize).filter((c) => c.id && c.text) });
      }

      const ip = request.headers.get("cf-connecting-ip") || "x";
      if (request.method === "POST" && rateLimited(ip)) {
        return json({ error: "slow down" }, 429);
      }

      /* ---- post / reply ---- */
      if (url.pathname === "/api/comments" && request.method === "POST") {
        const b = await request.json().catch(() => ({}));
        const slug = clean(b.slug, 90);
        const name = clean(b.name, 40) || "anon";
        const text = clean(b.text, 2000);
        const parentId = b.parentId ? String(b.parentId).slice(0, 40) : null;
        if (!validSlug(slug) || !text) return json({ error: "bad input" }, 400);
        const comment = {
          id: String(Date.now()) + Math.floor(Math.random() * 1e4).toString(),
          slug, parentId, name, text,
          createdAt: Date.now(), up: 0, down: 0
        };
        await mutate(env.GITHUB_TOKEN, (rows) => {
          rows = rows.map(normalize);
          if (parentId && !rows.some((r) => r.id === parentId)) throw new Error("no-parent");
          rows.push(comment);
          return rows;
        });
        return json({ ok: true, comment });
      }

      /* ---- vote ---- */
      if (url.pathname === "/api/comments/vote" && request.method === "POST") {
        const b = await request.json().catch(() => ({}));
        const id = String(b.id || "").slice(0, 40);
        const dir = b.dir === -1 ? -1 : 1;
        const prev = b.prev === 1 ? 1 : b.prev === -1 ? -1 : 0;
        if (!id) return json({ error: "bad input" }, 400);
        let result = null;
        await mutate(env.GITHUB_TOKEN, (rows) => {
          rows = rows.map(normalize);
          const c = rows.find((r) => r.id === id);
          if (!c) throw new Error("no-comment");
          if (prev === 1) c.up = Math.max(0, c.up - 1);
          if (prev === -1) c.down = Math.max(0, c.down - 1);
          if (dir === 1) c.up++; else c.down++;
          result = { up: c.up, down: c.down };
          return rows;
        });
        return json({ ok: true, ...result });
      }

      /* ---- delete (owner only) ---- */
      if (url.pathname === "/api/comments/delete" && request.method === "POST") {
        const b = await request.json().catch(() => ({}));
        if (!env.OWNER_SECRET || b.secret !== env.OWNER_SECRET) {
          return json({ error: "forbidden" }, 403);
        }
        const id = String(b.id || "").slice(0, 40);
        if (!id) return json({ error: "bad input" }, 400);
        await mutate(env.GITHUB_TOKEN, (rows) => {
          rows = rows.map(normalize);
          const kill = { [id]: true };
          let changed = true;
          while (changed) {
            changed = false;
            rows.forEach((r) => {
              if (r.parentId && kill[r.parentId] && !kill[r.id]) { kill[r.id] = true; changed = true; }
            });
          }
          return rows.filter((r) => !kill[r.id]);
        });
        return json({ ok: true });
      }

      return json({ error: "not found" }, 404);
    } catch (e) {
      const msg = String((e && e.message) || "failed");
      if (msg === "no-parent" || msg === "no-comment") return json({ error: msg }, 400);
      return json({ error: "failed" }, 500);
    }
  }
};
