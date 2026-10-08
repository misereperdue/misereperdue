/* MISERY comments — global via the repo's comments.json, owner-only delete.
 *
 * How it works:
 * - Everyone READS comments from comments.json (public, no auth needed).
 * - Posting / replying / voting WRITES through the GitHub Contents API using
 *   PUBLIC_TOKEN below: a fine-grained personal access token scoped to ONLY
 *   this repo with Contents read+write. It lives in this file so every
 *   visitor can post. Anyone can read it from page source, so treat it as
 *   disposable: if abused, revoke it and make a new one. Never reuse a token
 *   that can touch other repos.
 * - DELETING always uses the private token in this device's localStorage
 *   ("mp-token") and only renders the Delete button when "mp-owner" is set
 *   (visit https://misereperdue.com/#own once on your device).
 */
var MPComments = (function () {
  "use strict";

  var REPO = "misereperdue/misereperdue";
  var FILE = "comments.json";
  var API = "https://api.github.com/repos/" + REPO + "/contents/" + FILE;

  /* dc: paste the fine-grained token here via github.com (Settings > Developer
     settings > Personal access tokens > Fine-grained). Repo: misereperdue/
     misereperdue, permission: Contents read and write. Nothing else. */
  var PUBLIC_TOKEN = "";

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function publicToken() {
    try { return PUBLIC_TOKEN || localStorage.getItem("mp-token") || ""; }
    catch (e) { return PUBLIC_TOKEN || ""; }
  }
  function ownerToken() {
    try { return localStorage.getItem("mp-token") || ""; } catch (e) { return ""; }
  }
  function isOwner() {
    try { return localStorage.getItem("mp-owner") === "1"; } catch (e) { return false; }
  }
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

  function load() {
    return fetch(FILE + "?t=" + Date.now())
      .then(function (r) { return r.json(); })
      .catch(function () { return []; });
  }
  function save(rows, token) {
    token = token || publicToken();
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
        down: Math.max(0, +c.down || 0)
      };
    }).filter(function (c) { return c.id && c.text; });
  }

  var state = { rows: [], slug: "", listEl: null };

  function score(c) { return c.up - c.down; }

  function commentHTML(c, depth) {
    var votes = getVotes();
    var mine = votes[c.id] || 0;
    var kids = state.rows
      .filter(function (r) { return r.parentId === c.id; })
      .sort(function (a, b) { return a.createdAt - b.createdAt; });
    var kidsHTML = kids.map(function (k) { return commentHTML(k, depth + 1); }).join("");
    return (
      '<div class="comment" data-id="' + esc(c.id) + '">' +
        '<div class="comment-main">' + avatarHTML(c.name) +
          '<div class="comment-body">' +
            '<div class="comment-head"><strong>' + esc(c.name) + '</strong>' +
            '<span class="meta"> · ' + esc(timeAgo(c.createdAt)) + "</span></div>" +
            "<p>" + esc(c.text) + "</p>" +
            '<div class="comment-actions">' +
              '<button type="button" class="vote' + (mine === 1 ? " on" : "") + '" data-vote="1" data-id="' + esc(c.id) + '" aria-label="Upvote">' +
                '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 5l7 10H5z"/></svg>' +
                "<span>" + score(c) + "</span></button>" +
              '<button type="button" class="vote' + (mine === -1 ? " on" : "") + '" data-vote="-1" data-id="' + esc(c.id) + '" aria-label="Downvote">' +
                '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 19l-7-10h14z"/></svg></button>' +
              '<button type="button" class="reply-link" data-reply="' + esc(c.id) + '">Reply</button>' +
              (isOwner() ? '<button type="button" class="del" data-del="' + esc(c.id) + '">Delete</button>' : "") +
            "</div>" +
            '<div class="reply-form hidden" id="reply-' + esc(c.id) + '">' +
              '<input name="name" placeholder="Name" required maxlength="40">' +
              '<textarea name="text" placeholder="Type your reply here…" required maxlength="2000"></textarea>' +
              '<button class="btn morph-btn" type="submit"><span class="lbl">Reply</span>' + checkSVG() + "</button>" +
            "</div>" +
            (kidsHTML ? '<div class="replies">' + kidsHTML + "</div>" : "") +
          "</div>" +
        "</div>" +
      "</div>"
    );
  }

  function checkSVG() {
    return '<svg class="check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.5 12.5l5 5 10-11"/></svg>';
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
      b.onclick = function () {
        var f = document.getElementById("reply-" + b.dataset.reply);
        if (f) { f.classList.toggle("hidden"); var t = f.querySelector("textarea"); if (t && !f.classList.contains("hidden")) t.focus(); }
      };
    });
    root.querySelectorAll(".reply-form").forEach(function (f) {
      f.onsubmit = function (e) { submitReply(e, f); };
    });
    root.querySelectorAll("[data-del]").forEach(function (b) {
      b.onclick = function () { removeThread(b.dataset.del); };
    });
  }

  function morphDone(btn, doneLabel) {
    btn.classList.add("done");
    setTimeout(function () {
      btn.classList.remove("done");
      if (doneLabel) { var l = btn.querySelector(".lbl"); if (l) l.textContent = doneLabel; }
    }, 1600);
  }

  function submitReply(e, form) {
    e.preventDefault();
    var id = form.id.replace("reply-", "");
    var name = form.querySelector('[name="name"]').value.trim() || "anon";
    var text = form.querySelector('[name="text"]').value.trim();
    if (!text) return;
    var btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    load().then(function (rows) {
      rows = normalize(rows);
      rows.push({
        id: String(Date.now()) + Math.floor(Math.random() * 1e4),
        slug: state.slug,
        parentId: id,
        name: name,
        text: text,
        createdAt: Date.now(),
        up: 0,
        down: 0
      });
      return save(rows).then(function () {
        state.rows = rows;
        morphDone(btn);
        form.reset();
        form.classList.add("hidden");
        drawList();
      });
    }).catch(function () {
      btn.disabled = false;
      alert("Couldn't post that — the comment token isn't set yet.");
    });
  }

  function castVote(id, dir) {
    var votes = getVotes();
    var prev = votes[id] || 0;
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
      return save(rows).then(function () { state.rows = rows; drawList(); });
    }).catch(function () {});
  }

  function removeThread(id) {
    var token = ownerToken();
    if (!isOwner() || !token) { alert("Deleting is only available on the owner's device."); return; }
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
      var kept = rows.filter(function (r) { return !kill[r.id]; });
      return save(kept, token).then(function () { state.rows = kept; drawList(); });
    }).catch(function () {});
  }

  function submitTop(e, form) {
    e.preventDefault();
    var name = form.querySelector('[name="name"]').value.trim() || "anon";
    var text = form.querySelector('[name="text"]').value.trim();
    if (!text) return;
    var btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    load().then(function (rows) {
      rows = normalize(rows);
      rows.push({
        id: String(Date.now()) + Math.floor(Math.random() * 1e4),
        slug: state.slug,
        parentId: null,
        name: name,
        text: text,
        createdAt: Date.now(),
        up: 0,
        down: 0
      });
      return save(rows).then(function () {
        state.rows = rows;
        morphDone(btn);
        form.reset();
        drawList();
      });
    }).catch(function () {
      btn.disabled = false;
      alert("Couldn't post that — the comment token isn't set yet.");
    }).finally(function () {
      setTimeout(function () { btn.disabled = false; }, 1700);
    });
  }

  return {
    esc: esc,
    initials: initials,
    avatarHTML: avatarHTML,
    checkSVG: checkSVG,
    init: function (slug) {
      state.slug = slug;
      state.listEl = document.getElementById("comment-list");
      var form = document.getElementById("comment-form");
      if (form) form.onsubmit = function (e) { submitTop(e, form); };
      if (location.hash === "#own") {
        try { localStorage.setItem("mp-owner", "1"); } catch (e) {}
      }
      load().then(function (rows) {
        state.rows = normalize(rows);
        drawList();
      });
    }
  };
})();
