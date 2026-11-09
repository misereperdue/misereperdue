// ChatRoom (Durable Object) methods for Misery FM: pasted inside class ChatRoom in the live worker.js.
// fetchRouter calls: if (p.startsWith("/api/fm/")) { const fr = await this.fmRoute(req, p); if (fr) return fr; }
// Top-level fetch: GET|HEAD /api/fm/(audio|art|wave)/<id> -> fmAudio(req, env) (fm.js), before the DO forward.
class ChatRoomFmExcerpt {
  /* ---------- Misery FM ---------- */
  async fmGet() {
    if (!this._fm) this._fm = await this.state.storage.get("fm") || {};
    const fm = this._fm;
    if (!Array.isArray(fm.list)) fm.list = [];
    fm.live = !!fm.live; fm.idx = fm.idx | 0; fm.startedAt = fm.startedAt || 0; fm.v = fm.v || 0;
    if (!Array.isArray(fm.q)) fm.q = [];
    if (!Array.isArray(fm.shuf)) fm.shuf = [];
    if (!Array.isArray(fm.hist)) fm.hist = [];
    if (!["all", "one", "off"].includes(fm.repeat)) fm.repeat = "all";
    if (!fm.stats) fm.stats = { since: 0, played: 0, peak: 0, reacts: 0 };
    fm.xf = Math.max(0, Math.min(6, Number(fm.xf) || 0));
    fm.note = String(fm.note || ""); fm.sched = Number(fm.sched) || 0; fm.paused = !!fm.paused; fm.pos = Number(fm.pos) || 0;
    return fm;
  }
  // FM-only sockets (/api/fm/ws): every page gets instant live/stop updates without the chat socket.
  fmCast(obj) {
    const data = JSON.stringify(obj);
    for (const ws of this.fmSock || []) { try { ws.send(data); } catch (e) { this.fmSock.delete(ws); } }
  }
  async fmWS(req) {
    if (req.headers.get("Upgrade") !== "websocket") return new Response("expected websocket", { status: 426 });
    const set = this.fmSock || (this.fmSock = new Set());
    if (set.size >= 3000) return new Response("busy", { status: 503 });
    const pair = new WebSocketPair(), client = pair[0], server = pair[1];
    server.accept();
    set.add(server);
    const drop = () => set.delete(server);
    server.addEventListener("close", drop);
    server.addEventListener("error", drop);
    server.addEventListener("message", () => {});
    const fm = await this.fmGet();
    if (this.fmAdvance(fm, Date.now())) await this.fmSave(fm);
    try { server.send(JSON.stringify({ t: "fm", fm: this.fmPublic(fm) })); } catch (e) {}
    return new Response(null, { status: 101, webSocket: client });
  }
  fmDur(t) { return Math.max(1, Number(t && t.dur) || 180) * 1e3; }
  // Time on the station timeline: crossfade starts the next track xf seconds early.
  fmEff(fm, t) { return Math.max(1e3, this.fmDur(t) - (fm.xf || 0) * 1e3); }
  fmShufFix(fm, fresh) {
    const ids = fm.list.map((t) => t.id), cur = fm.list[fm.idx] && fm.list[fm.idx].id;
    if (fresh || !fm.shuf.length) {
      const rest = ids.filter((x) => x !== cur);
      for (let i = rest.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [rest[i], rest[j]] = [rest[j], rest[i]]; }
      fm.shuf = cur ? [cur].concat(rest) : rest;
      return;
    }
    fm.shuf = fm.shuf.filter((x) => ids.includes(x));
    for (const x of ids) if (!fm.shuf.includes(x)) fm.shuf.splice(Math.floor(Math.random() * (fm.shuf.length + 1)), 0, x);
  }
  // One step of the play order. Returns { i, q } (q = remaining play-next ids) or i = -1 when the station ends.
  fmStep(fm, i, q, manual) {
    const L = fm.list, n = L.length;
    if (!n) return { i: -1, q };
    q = q.filter((x) => L.some((t) => t.id === x));
    if (q.length) { const id = q[0]; return { i: L.findIndex((t) => t.id === id), q: q.slice(1) }; }
    if (fm.repeat === "one" && !manual) return { i, q };
    if (fm.shuffle && fm.shuf.length) {
      const p = fm.shuf.indexOf(L[i] && L[i].id);
      if (p + 1 >= fm.shuf.length && fm.repeat === "off" && !manual) return { i: -1, q };
      const id = fm.shuf[(p + 1) % fm.shuf.length];
      return { i: L.findIndex((t) => t.id === id), q };
    }
    if (i + 1 >= n && fm.repeat === "off" && !manual) return { i: -1, q };
    return { i: (i + 1) % n, q };
  }
  fmUpNext(fm, k) {
    const out = [];
    let i = fm.idx, q = fm.q.slice();
    for (let n = 0; n < k; n++) { const s = this.fmStep(fm, i, q, false); if (s.i < 0) break; out.push(fm.list[s.i].id); i = s.i; q = s.q; }
    return out;
  }
  fmHist(fm, t) {
    if (!t) return;
    fm.hist.unshift({ id: t.id, title: t.title, artist: t.artist, album: t.album || "", art: t.art || "", explicit: !!t.explicit, at: Date.now() });
    fm.hist = fm.hist.slice(0, 12);
    fm.stats.played = (fm.stats.played || 0) + 1;
  }
  fmGo(fm, i, now) { fm.idx = i; fm.startedAt = now; fm.pos = 0; }
  fmPosNow(fm, now) { return fm.paused ? fm.pos : Math.max(0, (now - fm.startedAt) / 1e3); }
  fmStartLive(fm, now) {
    if (!fm.list.length) return false;
    if (fm.idx >= fm.list.length) fm.idx = 0;
    fm.live = true; fm.paused = false; fm.startedAt = now; fm.pos = 0; fm.sched = 0;
    fm.stats = { since: now, played: 0, peak: this.fmListeners(), reacts: 0 };
    this._fmReacts = 0;
    if (fm.shuffle) this.fmShufFix(fm, true);
    return true;
  }
  fmAdvance(fm, now) {
    let moved = false;
    if (!fm.live && fm.sched && now >= fm.sched && fm.list.length) { this.fmStartLive(fm, fm.sched); moved = true; }
    if (!fm.live || fm.paused || !fm.list.length) return moved;
    if (fm.idx >= fm.list.length) { fm.idx = 0; moved = true; }
    for (let n = 0; n < 2000 && now - fm.startedAt >= this.fmEff(fm, fm.list[fm.idx]); n++) {
      const cur = fm.list[fm.idx], s = this.fmStep(fm, fm.idx, fm.q, false);
      this.fmHist(fm, cur);
      fm.startedAt += this.fmEff(fm, cur);
      moved = true;
      if (s.i < 0) { fm.live = false; fm.idx = 0; fm.q = []; break; }
      fm.idx = s.i; fm.q = s.q;
    }
    return moved;
  }
  fmTrack(t) {
    return { id: t.id, title: t.title, artist: t.artist, album: t.album || "", year: t.year || "", genre: t.genre || "", notes: t.notes || "", explicit: !!t.explicit, art: t.art || "", wave: !!t.wave, dur: t.dur, type: t.type };
  }
  fmListeners() {
    const m = this._fmL || (this._fmL = new Map()), now = Date.now();
    for (const [k, ts] of m) if (now - ts > 75e3) m.delete(k);
    return m.size;
  }
  fmPublic(fm) {
    const st = fm.stats || {};
    return { live: !!fm.live && fm.list.length > 0, paused: !!fm.paused, pos: fm.pos || 0, idx: fm.idx, startedAt: fm.startedAt, v: fm.v || 0, now: Date.now(),
      shuffle: !!fm.shuffle, repeat: fm.repeat, xf: fm.xf || 0, note: fm.note || "", sched: fm.sched || 0, q: fm.q.slice(0, 20),
      upNext: this.fmUpNext(fm, 6), hist: fm.hist.slice(0, 10), listeners: this.fmListeners(),
      stats: { since: st.since || 0, played: st.played || 0, peak: Math.max(st.peak || 0, this._fmPeak || 0), reacts: (st.reacts || 0) + (this._fmReacts || 0) },
      list: fm.list.map((t) => this.fmTrack(t)) };
  }
  async fmSave(fm) {
    fm.v = (fm.v || 0) + 1;
    if (this._fmReacts) { fm.stats.reacts = (fm.stats.reacts || 0) + this._fmReacts; this._fmReacts = 0; }
    if (this._fmPeak > (fm.stats.peak || 0)) fm.stats.peak = this._fmPeak;
    await this.state.storage.put("fm", fm);
    this.fmCast({ t: "fm", fm: this.fmPublic(fm) });
    try {
      let at = 0;
      if (fm.live && !fm.paused && fm.list.length) at = fm.startedAt + this.fmEff(fm, fm.list[fm.idx]) + 250;
      if (!fm.live && fm.sched) at = at ? Math.min(at, fm.sched) : fm.sched;
      if (at) await this.state.storage.setAlarm(Math.max(Date.now() + 50, at)); else await this.state.storage.deleteAlarm();
    } catch (e) {
    }
  }
  async alarm() {
    const fm = await this.fmGet();
    if (!(fm.live || fm.sched) || !fm.list.length) return;
    this.fmAdvance(fm, Date.now());
    await this.fmSave(fm);
  }
  async fmOwner(req) {
    const me = await this.bearerUser(req);
    return me && me.owner ? me : null;
  }
  fmClean(v, n) { return String(v == null ? "" : v).replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, n); }
  fmMeta(t, src) {
    if ("title" in src) t.title = this.fmClean(src.title, 120) || "Untitled";
    if ("artist" in src) t.artist = this.fmClean(src.artist, 120);
    if ("album" in src) t.album = this.fmClean(src.album, 120);
    if ("genre" in src) t.genre = this.fmClean(src.genre, 40);
    if ("notes" in src) t.notes = this.fmClean(src.notes, 280);
    if ("year" in src) { const y = String(src.year || "").match(/\d{4}/); t.year = y ? y[0] : ""; }
    if ("explicit" in src) t.explicit = src.explicit === true || src.explicit === "1" || src.explicit === 1 || src.explicit === "true";
  }
  async fmRoute(req, p) {
    const now = Date.now();
    if (p === "/api/fm/ws") return this.fmWS(req);
    if (p === "/api/fm/state" && req.method === "GET") {
      const fm = await this.fmGet();
      if (this.fmAdvance(fm, now)) await this.fmSave(fm);
      return json({ ok: true, fm: this.fmPublic(fm) });
    }
    if (p === "/api/fm/listen" && req.method === "POST") {
      let body = {};
      try { body = await req.json(); } catch (e) {}
      const key = String(this.deviceIdFromReq(req, body) || this.clientIp(req) || "").slice(0, 80);
      if (!key) return err("no device");
      const m = this._fmL || (this._fmL = new Map()), before = this.fmListeners();
      body.on ? m.set(key, now) : m.delete(key);
      const n = this.fmListeners();
      if (n > (this._fmPeak || 0)) this._fmPeak = n;
      if (n !== before) this.fmCast({ t: "fml", n });
      return json({ ok: true, listeners: n });
    }
    if (p === "/api/fm/react" && req.method === "POST") {
      let body = {};
      try { body = await req.json(); } catch (e) {}
      const e = String(body.e || "");
      if (!FM_EMOJI.includes(e)) return err("bad emoji");
      const me = await this.bearerUser(req).catch(() => null);
      const key = me ? "u:" + me.username : "d:" + String(this.deviceIdFromReq(req, body) || this.clientIp(req) || "");
      const rl = this._fmRl || (this._fmRl = new Map()), r = rl.get(key) || { last: 0, win: now, n: 0 };
      if (now - r.win > 10e3) { r.win = now; r.n = 0; }
      if (now - r.last < 600 || r.n >= 15) return err("slow down", 429);
      r.last = now; r.n++; rl.set(key, r);
      if (rl.size > 5000) rl.clear();
      this._fmReacts = (this._fmReacts || 0) + 1;
      this.fmCast({ t: "fmr", e, u: me ? me.username : "" });
      return json({ ok: true });
    }
    const isUp = p === "/api/fm/upload" || p === "/api/fm/art" || p === "/api/fm/wave";
    if (isUp && req.method === "POST") {
      if (!await this.fmOwner(req)) return err("owner only", 403);
      if (!this.env.FM_BUCKET) return err("storage unavailable", 503);
      const qs = new URL(req.url).searchParams, type = String(req.headers.get("Content-Type") || "").split(";")[0].trim().toLowerCase();
      const len = Number(req.headers.get("Content-Length") || 0), fm = await this.fmGet();
      if (p === "/api/fm/upload") {
        if (!FM_TYPES[type]) return err("MP3, M4A or AAC only", 415);
        if (len > FM_MAX) return err("max 25 MB", 413);
        if (fm.list.length >= FM_LIST_MAX) return err("playlist full", 400);
        const buf = await req.arrayBuffer();
        if (!buf.byteLength) return err("empty file", 400);
        if (buf.byteLength > FM_MAX) return err("max 25 MB", 413);
        const id = crypto.randomUUID().replace(/-/g, "").slice(0, 20);
        const dur = Math.round(Math.min(3600, Math.max(1, Number(qs.get("dur") || 0) || 180)) * 1000) / 1000;
        const t = { id, title: "Untitled", artist: "", dur, type, size: buf.byteLength, at: now };
        this.fmMeta(t, Object.fromEntries(qs));
        await this.env.FM_BUCKET.put("t/" + id, buf, { httpMetadata: { contentType: type === "audio/mp3" ? "audio/mpeg" : type, cacheControl: "public, max-age=31536000, immutable" }, customMetadata: { title: t.title, artist: t.artist, dur: String(dur) } });
        fm.list.push(t);
        if (fm.shuffle) this.fmShufFix(fm, false);
        await this.fmSave(fm);
        return json({ ok: true, id, fm: this.fmPublic(fm) });
      }
      const t = fm.list.find((x) => x.id === qs.get("id"));
      if (!t) return err("not found", 404);
      const buf = await req.arrayBuffer();
      if (p === "/api/fm/art") {
        if (!FM_IMG[type]) return err("JPEG, PNG or WebP only", 415);
        if (!buf.byteLength || buf.byteLength > FM_ART_MAX) return err("max 3 MB", 413);
        const aid = crypto.randomUUID().replace(/-/g, "").slice(0, 20);
        await this.env.FM_BUCKET.put("a/" + aid, buf, { httpMetadata: { contentType: type, cacheControl: "public, max-age=31536000, immutable" } });
        if (t.art) try { await this.env.FM_BUCKET.delete("a/" + t.art); } catch (e) {}
        t.art = aid;
      } else {
        if (!buf.byteLength || buf.byteLength > FM_WAVE_MAX) return err("bad wave", 400);
        await this.env.FM_BUCKET.put("w/" + t.id, buf, { httpMetadata: { contentType: "application/octet-stream", cacheControl: "public, max-age=31536000, immutable" } });
        t.wave = true;
      }
      await this.fmSave(fm);
      return json({ ok: true, fm: this.fmPublic(fm) });
    }
    if (p === "/api/fm/control" && req.method === "POST") {
      if (!await this.fmOwner(req)) return err("owner only", 403);
      let body = {};
      try { body = await req.json(); } catch (e) { return err("bad request"); }
      const fm = await this.fmGet(), a = String(body.action || "");
      this.fmAdvance(fm, now);
      const L = fm.list, at = L.findIndex((t) => t.id === body.id), cur = L[fm.idx], pos = this.fmPosNow(fm, now);
      const need = () => { if (!L.length) throw new Error("add a song first"); };
      try {
        if (a === "live") { need(); if (!fm.live) this.fmStartLive(fm, now); }
        else if (a === "stop") { fm.live = false; fm.paused = false; }
        else if (a === "pause") { if (fm.live && !fm.paused) { fm.paused = true; fm.pos = pos; } }
        else if (a === "resume") { if (fm.live && fm.paused) { fm.paused = false; fm.startedAt = now - fm.pos * 1e3; } }
        else if (a === "skip") { need(); const s = this.fmStep(fm, fm.idx, fm.q, true); this.fmHist(fm, cur); fm.q = s.q; this.fmGo(fm, s.i < 0 ? 0 : s.i, now); }
        else if (a === "prev") {
          need();
          if (pos > 3 || !fm.hist.length) this.fmGo(fm, fm.idx, now);
          else { let j = -1; while (fm.hist.length && j < 0) { const h = fm.hist.shift(); j = L.findIndex((t) => t.id === h.id); } if (j >= 0) { cur && fm.q.unshift(cur.id); this.fmGo(fm, j, now); } else this.fmGo(fm, fm.idx, now); }
        } else if (a === "restart") { need(); this.fmGo(fm, fm.idx, now); }
        else if (a === "seek") {
          need();
          const d = this.fmDur(cur) / 1e3, sp = Math.max(0, Math.min(d - 1, Number(body.pos) || 0));
          fm.paused ? (fm.pos = sp) : (fm.startedAt = now - sp * 1e3);
        } else if (a === "play") { if (at < 0) throw new Error("not found"); if (!fm.live) this.fmStartLive(fm, now); else if (cur && at !== fm.idx) this.fmHist(fm, cur); fm.paused = false; this.fmGo(fm, at, now); }
        else if (a === "next") { if (at < 0) throw new Error("not found"); fm.q = [body.id].concat(fm.q.filter((x) => x !== body.id)).slice(0, 50); }
        else if (a === "unqueue") fm.q = fm.q.filter((x) => x !== body.id);
        else if (a === "move") {
          const to = body.to != null ? Math.max(0, Math.min(L.length - 1, body.to | 0)) : at + (body.dir < 0 ? -1 : 1);
          if (at < 0 || to < 0 || to >= L.length) throw new Error("bad move");
          const t = L.splice(at, 1)[0];
          L.splice(to, 0, t); fm.idx = Math.max(0, L.indexOf(cur));
        } else if (a === "remove") {
          if (at < 0) throw new Error("not found");
          const playing = at === fm.idx, t = L[at];
          L.splice(at, 1);
          for (const k of ["t/" + t.id, "w/" + t.id].concat(t.art ? ["a/" + t.art] : [])) try { await this.env.FM_BUCKET.delete(k); } catch (e) {}
          fm.q = fm.q.filter((x) => x !== t.id);
          if (at < fm.idx) fm.idx--;
          if (!L.length) { fm.live = false; fm.idx = 0; fm.paused = false; }
          else if (playing) { this.fmGo(fm, fm.idx % L.length, now); }
          if (fm.shuffle) this.fmShufFix(fm, false);
        } else if (a === "edit") { if (at < 0) throw new Error("not found"); this.fmMeta(L[at], body); }
        else if (a === "artdel") { if (at < 0) throw new Error("not found"); if (L[at].art) { try { await this.env.FM_BUCKET.delete("a/" + L[at].art); } catch (e) {} L[at].art = ""; } }
        else if (a === "shuffle") { fm.shuffle = !!body.on; if (fm.shuffle) this.fmShufFix(fm, true); }
        else if (a === "repeat") { if (!["all", "one", "off"].includes(body.mode)) throw new Error("bad mode"); fm.repeat = body.mode; }
        else if (a === "note") fm.note = this.fmClean(body.text, 140);
        else if (a === "sched") { const t = Number(body.at) || 0; if (t && (t < now - 6e4 || t > now + 30 * 864e5)) throw new Error("pick a time in the next 30 days"); fm.sched = t > now ? t : 0; if (t && t <= now && !fm.live) this.fmStartLive(fm, now); }
        else if (a === "xf") {
          const nx = Math.max(0, Math.min(6, Math.round((Number(body.sec) || 0) * 2) / 2));
          if (fm.live && !fm.paused) fm.startedAt = now - pos * 1e3;
          fm.xf = nx;
        } else throw new Error("unknown action");
      } catch (e) {
        return err(String(e.message || "bad request"), e.message === "not found" ? 404 : 400);
      }
      this.fmAdvance(fm, now);
      await this.fmSave(fm);
      return json({ ok: true, fm: this.fmPublic(fm) });
    }
    return null;
  }
}
