# misery-chat Worker — excerpts in version control

The full `misery-chat` Worker source is **not** in this public repo. It lives only
in Cloudflare (download it read-only with `GET /accounts/<id>/workers/scripts/misery-chat/content/v2`
before editing). The files here are the parts Grim added, copied verbatim from the
deployed script so they are reviewable and testable:

| File | Where it lives in the live `worker.js` | Since |
|---|---|---|
| `music.js` | top level; `GET /api/music/search` (Deezer-led search, PR #49) | Worker 8369411d |
| `fm.js` | top level; `FM_TYPES`, `FM_MAX`, `fmAudio` for `GET/HEAD /api/fm/(audio\|art\|wave)/<id>` | Worker 4e07045e, v2 2348f56d |
| `fm_do.js` | methods inside `class ChatRoom` (wrapped in a stub class here) | Worker 4e07045e, v2 2348f56d |
| `test-fm.mjs` | Node logic test with mocked R2 + DO storage: `node worker/misery-chat/src/test-fm.mjs` | |

Live wiring for Misery FM (Worker version `4e07045e-40a8-402b-a40d-9160e542baa5`, 2026-11-09):

- `ChatRoom.fetchRouter`: `if (p.startsWith("/api/fm/")) { const fr = await this.fmRoute(req, p); if (fr) return fr; }`
  as the first line inside the router's `try`.
- Top-level `fetch`: `GET|HEAD /api/fm/audio/<id>` → `fmAudio(req, env)` before the DO forward.
- `ChatRoom.alarm()` advances the playlist at each track end (the DO had no alarm before).
- Binding `FM_BUCKET` → R2 bucket `misery-fm`. Objects are stored as `t/<20-char id>`.

### Misery FM v2 (Worker version `2348f56d-8992-47ec-9d00-ba78f8e0f283`, 2026-11-09)

- FM no longer rides the chat WebSocket. `GET /api/fm/ws` (WebSocket, cap 3000) sends the
  state on connect; changes go out as `{t:"fm",fm}`, listener counts as `{t:"fml",n}` and
  reactions as `{t:"fmr",e,u}`, only to FM sockets (`this.fmSock`).
- State adds `paused,pos,q,shuffle,repeat,hist,stats,xf,note,sched`; tracks add
  `album,year,genre,notes,explicit,art,wave`. `fmPublic` adds `upNext`, `hist`, `listeners`.
- New routes: `POST /api/fm/listen {on}` (75 s heartbeat), `POST /api/fm/react {e}`
  (6 emoji, rate-limited, 429), owner `POST /api/fm/art?id=` (≤ 3 MB jpeg/png/webp, R2 `a/`),
  owner `POST /api/fm/wave?id=` (≤ 40 KB loudness map, R2 `w/`).
- `/api/fm/control` actions: `live stop pause resume skip prev restart seek play next unqueue
  move remove edit artdel shuffle repeat note sched xf`.
- The alarm fires at min(track end + 250 ms, scheduled go-live).
- After a deploy the DO kept serving old code for several minutes, until it restarted.

Deploys are API uploads (`PUT /workers/scripts/misery-chat`, multipart) with
`keep_bindings: ["secret_text","plain_text","ai","durable_object_namespace"]` and the
new R2 binding listed explicitly, so secrets are never re-sent. Never put secrets in these files.
