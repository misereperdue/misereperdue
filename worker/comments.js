/* MISERY backend — Cloudflare Worker.
 *
 * Handles: blog post CRUD (Markdown files in content/posts/), comments,
 * voting, and owner deletes. All data lives in the GitHub repo.
 *
 * Secrets (Settings > Variables > Secrets):
 *   GITHUB_TOKEN   — fine-grained PAT, repo misereperdue/misereperdue,
 *                    Contents: read and write. Nothing else.
 *   OWNER_SECRET   — long random string. Owner-only actions (comment deletes).
 *   EDITOR_SECRET  — password for the /admin editor. Only your device knows it.
 *
 * API:
 *   GET    /api/posts                  -> [{ slug, title, date, excerpt, tags }]
 *   GET    /api/posts/:slug            -> { slug, title, date, excerpt, tags, body }
 *   POST   /api/posts        {secret, slug?, title, date, excerpt, tags[], body}
 *   DELETE /api/posts/:slug  {secret}
 *   POST   /api/auth         {secret} -> { ok: true/false }
 *   GET    /api/comments                 -> { comments: [...] }
 *   POST   /api/comments                 { slug, parentId, name, text, secret? }
 *                                         secret=OWNER_SECRET + name "dc" -> verified badge
 *   POST   /api/comments/vote            { id, dir: 1 | -1 }
 *   POST   /api/comments/delete          { id, secret }
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
    down: Math.max(0, +c.down || 0),
    verified: !!c.verified
  };
}

const POSTS_DIR = "content/posts";
const GH_CONTENTS = "https://api.github.com/repos/" + REPO + "/contents/";

function ghHeaders(token) {
  return {
    Authorization: "Bearer " + token,
    Accept: "application/vnd.github+json",
    "User-Agent": "misery-backend"
  };
}

async function ghListDir(token, dir) {
  const r = await fetch(GH_CONTENTS + dir, { headers: ghHeaders(token) });
  if (!r.ok) throw new Error("gh-list " + r.status);
  const arr = await r.json();
  return Array.isArray(arr) ? arr.filter((f) => f.type === "file" && /\.md$/i.test(f.name)) : [];
}

async function ghGetFile(token, path) {
  const r = await fetch(GH_CONTENTS + path, { headers: ghHeaders(token) });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error("gh-get " + r.status);
  const j = await r.json();
  const b64 = (j.content || "").replace(/\n/g, "");
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const text = new TextDecoder().decode(bytes);
  return { text, sha: j.sha };
}

async function ghPutFile(token, path, text, sha, message) {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  const body = { message: message || ("update " + path), content: btoa(bin) };
  if (sha) body.sha = sha;
  const r = await fetch(GH_CONTENTS + path, {
    method: "PUT",
    headers: { ...ghHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!r.ok) throw new Error("gh-put " + r.status);
  return r.json();
}

async function ghDeleteFile(token, path, sha, message) {
  const r = await fetch(GH_CONTENTS + path, {
    method: "DELETE",
    headers: { ...ghHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify({ message: message || ("delete " + path), sha })
  });
  if (!r.ok && r.status !== 404) throw new Error("gh-del " + r.status);
}

/* Parse frontmatter from a Markdown post file. Returns {title,date,excerpt,tags,body}. */
function parsePost(text) {
  const m = String(text || "").match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  const d = {};
  let body = String(text || "");
  if (m) {
    body = m[2];
    let curKey = null;
    m[1].split(/\r?\n/).forEach((line) => {
      const li = line.match(/^\s*-\s+(.+)$/);
      if (li && curKey) {
        if (!Array.isArray(d[curKey])) d[curKey] = [];
        d[curKey].push(li[1].trim().replace(/^["']|["']$/g, ""));
        return;
      }
      const i = line.indexOf(":");
      if (i === -1) { curKey = null; return; }
      const k = line.slice(0, i).trim();
      const v = line.slice(i + 1).trim();
      curKey = k;
      if (!v) { d[k] = []; return; }
      d[k] = v.replace(/^["']|["']$/g, "");
    });
  }
  return {
    title: d.title || "",
    date: d.date || "",
    excerpt: d.excerpt || "",
    tags: Array.isArray(d.tags) ? d.tags : (d.tags ? [d.tags] : []),
    header_media: d.header_media || "",
    body: body.trim()
  };
}

function buildPost(title, date, excerpt, tags, body, header_media) {
  const tagLines = (tags || []).map((t) => "  - " + String(t).replace(/\n/g, " ")).join("\n");
  return "---\n" +
    'title: "' + String(title || "").replace(/"/g, '\\"') + '"\n' +
    "date: " + (date || "") + "\n" +
    'excerpt: "' + String(excerpt || "").replace(/"/g, '\\"') + '"\n' +
    "tags:\n" + (tagLines ? tagLines + "\n" : "") +
    (header_media ? 'header_media: "' + String(header_media).replace(/"/g, "") + '"\n' : "") +
    "---\n" + String(body || "").trim() + "\n";
}

function slugify(s) {
  return String(s || "").toLowerCase().trim()
    .replace(/['"]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) ||
    "post-" + Date.now().toString(36);
}

function checkEditor(env, secret) {
  return !!(env.EDITOR_SECRET && secret && secret === env.EDITOR_SECRET);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return cors(new Response(null, { status: 204 }));

    try {
      /* ---- editor auth check ---- */
      if (url.pathname === "/api/auth" && request.method === "POST") {
        const b = await request.json().catch(() => ({}));
        return json({ ok: checkEditor(env, b.secret) });
      }

      /* ---- list posts (public) ---- */
      if (url.pathname === "/api/posts" && request.method === "GET") {
        const files = await ghListDir(env.GITHUB_TOKEN, POSTS_DIR);
        const posts = [];
        for (const f of files) {
          const got = await ghGetFile(env.GITHUB_TOKEN, POSTS_DIR + "/" + f.name);
          if (!got) continue;
          const p = parsePost(got.text);
          posts.push({
            slug: f.name.replace(/\.md$/i, ""),
            title: p.title, date: p.date, excerpt: p.excerpt, tags: p.tags
          });
        }
        posts.sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
        return json({ posts });
      }

      /* ---- get one post (public; body included for editor preview) ---- */
      const getMatch = url.pathname.match(/^\/api\/posts\/([a-z0-9-]+)$/i);
      if (getMatch && request.method === "GET") {
        const got = await ghGetFile(env.GITHUB_TOKEN, POSTS_DIR + "/" + getMatch[1] + ".md");
        if (!got) return json({ error: "not found" }, 404);
        const p = parsePost(got.text);
        return json({ slug: getMatch[1], ...p });
      }

      /* ---- create / update post (editor only) ---- */
      if (url.pathname === "/api/posts" && request.method === "POST") {
        const b = await request.json().catch(() => ({}));
        if (!checkEditor(env, b.secret)) return json({ error: "forbidden" }, 403);
        const ip = request.headers.get("cf-connecting-ip") || "x";
        if (rateLimited(ip)) return json({ error: "slow down" }, 429);
        const title = clean(b.title, 200);
        if (!title) return json({ error: "title required" }, 400);
        const slug = validSlug(b.slug) ? b.slug.toLowerCase() : slugify(title);
        const date = clean(b.date, 30) || new Date().toISOString().slice(0, 16);
        const excerpt = clean(b.excerpt, 500);
        const tags = Array.isArray(b.tags) ? b.tags.map((t) => clean(t, 40)).filter(Boolean).slice(0, 12) : [];
        const body = String(b.body || "").slice(0, 100000);
        const header_media = clean(b.header_media, 500);
        const path = POSTS_DIR + "/" + slug + ".md";
        const existing = await ghGetFile(env.GITHUB_TOKEN, path);
        await ghPutFile(env.GITHUB_TOKEN, path,
          buildPost(title, date, excerpt, tags, body, header_media),
          existing ? existing.sha : null,
          (existing ? "update post " : "new post ") + slug);
        return json({ ok: true, slug });
      }

      /* ---- delete post (editor only) ---- */
      const delMatch = url.pathname.match(/^\/api\/posts\/([a-z0-9-]+)$/i);
      if (delMatch && request.method === "DELETE") {
        const b = await request.json().catch(() => ({}));
        if (!checkEditor(env, b.secret)) return json({ error: "forbidden" }, 403);
        const path = POSTS_DIR + "/" + delMatch[1] + ".md";
        const existing = await ghGetFile(env.GITHUB_TOKEN, path);
        if (!existing) return json({ error: "not found" }, 404);
        await ghDeleteFile(env.GITHUB_TOKEN, path, existing.sha, "delete post " + delMatch[1]);
        return json({ ok: true });
      }

      /* ---- upload header media (editor only) ---- */
      if (url.pathname === "/api/upload" && request.method === "POST") {
        const b = await request.json().catch(() => ({}));
        if (!checkEditor(env, b.secret)) return json({ error: "forbidden" }, 403);
        const ip = request.headers.get("cf-connecting-ip") || "x";
        if (rateLimited(ip)) return json({ error: "slow down" }, 429);
        const ct = String(b.contentType || "");
        if (!/^(image|video)\//.test(ct)) return json({ error: "image or video only" }, 400);
        const data = String(b.data || "").replace(/^data:[^;]+;base64,/, "");
        if (!data || data.length > 14 * 1024 * 1024) return json({ error: "file too large (10MB max)" }, 400);
        const rawName = clean(b.filename, 80).toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+/, "") || "upload";
        const ext = (rawName.match(/\.[a-z0-9]+$/i) || [""])[0];
        const name = Date.now().toString(36) + "-" + Math.floor(Math.random() * 1e4).toString(36) + ext;
        const path = "images/uploads/" + name;
        const r = await fetch(GH_CONTENTS + path, {
          method: "PUT",
          headers: { ...ghHeaders(env.GITHUB_TOKEN), "Content-Type": "application/json" },
          body: JSON.stringify({ message: "upload " + name, content: data })
        });
        if (!r.ok) throw new Error("gh-upload " + r.status);
        return json({ ok: true, url: "https://raw.githubusercontent.com/" + REPO + "/main/" + path });
      }
      /* ---- list ---- */
      if (url.pathname === "/api/comments" && request.method === "GET") {
        const { rows } = await getFile(env.GITHUB_TOKEN);
        return json({ comments: rows.map(normalize).filter((c) => c.id && c.text) });
      }

      const ip = request.headers.get("cf-connecting-ip") || "x";
      if (request.method === "POST" && rateLimited(ip)) {
        return json({ error: "slow down" }, 429);
      }

      /* ---- post / reply ----
         If the poster proves ownership (OWNER_SECRET) and the name is
         "dc", the comment is stamped verified. The site renders an
         Instagram-style verified badge next to the name. */
      if (url.pathname === "/api/comments" && request.method === "POST") {
        const b = await request.json().catch(() => ({}));
        const slug = clean(b.slug, 90);
        const name = clean(b.name, 40) || "anon";
        const text = clean(b.text, 2000);
        const parentId = b.parentId ? String(b.parentId).slice(0, 40) : null;
        if (!validSlug(slug) || !text) return json({ error: "bad input" }, 400);
        const isOwnerPost = !!(env.OWNER_SECRET && b.secret && b.secret === env.OWNER_SECRET);
        const verified = isOwnerPost && name.toLowerCase() === "dc";
        const comment = {
          id: String(Date.now()) + Math.floor(Math.random() * 1e4).toString(),
          slug, parentId, name, text, verified,
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
