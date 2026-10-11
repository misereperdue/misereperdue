/* MISERY forum — threads, replies, categories.
   Backend: same Cloudflare Worker as chat. Shares chat auth token. */
(function () {
  "use strict";

  var API = "https://misery-chat.freeglory416.workers.dev";
  var TOKEN_KEY = "chat_token";

  var root = null;
  var view = { name: "list", category: "", threadId: null };
  var cache = { categories: [], threads: [] };

  function token() {
    try { return localStorage.getItem(TOKEN_KEY); } catch (e) { return null; }
  }

  function api(path, opts) {
    opts = opts || {};
    var headers = { "Content-Type": "application/json" };
    var t = token();
    if (t) headers["Authorization"] = "Bearer " + t;
    return fetch(API + path, {
      method: opts.method || "GET",
      headers: headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined
    }).then(function (r) { return r.json(); });
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function timeAgo(ts) {
    var s = Math.max(1, Math.floor((Date.now() - ts) / 1000));
    if (s < 60) return s + "s";
    var m = Math.floor(s / 60);
    if (m < 60) return m + "m";
    var h = Math.floor(m / 60);
    if (h < 24) return h + "h";
    var d = Math.floor(h / 24);
    if (d < 7) return d + "d";
    return new Date(ts).toLocaleDateString();
  }

  function avatarHTML(author) {
    // author: { author, authorAvatar, hasAvatarImg, avatarV, authorBadge }
    var name = author.author || "?";
    var inner = "";
    if (author.hasAvatarImg) {
      inner = '<img src="' + API + "/api/avatarimg/" +
        encodeURIComponent(name) + "?v=" + (author.avatarV || 0) + '" alt="">';
    } else {
      var e = author.authorAvatar || "\uD83D\uDE00";
      inner = esc(e);
    }
    var cls = author.hasAvatarImg ? "forum-avatar" : "forum-avatar forum-avatar-emoji";
    var badge = badgeFor(author.authorBadge);
    return '<span class="forum-avatar-wrap"><button type="button" class="' + cls + ' forum-avatar-btn" data-username="' + esc(name) + '">' + inner + "</button>" +
      (badge ? '<span class="forum-avatar-badge">' + badge + "</span>" : "") + "</span>";
  }

  function badgeFor(badgeId) {
    if (!badgeId || !window.MPChat || !window.MPChat.badgeHTML) return "";
    // Hide robot badge for non-grim (same rule as chat)
    if (badgeId === "robot") return "";
    return window.MPChat.badgeHTML(badgeId);
  }

  function authorLine(item) {
    var pts = (item.authorPoints !== undefined && item.authorPoints !== null)
      ? ' <span class="forum-glass-pill forum-author-pts">\u2605 ' + item.authorPoints + "</span>" : "";
    return esc(item.author) + pts;
  }

  function wireAvatars() {
    root.querySelectorAll(".forum-avatar-btn").forEach(function (b) {
      b.addEventListener("click", function (e) {
        e.stopPropagation();
        var uname = b.getAttribute("data-username");
        if (uname && window.MPChat && window.MPChat.openUserSheet) {
          window.MPChat.openUserSheet(uname);
        }
      });
    });
    var meBtn = root.querySelector("#forum-me");
    if (meBtn) meBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      var topbar = root.querySelector(".forum-topbar");
      if (window.MPChat && window.MPChat.toggleMeMenu) {
        window.MPChat.toggleMeMenu(topbar);
      } else if (meInfo && window.MPChat && window.MPChat.openUserSheet) {
        window.MPChat.openUserSheet(meInfo.username);
      }
    });
  }

  function memberBadgeHTML() {
    return '<span class="chat-badge chat-badge-member" title="Member" aria-label="Member badge">\u2B50</span>';
  }

  /* ---------- list view ---------- */

  var meInfo = null;

  function forumTopBar() {
    var pts = meInfo ? (meInfo.points || 0) : 0;
    var avHtml = "";
    if (meInfo && window.MPChat && window.MPChat.avatarNode) {
      var node = window.MPChat.avatarNode(meInfo.username, meInfo.avatar, "sm", meInfo.avatarV || 0);
      avHtml = node.outerHTML;
    }
    return '<div class="chat-head forum-topbar">' +
      '<div class="chat-title">Forum</div>' +
      '<div class="chat-head-right">' +
      (token() ? '<button type="button" class="btn accent forum-topbar-new" id="forum-new-top">New thread</button>' : "") +
      '<span class="chat-points" title="Your points"><span class="chat-star" aria-hidden="true">\u2605</span> <span class="chat-points-num" id="forum-points">' + pts + "</span></span>" +
      (token() ? '<button type="button" class="chat-me" id="forum-me" aria-label="Profile">' + avHtml + "</button>" : "") +
      "</div></div>";
  }

  function renderList() {
    var html = '<div class="forum-anim">' + forumTopBar();

    // Category pills
    html += '<div class="forum-cats">';
    html += '<button type="button" class="forum-cat' + (view.category === "" ? " on" : "") + '" data-cat="">All</button>';
    cache.categories.forEach(function (c) {
      html += '<button type="button" class="forum-cat' + (view.category === c.id ? " on" : "") + '" data-cat="' + esc(c.id) + '">' +
        esc(c.name) + (c.membersOnly ? " \u2B50" : "") + "</button>";
    });
    html += "</div>";

    // Threads
    var threads = cache.threads.filter(function (t) {
      return !view.category || t.category === view.category;
    });

    if (!threads.length) {
      html += '<div class="forum-empty">No threads yet. Start one.</div>';
    } else {
      html += '<div class="forum-threads">';
      threads.forEach(function (t) {
        html += '<div class="forum-thread-row">' +
          '<button type="button" class="forum-thread" data-id="' + esc(t.id) + '">' +
          (t.pinned ? '<span class="forum-pin">\uD83D\uDCCC</span>' : "") +
          '<span class="forum-thread-main">' +
          '<span class="forum-thread-title">' + esc(t.title) + "</span>" +
          '<span class="forum-thread-meta">' + authorLine(t) + " \u00B7 " + esc(t.categoryName) +
          (t.membersOnly ? " \u2B50" : "") + " \u00B7 " + timeAgo(t.lastActivity) + "</span>" +
          "</span>" +
          '<span class="forum-thread-count">' + t.replies + "</span>" +
          "</button>";
        if (isOwner) {
          html += '<div class="forum-admin">' +
            '<button type="button" class="forum-admin-btn" data-pin="' + esc(t.id) + '">' + (t.pinned ? "Unpin" : "Pin") + "</button>" +
            '<button type="button" class="forum-admin-btn forum-admin-del" data-del="' + esc(t.id) + '">Delete</button>' +
            "</div>";
        }
        html += "</div>";
      });
      html += "</div>";
    }

    html += "</div>";
    root.innerHTML = html;

    wireAvatars();
    root.querySelectorAll(".forum-cat").forEach(function (b) {
      b.addEventListener("click", function () {
        view.category = b.getAttribute("data-cat");
        renderList();
      });
    });
    root.querySelectorAll(".forum-thread").forEach(function (b) {
      b.addEventListener("click", function () {
        view.name = "thread";
        view.threadId = b.getAttribute("data-id");
        renderThread();
      });
    });
    root.querySelectorAll("[data-pin]").forEach(function (b) {
      b.addEventListener("click", function (e) {
        e.stopPropagation();
        api("/api/forum/thread/" + encodeURIComponent(b.getAttribute("data-pin")) + "/pin", { method: "POST" })
          .then(function (r) { if (r.ok) render(); });
      });
    });
    root.querySelectorAll("[data-del]").forEach(function (b) {
      b.addEventListener("click", function (e) {
        e.stopPropagation();
        if (!confirm("Delete this thread and all its replies?")) return;
        api("/api/forum/thread/" + encodeURIComponent(b.getAttribute("data-del")), { method: "DELETE" })
          .then(function (r) { if (r.ok) { view.name = "list"; view.threadId = null; render(); } });
      });
    });
    var nbTop = root.querySelector("#forum-new-top");
    if (nbTop) nbTop.addEventListener("click", function () {
      view.name = "new";
      renderNew();
    });
  }

  /* ---------- thread view ---------- */

  function renderThread() {
    root.innerHTML = '<div class="forum-loading">Loading\u2026</div>';
    api("/api/forum/thread/" + encodeURIComponent(view.threadId)).then(function (res) {
      if (!res.ok || !res.thread) {
        root.innerHTML = '<div class="forum-empty">Thread not found.</div>';
        return;
      }
      if (res.locked) {
        root.innerHTML = '<div class="forum-anim">' + forumTopBar() + '<div class="forum-head">' +
          '<button type="button" class="forum-back" id="forum-back">\u2190 Back</button></div>' +
          '<div class="forum-locked"><div class="forum-locked-icon">\u2B50</div>' +
          '<div class="forum-locked-title">' + esc(res.thread.title) + "</div>" +
          '<div class="forum-locked-sub">Members only. Become a member to read this thread.</div></div></div>';
        wireAvatars();
        root.querySelector("#forum-back").addEventListener("click", backToList);
        return;
      }
      var t = res.thread;
      var html = forumTopBar() +
        '<div class="forum-head">' +
        '<button type="button" class="forum-back forum-glass-pill" id="forum-back">\u2190 Back</button></div>';

      html += '<article class="forum-post forum-op">' +
        '<div class="forum-post-head">' + avatarHTML(t) +
        '<span class="forum-post-author">' + authorLine(t) + "</span>" +
        '<span class="forum-post-time">' + timeAgo(t.createdAt) + "</span></div>" +
        '<h3 class="forum-post-title">' + esc(t.title) + "</h3>" +
        '<div class="forum-post-body">' + esc(t.content).replace(/\n/g, "<br>") + "</div>" +
        (isOwner ? '<div class="forum-admin forum-admin-thread"><button type="button" class="forum-admin-btn" data-pin="' + esc(t.id) + '">' + (t.pinned ? "Unpin" : "Pin") + '</button><button type="button" class="forum-admin-btn forum-admin-del" data-del="' + esc(t.id) + '">Delete thread</button></div>' : "") + "</article>";

      html += '<div class="forum-replies">';
      (t.replies || []).forEach(function (r) {
        html += '<article class="forum-post">' +
          '<div class="forum-post-head">' + avatarHTML(r) +
          '<span class="forum-post-author">' + authorLine(r) + "</span>" +
          '<span class="forum-post-time">' + timeAgo(r.createdAt) + "</span>" +
          (isOwner ? '<button type="button" class="forum-admin-btn forum-admin-del" data-delreply="' + esc(r.id) + '">Delete</button>' : "") + "</div>" +
          '<div class="forum-post-body">' + esc(r.content).replace(/\n/g, "<br>") + "</div></article>";
      });
      html += "</div>";

      if (token()) {
        html += '<div class="forum-replybox">' +
          '<textarea id="forum-reply" rows="3" maxlength="5000" placeholder="Write a reply\u2026"></textarea>' +
          '<button type="button" class="btn accent" id="forum-send">Reply</button></div>';
      } else {
        html += '<div class="forum-signin">Sign in to join the discussion.</div>';
      }

      root.innerHTML = '<div class="forum-anim">' + html + "</div>";
      wireAvatars();
      root.querySelector("#forum-back").addEventListener("click", backToList);
      root.querySelectorAll("[data-delreply]").forEach(function (b) {
        b.addEventListener("click", function () {
          if (!confirm("Delete this reply?")) return;
          api("/api/forum/thread/" + encodeURIComponent(view.threadId) + "/replies/" + encodeURIComponent(b.getAttribute("data-delreply")), { method: "DELETE" })
            .then(function (r) { if (r.ok) renderThread(); });
        });
      });
      root.querySelectorAll("[data-pin]").forEach(function (b) {
        b.addEventListener("click", function () {
          api("/api/forum/thread/" + encodeURIComponent(b.getAttribute("data-pin")) + "/pin", { method: "POST" })
            .then(function (r) { if (r.ok) renderThread(); });
        });
      });
      root.querySelectorAll("[data-del]").forEach(function (b) {
        b.addEventListener("click", function () {
          if (!confirm("Delete this thread and all its replies?")) return;
          api("/api/forum/thread/" + encodeURIComponent(b.getAttribute("data-del")), { method: "DELETE" })
            .then(function (r) { if (r.ok) backToList(); });
        });
      });

      var send = root.querySelector("#forum-send");
      if (send) send.addEventListener("click", function () {
        var ta = root.querySelector("#forum-reply");
        var content = ta.value.trim();
        if (!content) return;
        send.disabled = true;
        api("/api/forum/thread/" + encodeURIComponent(view.threadId) + "/replies", {
          method: "POST", body: { content: content }
        }).then(function (r2) {
          if (r2.ok) renderThread();
          else { send.disabled = false; alert(r2.error || "Failed"); }
        });
      });
    });
  }

  function backToList() {
    view.name = "list";
    view.threadId = null;
    render();
  }

  /* ---------- new thread ---------- */

  function renderNew() {
    var html = '<div class="forum-head">' +
      '<button type="button" class="forum-back" id="forum-back">\u2190 Back</button>' +
      '<h2 class="forum-title">New thread</h2></div>';

    html += '<div class="forum-form">' +
      '<label class="chat-field"><span>Category</span><select id="forum-cat-sel">';
    cache.categories.forEach(function (c) {
      html += '<option value="' + esc(c.id) + '"' + (view.category === c.id ? " selected" : "") + ">" +
        esc(c.name) + (c.membersOnly ? " \u2B50" : "") + "</option>";
    });
    html += "</select></label>" +
      '<label class="chat-field"><span>Title</span>' +
      '<input type="text" id="forum-title" maxlength="120" placeholder="What\u2019s this about?"></label>' +
      '<label class="chat-field"><span>Content</span>' +
      '<textarea id="forum-content" rows="6" maxlength="5000" placeholder="Say it\u2026"></textarea></label>' +
      '<button type="button" class="btn accent" id="forum-post">Post thread</button></div>';

    root.innerHTML = html;
    root.querySelector("#forum-back").addEventListener("click", backToList);
    root.querySelector("#forum-post").addEventListener("click", function () {
      var title = root.querySelector("#forum-title").value.trim();
      var content = root.querySelector("#forum-content").value.trim();
      var cat = root.querySelector("#forum-cat-sel").value;
      if (!title || !content) { alert("Title and content required"); return; }
      api("/api/forum/threads", {
        method: "POST", body: { title: title, content: content, category: cat }
      }).then(function (res) {
        if (res.ok && res.thread) {
          view.name = "thread";
          view.threadId = res.thread.id;
          renderThread();
        } else {
          alert(res.error || "Failed");
        }
      });
    });
  }

  /* ---------- entry ---------- */

  var isOwner = false;

  function render() {
    root = document.getElementById("forum-root");
    if (!root) return;
    // Check owner status + user info
    if (token()) {
      api("/api/me").then(function (r) {
        if (r && r.user) {
          meInfo = r.user;
          isOwner = !!r.user.owner;
          var pn = document.getElementById("forum-points");
          if (pn) pn.textContent = meInfo.points || 0;
          // Fill in avatar in place (no re-render, no animation replay)
          var meBtn = root && root.querySelector("#forum-me");
          if (meBtn && !meBtn.innerHTML.trim() && window.MPChat && window.MPChat.avatarNode) {
            var node = window.MPChat.avatarNode(meInfo.username, meInfo.avatar, "sm", meInfo.avatarV || 0);
            meBtn.innerHTML = node.outerHTML;
          }
        }
      }).catch(function () {});
    }
    api("/api/forum/categories").then(function (res) {
      cache.categories = (res.ok && res.categories) || [];
      return api("/api/forum/threads");
    }).then(function (res) {
      cache.threads = (res.ok && res.threads) || [];
      if (view.name === "thread" && view.threadId) renderThread();
      else if (view.name === "new") renderNew();
      else renderList();
    }).catch(function () {
      root.innerHTML = '<div class="forum-empty">Couldn\u2019t load the forum.</div>';
    });
  }

  window.MPForum = { render: render };
})();
