# misery-chat Worker — excerpts in version control

The full `misery-chat` Worker source is **not** in this public repo. It lives only
in Cloudflare (download it read-only with `GET /accounts/<id>/workers/scripts/misery-chat/content/v2`
before editing). The files here are the parts Grim added, copied verbatim from the
deployed script so they are reviewable and testable:

| File | Where it lives in the live `worker.js` | Since |
|---|---|---|
| `music.js` | top level; `GET /api/music/search` (Deezer-led search, PR #49) | Worker 8369411d |
| `fm.js` | top level; `FM_TYPES`, `FM_MAX`, `fmAudio` for `GET/HEAD /api/fm/audio/<id>` | Worker 4e07045e |
| `fm_do.js` | methods inside `class ChatRoom` (wrapped in a stub class here) | Worker 4e07045e |
| `test-fm.mjs` | Node logic test with mocked R2 + DO storage: `node worker/misery-chat/src/test-fm.mjs` | |

Live wiring for Misery FM (Worker version `4e07045e-40a8-402b-a40d-9160e542baa5`, 2026-11-09):

- `ChatRoom.fetchRouter`: `if (p.startsWith("/api/fm/")) { const fr = await this.fmRoute(req, p); if (fr) return fr; }`
  as the first line inside the router's `try`.
- Top-level `fetch`: `GET|HEAD /api/fm/audio/<id>` → `fmAudio(req, env)` before the DO forward.
- `ChatRoom.alarm()` advances the playlist at each track end (the DO had no alarm before).
- Binding `FM_BUCKET` → R2 bucket `misery-fm`. Objects are stored as `t/<20-char id>`.

Deploys are API uploads (`PUT /workers/scripts/misery-chat`, multipart) with
`keep_bindings: ["secret_text","plain_text","ai","durable_object_namespace"]` and the
new R2 binding listed explicitly, so secrets are never re-sent. Never put secrets in these files.
