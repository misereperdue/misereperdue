// ChatRoom (Durable Object) methods for Misery FM: pasted inside class ChatRoom in the live worker.js.
// fetchRouter calls: if (p.startsWith("/api/fm/")) { const fr = await this.fmRoute(req, p); if (fr) return fr; }
// Top-level fetch: GET|HEAD /api/fm/audio/<id> -> fmAudio(req, env) (fm.js), before the DO forward.
class ChatRoomFmExcerpt {
  /* ---------- Misery FM ---------- */
  async fmGet() {
    if (!this._fm) this._fm = await this.state.storage.get("fm") || { live: false, idx: 0, startedAt: 0, list: [], v: 0 };
    return this._fm;
  }
  fmDur(t) { return Math.max(1, Number(t && t.dur) || 180) * 1e3; }
  fmAdvance(fm, now) {
    if (!fm.live || !fm.list.length) return false;
    let moved = false;
    if (fm.idx >= fm.list.length) { fm.idx = 0; moved = true; }
    for (let i = 0; i < 2000 && now - fm.startedAt >= this.fmDur(fm.list[fm.idx]); i++) {
      fm.startedAt += this.fmDur(fm.list[fm.idx]);
      fm.idx = (fm.idx + 1) % fm.list.length;
      moved = true;
    }
    return moved;
  }
  fmPublic(fm) {
    return { live: !!fm.live && fm.list.length > 0, idx: fm.idx, startedAt: fm.startedAt, v: fm.v || 0, now: Date.now(),
      list: fm.list.map((t) => ({ id: t.id, title: t.title, artist: t.artist, dur: t.dur, type: t.type })) };
  }
  async fmSave(fm) {
    fm.v = (fm.v || 0) + 1;
    await this.state.storage.put("fm", fm);
    this.broadcast({ t: "fm", fm: this.fmPublic(fm) });
    try {
      if (fm.live && fm.list.length) await this.state.storage.setAlarm(fm.startedAt + this.fmDur(fm.list[fm.idx]) + 250);
      else await this.state.storage.deleteAlarm();
    } catch (e) {
    }
  }
  async alarm() {
    const fm = await this.fmGet();
    if (!fm.live || !fm.list.length) return;
    this.fmAdvance(fm, Date.now());
    await this.fmSave(fm);
  }
  async fmOwner(req) {
    const me = await this.bearerUser(req);
    return me && me.owner ? me : null;
  }
  async fmRoute(req, p) {
    if (p === "/api/fm/state" && req.method === "GET") {
      const fm = await this.fmGet();
      if (this.fmAdvance(fm, Date.now())) await this.fmSave(fm);
      return json({ ok: true, fm: this.fmPublic(fm) });
    }
    if (p === "/api/fm/upload" && req.method === "POST") {
      if (!await this.fmOwner(req)) return err("owner only", 403);
      if (!this.env.FM_BUCKET) return err("storage unavailable", 503);
      const type = String(req.headers.get("Content-Type") || "").split(";")[0].trim().toLowerCase(), ext = FM_TYPES[type];
      if (!ext) return err("MP3, M4A or AAC only", 415);
      const len = Number(req.headers.get("Content-Length") || 0);
      if (len > FM_MAX) return err("max 25 MB", 413);
      const fm = await this.fmGet();
      if (fm.list.length >= FM_LIST_MAX) return err("playlist full", 400);
      const buf = await req.arrayBuffer();
      if (!buf.byteLength) return err("empty file", 400);
      if (buf.byteLength > FM_MAX) return err("max 25 MB", 413);
      const qs = new URL(req.url).searchParams, dec = (k, n) => { try { return String(qs.get(k) || "").replace(/[\u0000-\u001f]/g, "").trim().slice(0, n); } catch (e) { return ""; } };
      const id = crypto.randomUUID().replace(/-/g, "").slice(0, 20);
      const dur = Math.round(Math.min(3600, Math.max(1, Number(qs.get("dur") || 0) || 180)) * 1000) / 1000;
      const title = dec("title", 120) || "Untitled", artist = dec("artist", 120);
      await this.env.FM_BUCKET.put("t/" + id, buf, { httpMetadata: { contentType: type === "audio/mp3" ? "audio/mpeg" : type, cacheControl: "public, max-age=31536000, immutable" }, customMetadata: { title, artist, dur: String(dur) } });
      fm.list.push({ id, title, artist, dur, type, size: buf.byteLength, at: Date.now() });
      await this.fmSave(fm);
      return json({ ok: true, id, fm: this.fmPublic(fm) });
    }
    if (p === "/api/fm/control" && req.method === "POST") {
      if (!await this.fmOwner(req)) return err("owner only", 403);
      let body = {};
      try { body = await req.json(); } catch (e) { return err("bad request"); }
      const fm = await this.fmGet(), now = Date.now(), a = String(body.action || "");
      this.fmAdvance(fm, now);
      const at = fm.list.findIndex((t) => t.id === body.id);
      if (a === "live") { if (!fm.list.length) return err("add a song first"); if (!fm.live) { fm.live = true; fm.startedAt = now; if (fm.idx >= fm.list.length) fm.idx = 0; } }
      else if (a === "stop") fm.live = false;
      else if (a === "skip") { if (!fm.list.length) return err("empty"); fm.idx = (fm.idx + 1) % fm.list.length; fm.startedAt = now; }
      else if (a === "play") { if (at < 0) return err("not found", 404); fm.idx = at; fm.startedAt = now; fm.live = true; }
      else if (a === "move") {
        const to = at + (body.dir < 0 ? -1 : 1);
        if (at < 0 || to < 0 || to >= fm.list.length) return err("bad move");
        const cur = fm.list[fm.idx], t = fm.list.splice(at, 1)[0];
        fm.list.splice(to, 0, t); fm.idx = fm.list.indexOf(cur);
      } else if (a === "remove") {
        if (at < 0) return err("not found", 404);
        const playing = at === fm.idx;
        fm.list.splice(at, 1);
        try { await this.env.FM_BUCKET.delete("t/" + body.id); } catch (e) {}
        if (at < fm.idx) fm.idx--;
        if (!fm.list.length) { fm.live = false; fm.idx = 0; }
        else if (playing) { fm.idx = fm.idx % fm.list.length; fm.startedAt = now; }
      } else return err("unknown action");
      await this.fmSave(fm);
      return json({ ok: true, fm: this.fmPublic(fm) });
    }
    return null;
  }
}
