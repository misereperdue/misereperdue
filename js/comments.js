/* MISERY comments — threads, votes, replies. Global for everyone.
 *
 * Writes go through the Cloudflare Worker backend (no tokens in page source).
 * The worker URL is set below once deployed. Until then, the client falls
 * back to the legacy direct-GitHub mode, which only works on the device that
 * holds a token in localStorage ("mp-token").
 *
 * Deletes are owner-only: the worker checks OWNER_SECRET, which lives only
 * in the worker's secrets and on the owner's device (localStorage
 * "mp-owner-secret", set via the #own flow).
 */
var MPComments = (function () {
  "use strict";

  /* dc: paste your worker URL here after deploying, e.g.
     "https://misery-comments.you.workers.dev" (no trailing slash). */
  var WORKER_URL = "https://misery-comments.freeglory416.workers.dev";

  var REPO = "misereperdue/misereperdue";
  var FILE = "comments.json";
  var API = "https://api.github.com/repos/" + REPO + "/contents/" + FILE;

  function useWorker() { return !!WORKER_URL; }
  function w(path) { return WORKER_URL + path; }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function isOwner() { return lsGet("mp-owner") === "1"; }
  function ownerSecret() { return lsGet("mp-owner-secret") || ""; }
  function legacyToken() { return lsGet("mp-token") || ""; }
  function getVotes() {
    try { return JSON.parse(localStorage.getItem("mp-votes") || "{}"); }
    catch (e) { return {}; }
  }
  function setVotes(v) {
    try { localStorage.setItem("mp-votes", JSON.stringify(v)); } catch (e) {}
  }

  function initials(name) {
    return String(name || "?").trim().slice(0, 2) || "?";
  }
  function avatarHTML(name) {
    return '<span class="avatar" aria-hidden="true">' + esc(initials(name)) + "</span>";
  }
  function timeAgo(ts) {
    var s = Math.max(1, Math.floor((Date.now() - ts) / 1000));
    if (s < 60) return "now";
    var m = Math.floor(s / 60);
    if (m < 60) return m + "m";
    var h = Math.floor(m / 60);
    if (h < 24) return h + "h";
    var d = Math.floor(h / 24);
    if (d < 7) return d + "d";
    return new Date(ts).toISOString().slice(0, 10);
  }

  /* ---------- storage layer: worker or legacy ---------- */

  function load() {
    if (useWorker()) {
      return fetch(w("/api/comments")).then(function (r) { return r.json(); })
        .then(function (d) { return d.comments || []; })
        .catch(function () { return []; });
    }
    return fetch(FILE + "?t=" + Date.now())
      .then(function (r) { return r.json(); })
      .catch(function () { return []; });
  }

  function legacySave(rows, token) {
    token = token || legacyToken();
    if (!token) return Promise.reject(new Error("no-token"));
    var body = JSON.stringify(rows.filter(Boolean), null, 2);
    var headers = { Authorization: "Bearer " + token };
    return fetch(API, { headers: headers })
      .then(function (r) { return r.json(); })
      .then(function (f) {
        return fetch(API, {
          method: "PUT",
          headers: {
            Authorization: "Bearer " + token,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            message: "Update comments",
            content: btoa(unescape(encodeURIComponent(body))),
            sha: f.sha
          })
        });
      });
  }

  function apiPost(path, body) {
    return fetch(w(path), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }).then(function (r) {
      if (!r.ok) throw new Error("api " + r.status);
      return r.json();
    });
  }

  function normalize(rows) {
    return (Array.isArray(rows) ? rows : []).map(function (c) {
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
    }).filter(function (c) { return c.id && c.text; });
  }

  var state = { rows: [], slug: "", listEl: null };

  function score(c) { return c.up - c.down; }

  function checkSVG() {
    return '<svg class="check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.5 12.5l5 5 10-11"/></svg>';
  }

  function verifiedBadge() {
    return '<span class="verified" title="Verified author" aria-label="Verified author">' +
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22.1 12.0L21.7 12.9L21.0 13.6L20.3 14.2L20.0 14.9L20.1 15.8L20.4 16.8L20.2 17.8L19.6 18.3L18.5 18.5L17.6 18.6L16.9 18.9L16.4 19.7L16.0 20.6L15.4 21.4L14.6 21.6L13.6 21.2L12.8 20.7L12.0 20.4L11.2 20.7L10.4 21.2L9.4 21.6L8.6 21.4L8.0 20.6L7.6 19.7L7.1 18.9L6.4 18.6L5.5 18.5L4.4 18.3L3.8 17.8L3.6 16.8L3.9 15.8L4.0 14.9L3.7 14.2L3.0 13.6L2.3 12.9L1.9 12.0L2.3 11.1L3.0 10.4L3.7 9.8L4.0 9.1L3.9 8.2L3.6 7.2L3.8 6.2L4.4 5.7L5.5 5.5L6.4 5.4L7.1 5.1L7.6 4.3L8.0 3.4L8.6 2.6L9.4 2.4L10.4 2.8L11.2 3.3L12.0 3.6L12.8 3.3L13.6 2.8L14.6 2.4L15.4 2.6L16.0 3.4L16.4 4.3L16.9 5.1L17.6 5.4L18.5 5.5L19.6 5.7L20.2 6.2L20.4 7.2L20.1 8.2L20.0 9.1L20.3 9.8L21.0 10.4L21.7 11.1Z" class="seal"/>' +
      '<path class="vcheck" d="M8.5 12.3l2.1 2 4.9-5.2" fill="none" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span>';
  }

  function commentHTML(c, depth) {
    var votes = getVotes();
    var mine = votes[c.id] || 0;
    var kids = state.rows
      .filter(function (r) { return r.parentId === c.id; })
      .sort(function (a, b) { return a.createdAt - b.createdAt; });
    var kidsHTML = kids.map(function (k) { return commentHTML(k, depth + 1); }).join("");
    return (
      '<div class="comment" data-id="' + esc(c.id) + '">' +
        '<div class="comment-main"><span class="avatar-wrap">' + avatarHTML(c.name) +
            (c.verified ? verifiedBadge() : "") + "</span>" +
          '<div class="comment-body">' +
            '<div class="comment-head"><strong>' + esc(c.name) + '</strong>' +
            '<span class="meta"> · ' + esc(timeAgo(c.createdAt)) + "</span></div>" +
            "<p>" + esc(c.text) + "</p>" +
            '<div class="comment-actions">' +
              '<button type="button" class="vote' + (mine === 1 ? " on" : "") + '" data-vote="1" data-id="' + esc(c.id) + '" aria-label="Upvote">' +
                '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 5l7 10H5z"/></svg>' +
                "<span>" + c.up + "</span></button>" +
              '<button type="button" class="vote' + (mine === -1 ? " on" : "") + '" data-vote="-1" data-id="' + esc(c.id) + '" aria-label="Downvote">' +
                '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 19l-7-10h14z"/></svg>' +
                "<span>" + c.down + "</span></button>" +
              '<button type="button" class="reply-link" data-reply="' + esc(c.id) + '" data-reply-name="' + esc(c.name) + '">Reply</button>' +
              (isOwner() ? '<button type="button" class="del" data-del="' + esc(c.id) + '">Delete</button>' : "") +
            "</div>" +
            (kidsHTML ? '<div class="replies">' + kidsHTML + "</div>" : "") +
          "</div>" +
        "</div>" +
      "</div>"
    );
  }

  function drawList() {
    if (!state.listEl) return;
    var top = state.rows
      .filter(function (c) { return c.slug === state.slug && !c.parentId; })
      .sort(function (a, b) { return score(b) - score(a) || b.createdAt - a.createdAt; });
    state.listEl.innerHTML = top.length
      ? top.map(function (c) { return commentHTML(c, 0); }).join("")
      : '<p class="empty">No comments yet.</p>';
    bindList(state.listEl);
  }

  function bindList(root) {
    root.querySelectorAll("[data-vote]").forEach(function (b) {
      b.onclick = function () { castVote(b.dataset.id, +b.dataset.vote); };
    });
    root.querySelectorAll("[data-reply]").forEach(function (b) {
      b.onclick = function () { startReply(b.dataset.reply, b.dataset.replyName); };
    });
    root.querySelectorAll("[data-del]").forEach(function (b) {
      b.onclick = function () { removeThread(b.dataset.del); };
    });
  }

  function morphDone(btn) {
    btn.classList.add("done");
    btn.disabled = true;
    setTimeout(function () {
      btn.classList.remove("done");
      btn.disabled = false;
    }, 1600);
  }

  function needTokenAlert() {
    alert("Comments aren't switched on yet — the backend is still being set up.");
  }

  function postComment(data) {
    if (useWorker()) return apiPost("/api/comments", data);
    var token = legacyToken();
    if (!token) return Promise.reject(new Error("no-token"));
    return load().then(function (rows) {
      rows = normalize(rows);
      var c = {
        id: String(Date.now()) + Math.floor(Math.random() * 1e4),
        slug: state.slug,
        parentId: data.parentId || null,
        name: data.name,
        text: data.text,
        createdAt: Date.now(),
        up: 0,
        down: 0
      };
      if (c.parentId && !rows.some(function (r) { return r.id === c.parentId; })) {
        return Promise.reject(new Error("no-parent"));
      }
      rows.push(c);
      return legacySave(rows, token).then(function () { return { ok: true }; });
    });
  }

  function refresh() {
    return load().then(function (rows) {
      state.rows = normalize(rows);
      drawList();
    });
  }

  function startReply(id, name) {
    state.replyTo = id;
    updateReplyUI(name);
    var form = document.getElementById("comment-form");
    if (form) {
      form.scrollIntoView({ behavior: "smooth", block: "center" });
      var t = form.querySelector("textarea");
      if (t) t.focus({ preventScroll: true });
    }
  }

  function cancelReply() {
    state.replyTo = null;
    updateReplyUI();
  }

  function updateReplyUI(name) {
    var replying = !!state.replyTo;
    var bar = document.getElementById("replying-to");
    var nm = document.getElementById("replying-to-name");
    var ta = document.querySelector("#comment-form textarea");
    var lbl = document.querySelector("#comment-form .lbl");
    if (bar) bar.classList.toggle("hidden", !replying);
    if (nm && replying) nm.textContent = name || "";
    if (ta) ta.placeholder = replying ? "Type your reply here…" : "Type your comment here…";
    if (lbl) lbl.textContent = replying ? "Reply" : "Comment";
  }

  function submitTop(e, form) {
    e.preventDefault();
    var name = form.querySelector('[name="name"]').value.trim() || "anon";
    var text = form.querySelector('[name="text"]').value.trim();
    if (!text) return;
    var btn = form.querySelector('button[type="submit"]');
    postComment({ slug: state.slug, parentId: state.replyTo, name: name, text: text, secret: ownerSecret() }).then(function () {
      morphDone(btn);
      form.reset();
      cancelReply();
      refresh();
    }).catch(function () { needTokenAlert(); });
  }

  function castVote(id, dir) {
    var votes = getVotes();
    var prev = votes[id] || 0;
    if (useWorker()) {
      if (prev === dir) return;
      apiPost("/api/comments/vote", { id: id, dir: dir, prev: prev }).then(function () {
        votes[id] = dir;
        setVotes(votes);
        refresh();
      }).catch(function () {});
      return;
    }
    var token = legacyToken();
    if (!token) return;
    load().then(function (rows) {
      rows = normalize(rows);
      var c = rows.find(function (r) { return r.id === id; });
      if (!c) return;
      if (prev === dir) {
        if (dir === 1) c.up = Math.max(0, c.up - 1); else c.down = Math.max(0, c.down - 1);
        delete votes[id];
      } else {
        if (prev === 1) c.up = Math.max(0, c.up - 1);
        if (prev === -1) c.down = Math.max(0, c.down - 1);
        if (dir === 1) c.up++; else c.down++;
        votes[id] = dir;
      }
      setVotes(votes);
      return legacySave(rows, token).then(refresh);
    }).catch(function () {});
  }

  function removeThread(id) {
    if (!isOwner()) return;
    if (!confirm("Delete this comment and its replies?")) return;
    if (useWorker()) {
      var secret = ownerSecret();
      if (!secret) { alert("Owner secret isn't set on this device."); return; }
      apiPost("/api/comments/delete", { id: id, secret: secret }).then(refresh).catch(function () {
        alert("Delete failed.");
      });
      return;
    }
    var token = legacyToken();
    if (!token) return;
    var kill = {};
    kill[id] = true;
    var changed = true;
    load().then(function (rows) {
      rows = normalize(rows);
      while (changed) {
        changed = false;
        rows.forEach(function (r) {
          if (r.parentId && kill[r.parentId] && !kill[r.id]) { kill[r.id] = true; changed = true; }
        });
      }
      return legacySave(rows.filter(function (r) { return !kill[r.id]; }), token).then(refresh);
    }).catch(function () {});
  }

  function ownFlow() {
    if (location.hash !== "#own") return false;
    claimOwner();
    return true;
  }

  function claimOwner() {
    lsSet("mp-owner", "1");
    if (useWorker() && !ownerSecret()) {
      var s = prompt("Owner secret:");
      if (s) lsSet("mp-owner-secret", s.trim());
    }
  }

  return {
    esc: esc,
    initials: initials,
    avatarHTML: avatarHTML,
    checkSVG: checkSVG,
    claimOwner: claimOwner,
    init: function (slug) {
      state.slug = slug;
      state.replyTo = null;
      state.listEl = document.getElementById("comment-list");
      var form = document.getElementById("comment-form");
      if (form) {
        form.onsubmit = function (e) { submitTop(e, form); };
        updateReplyUI();
      }
      var cancel = document.getElementById("cancel-reply");
      if (cancel) cancel.onclick = function () { cancelReply(); };
      ownFlow();
      refresh();
    }
  };
})();
