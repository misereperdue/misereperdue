/* MISERY forum — threads, replies, categories.
   Backend: same Cloudflare Worker as chat. Shares chat auth token. */
(function () {
  "use strict";

  var API = "https://misery-chat.freeglory416.workers.dev";
  var TOKEN_KEY = "chat_token";

  var root = null;
  var view = { name: "list", category: "", threadId: null, replyTo: null, showNested: {} };
  var cache = { categories: [], threads: [], thread: null };

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

  function starBtn(item, replyId) {
    var count = item.stars || 0;
    var mine = meInfo && item.author && meInfo.username.toLowerCase() === String(item.author).toLowerCase();
    if (mine) return '<span class="forum-star-count">\u2605 ' + count + "</span>";
    if (!token()) return count > 0 ? '<span class="forum-star-count">\u2605 ' + count + "</span>" : "";
    var given = meInfo && Array.isArray(item.starredBy) && item.starredBy.indexOf(meInfo.username.toLowerCase()) !== -1;
    return '<button type="button" class="forum-admin-btn forum-star-btn' + (given ? " given" : "") + '" data-star="' + (replyId || "") + '"' + (given ? " disabled" : "") + '>\u2605 ' + count + "</button>";
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

  /* ---------- rich text ---------- */

  var RICH_ALLOWED = { P: 1, BR: 1, STRONG: 1, B: 1, EM: 1, I: 1, S: 1, STRIKE: 1, CODE: 1, PRE: 1, UL: 1, OL: 1, LI: 1, BLOCKQUOTE: 1, A: 1, H3: 1, H4: 1 };
  function sanitizeHTML(html) {
    try {
      var doc = new DOMParser().parseFromString(String(html || ""), "text/html");
      (function walk(node) {
        var kids = Array.prototype.slice.call(node.childNodes);
        kids.forEach(function (child) {
          if (child.nodeType === 3) return;
          if (child.nodeType !== 1) { child.remove(); return; }
          if (!RICH_ALLOWED[child.tagName]) {
            walk(child);
            while (child.firstChild) node.insertBefore(child.firstChild, child);
            child.remove();
            return;
          }
          Array.prototype.slice.call(child.attributes).forEach(function (a) { child.removeAttribute(a.name); });
          walk(child);
        });
      })(doc.body);
      return doc.body.innerHTML;
    } catch (e) { return ""; }
  }
  function bodyHTML(item) {
    if (item.rich) return sanitizeHTML(item.content);
    return esc(item.content || "").replace(/\n/g, "<br>");
  }

  var replyEditor = null;
  var newEditor = null;
  var editorLibPromise = null;
  function loadEditorLib() {
    if (!editorLibPromise) {
      editorLibPromise = Promise.all([
        import("https://cdn.jsdelivr.net/npm/@tiptap/core@2/+esm"),
        import("https://cdn.jsdelivr.net/npm/@tiptap/starter-kit@2/+esm"),
        import("https://cdn.jsdelivr.net/npm/@tiptap/extension-placeholder@2/+esm")
      ]).then(function (mods) {
        return { Editor: mods[0].Editor, StarterKit: mods[1].default, Placeholder: mods[2].default };
      }).catch(function () { return null; });
    }
    return editorLibPromise;
  }

  var TOOLBAR = [
    { act: "bold", label: "B", cls: "tb-bold" },
    { act: "italic", label: "I", cls: "tb-italic" },
    { act: "strike", label: "S", cls: "tb-strike" },
    { act: "code", label: "<>", cls: "tb-code" },
    { act: "h3", label: "H", cls: "" },
    { act: "bullet", label: "\u2022\u2261", cls: "" },
    { act: "ordered", label: "1.\u2261", cls: "" },
    { act: "quote", label: "\u201D", cls: "" }
  ];
  function toolbarHTML() {
    var h = '<div class="forum-toolbar">';
    TOOLBAR.forEach(function (b) {
      h += '<button type="button" class="forum-tb ' + b.cls + '" data-act="' + b.act + '">' + b.label + "</button>";
    });
    return h + "</div>";
  }
  function refreshToolbar(editor, bar) {
    if (!editor || !bar) return;
    var map = { bold: "bold", italic: "italic", strike: "strike", code: "code", bullet: "bulletList", ordered: "orderedList", quote: "blockquote" };
    bar.querySelectorAll("[data-act]").forEach(function (btn) {
      var act = btn.getAttribute("data-act");
      var on = false;
      try {
        if (act === "h3") on = editor.isActive("heading", { level: 3 });
        else if (map[act]) on = editor.isActive(map[act]);
      } catch (e) {}
      btn.classList.toggle("on", !!on);
    });
  }
  function wireToolbar(editor, mountEl) {
    var bar = mountEl.querySelector(".forum-toolbar");
    if (!bar || !editor) return;
    bar.querySelectorAll("[data-act]").forEach(function (btn) {
      btn.addEventListener("mousedown", function (e) { e.preventDefault(); });
      btn.addEventListener("click", function () {
        var act = btn.getAttribute("data-act");
        var ch = editor.chain().focus();
        if (act === "bold") ch.toggleBold().run();
        else if (act === "italic") ch.toggleItalic().run();
        else if (act === "strike") ch.toggleStrike().run();
        else if (act === "code") ch.toggleCode().run();
        else if (act === "h3") ch.toggleHeading({ level: 3 }).run();
        else if (act === "bullet") ch.toggleBulletList().run();
        else if (act === "ordered") ch.toggleOrderedList().run();
        else if (act === "quote") ch.toggleBlockquote().run();
        refreshToolbar(editor, bar);
      });
    });
    editor.on("selectionUpdate", function () { refreshToolbar(editor, bar); });
    editor.on("update", function () { refreshToolbar(editor, bar); });
  }
  function createEditor(mount, placeholder) {
    return loadEditorLib().then(function (lib) {
      if (!lib) return null;
      var editor = new lib.Editor({
        element: mount.querySelector(".forum-editor-mount"),
        extensions: [
          lib.StarterKit.configure({ heading: { levels: [3] } }),
          lib.Placeholder.configure({ placeholder: placeholder })
        ],
        content: "",
        editorProps: { attributes: { class: "forum-editor-input" } }
      });
      wireToolbar(editor, mount);
      return editor;
    });
  }

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
      (token() ? (view.name === "thread"
        ? '<button type="button" class="btn accent forum-topbar-new" id="forum-reply-top">New reply</button>'
        : '<button type="button" class="btn accent forum-topbar-new" id="forum-new-top">New thread</button>') : "") +
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
      cache.thread = res.thread;
      paintThread();
    });
  }

  function paintThread() {
    var t = cache.thread;
    if (!t) return;
    var html = forumTopBar() +
        '<div class="forum-head">' +
        '<button type="button" class="forum-back forum-glass-pill" id="forum-back">\u2190 Back</button></div>';

      html += '<article class="forum-post forum-op">' +
        '<div class="forum-post-head">' + avatarHTML(t) +
        '<span class="forum-post-author">' + authorLine(t) + "</span>" +
        '<span class="forum-post-time">' + timeAgo(t.createdAt) + "</span></div>" +
        '<h3 class="forum-post-title">' + esc(t.title) + "</h3>" +
        '<div class="forum-post-body">' + bodyHTML(t) + "</div>" +
        ((token() || isOwner) ? '<div class="forum-admin forum-admin-thread">' + starBtn(t, null) +
          (isOwner ? '<button type="button" class="forum-admin-btn" data-pin="' + esc(t.id) + '">' + (t.pinned ? "Unpin" : "Pin") + '</button><button type="button" class="forum-admin-btn forum-admin-del" data-del="' + esc(t.id) + '">Delete thread</button>' : "") + "</div>" : "") + "</article>";

      html += '<div class="forum-replies">';
      var allReplies = t.replies || [];
      var topReplies = allReplies.filter(function (r) { return !r.parentId; });
      var childMap = {};
      allReplies.forEach(function (r) {
        if (r.parentId) {
          (childMap[r.parentId] = childMap[r.parentId] || []).push(r);
        }
      });
      function replyHTML(r, depth) {
        var kids = childMap[r.id] || [];
        var expanded = !!view.showNested[r.id];
        var h = '<article class="forum-post' + (depth > 0 ? " forum-nested" : "") + '">' +
          '<div class="forum-post-head">' + avatarHTML(r) +
          '<span class="forum-post-author">' + authorLine(r) + "</span>" +
          '<span class="forum-post-time">' + timeAgo(r.createdAt) + "</span></div>" +
          '<div class="forum-post-body">' + bodyHTML(r) + "</div>" +
          ((token() || isOwner)
            ? '<div class="forum-admin forum-admin-thread forum-reply-actions">' +
              (token() ? '<button type="button" class="forum-admin-btn" data-replyto="' + esc(r.id) + '" data-replyname="' + esc(r.author) + '">Reply</button>' : "") +
              starBtn(r, r.id) +
              (isOwner ? '<button type="button" class="forum-admin-btn forum-admin-del" data-delreply="' + esc(r.id) + '">Delete</button>' : "") +
              "</div>"
            : "");
        h += "</article>";
        if (kids.length) {
          var visibleKids = expanded ? kids : kids.slice(0, 1);
          h += '<div class="forum-thread-tail"><div class="forum-children">';
          visibleKids.forEach(function (k) { h += replyHTML(k, depth + 1); });
          h += "</div>";
          if (!expanded && kids.length > 1) {
            h += '<button type="button" class="forum-show-replies" data-showreplies="' + esc(r.id) + '">Show more replies (' + (kids.length - 1) + " more)</button>";
          } else if (expanded) {
            h += '<button type="button" class="forum-show-replies" data-hidereplies="' + esc(r.id) + '">Hide replies</button>';
          }
          h += "</div>";
        }
        return h;
      }
      topReplies.forEach(function (r) { html += replyHTML(r, 0); });
      html += "</div>";

      if (token()) {
        var rtName = view.replyTo ? view.replyTo.name : null;
        html += '<div class="forum-replybox">' +
          (rtName ? '<div class="forum-replying-to">Replying to <b>' + esc(rtName) + '</b><button type="button" id="forum-cancel-reply" aria-label="Cancel reply">\u00D7</button></div>' : "") +
          '<div class="forum-editor" id="forum-reply-editor">' + toolbarHTML() + '<div class="forum-editor-mount"></div></div>' +
          '<button type="button" class="btn accent" id="forum-send">Reply</button></div>';
      } else {
        html += '<div class="forum-signin">Sign in to join the discussion.</div>';
      }

      root.innerHTML = '<div class="forum-anim">' + html + "</div>";
      wireAvatars();
      root.querySelector("#forum-back").addEventListener("click", backToList);
      initReplyEditor();
      function focusComposer() {
        var box = root.querySelector(".forum-replybox");
        if (box) box.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(function () {
          if (replyEditor) replyEditor.commands.focus();
          else {
            var ta = root.querySelector("#forum-reply");
            if (ta) ta.focus();
          }
        }, 350);
      }
      var replyTop = root.querySelector("#forum-reply-top");
      if (replyTop) replyTop.addEventListener("click", focusComposer);
      root.querySelectorAll("[data-replyto]").forEach(function (b) {
        b.addEventListener("click", function () {
          view.replyTo = { id: b.getAttribute("data-replyto"), name: b.getAttribute("data-replyname") };
          // Update composer in place, then glide to it
          var box = root.querySelector(".forum-replybox");
          if (box) {
            var ind = box.querySelector(".forum-replying-to");
            if (!ind) {
              ind = document.createElement("div");
              ind.className = "forum-replying-to";
              box.insertBefore(ind, box.firstChild);
            }
            ind.innerHTML = "Replying to <b>" + esc(view.replyTo.name) + '</b><button type="button" id="forum-cancel-reply" aria-label="Cancel reply">\u00D7</button>';
            ind.querySelector("#forum-cancel-reply").addEventListener("click", cancelReplyTo);
            focusComposer();
          }
        });
      });
      function cancelReplyTo() {
        view.replyTo = null;
        var box = root.querySelector(".forum-replybox");
        if (box) {
          var ind = box.querySelector(".forum-replying-to");
          if (ind) ind.remove();
        }
      }
      root.querySelectorAll("[data-showreplies]").forEach(function (b) {
        b.addEventListener("click", function () {
          var id = b.getAttribute("data-showreplies");
          b.innerHTML = '<span class="forum-spinner"></span>';
          b.disabled = true;
          setTimeout(function () {
            view.showNested[id] = true;
            renderThreadInPlace();
          }, 350);
        });
      });
      root.querySelectorAll("[data-hidereplies]").forEach(function (b) {
        b.addEventListener("click", function () {
          view.showNested[b.getAttribute("data-hidereplies")] = false;
          renderThreadInPlace();
        });
      });
      var cancelBtn = root.querySelector("#forum-cancel-reply");
      if (cancelBtn) cancelBtn.addEventListener("click", cancelReplyTo);
      root.querySelectorAll("[data-star]").forEach(function (b) {
        b.addEventListener("click", function () {
          if (b.disabled) return;
          b.disabled = true;
          var replyId = b.getAttribute("data-star") || null;
          api("/api/forum/thread/" + encodeURIComponent(view.threadId) + "/star", {
            method: "POST", body: { replyId: replyId }
          }).then(function (r) {
            if (r.ok) {
              b.classList.add("given");
              b.innerHTML = "\u2605 " + r.stars;
              if (meInfo) meInfo.points = r.myPoints;
              var pn = document.getElementById("forum-points");
              if (pn) pn.textContent = r.myPoints;
              // Keep cache in sync for in-place re-renders
              if (cache.thread) {
                var tgt = replyId ? (cache.thread.replies || []).find(function (x) { return x.id === replyId; }) : cache.thread;
                if (tgt) {
                  tgt.stars = r.stars;
                  tgt.authorPoints = r.authorPoints;
                  if (!Array.isArray(tgt.starredBy)) tgt.starredBy = [];
                  if (meInfo) tgt.starredBy.push(meInfo.username.toLowerCase());
                }
              }
            } else {
              b.disabled = false;
              alert(r.error || "Couldn't give a star");
            }
          }).catch(function () { b.disabled = false; });
        });
      });
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
        var content = "", rich = false;
        if (replyEditor) {
          if (replyEditor.isEmpty) return;
          content = replyEditor.getHTML();
          rich = true;
        } else {
          var ta = root.querySelector("#forum-reply");
          content = ta ? ta.value.trim() : "";
          if (!content) return;
        }
        send.disabled = true;
        var payload = { content: content, rich: rich };
        if (view.replyTo) payload.parentId = view.replyTo.id;
        api("/api/forum/thread/" + encodeURIComponent(view.threadId) + "/replies", {
          method: "POST", body: payload
        }).then(function (r2) {
          if (r2.ok) {
            // Expand parent so the new reply is visible
            if (view.replyTo) view.showNested[view.replyTo.id] = true;
            view.replyTo = null;
            renderThread();
          }
          else { send.disabled = false; alert(r2.error || "Failed"); }
        });
      });
  }

  function initReplyEditor() {
    var mount = root.querySelector("#forum-reply-editor");
    if (!mount) { replyEditor = null; return; }
    if (replyEditor) { try { replyEditor.destroy(); } catch (e) {} replyEditor = null; }
    createEditor(mount, "Write a reply\u2026").then(function (ed) {
      if (ed) { replyEditor = ed; return; }
      // Fallback: plain textarea if the editor library fails to load
      var wrap = document.createElement("div");
      wrap.innerHTML = '<textarea id="forum-reply" rows="3" maxlength="5000" placeholder="Write a reply\u2026"></textarea>';
      mount.replaceWith(wrap.firstChild);
    });
  }

  function renderThreadInPlace() {
    var y = window.scrollY;
    paintThread();
    window.scrollTo(0, y);
  }

  function backToList() {
    view.name = "list";
    view.threadId = null;
    view.replyTo = null;
    view.showNested = {};
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
      '<label class="chat-field"><span>Content</span></label>' +
      '<div class="forum-editor" id="forum-new-editor">' + toolbarHTML() + '<div class="forum-editor-mount"></div></div>' +
      '<button type="button" class="btn accent" id="forum-post">Post thread</button></div>';

    root.innerHTML = html;
    root.querySelector("#forum-back").addEventListener("click", backToList);
    var newMount = root.querySelector("#forum-new-editor");
    if (newMount) {
      if (newEditor) { try { newEditor.destroy(); } catch (e) {} newEditor = null; }
      createEditor(newMount, "Say it\u2026").then(function (ed) {
        if (ed) { newEditor = ed; return; }
        var wrap = document.createElement("div");
        wrap.innerHTML = '<textarea id="forum-content" rows="6" maxlength="5000" placeholder="Say it\u2026"></textarea>';
        newMount.replaceWith(wrap.firstChild);
      });
    }
    root.querySelector("#forum-post").addEventListener("click", function () {
      var title = root.querySelector("#forum-title").value.trim();
      var content = "", rich = false;
      if (newEditor) {
        if (!newEditor.isEmpty) { content = newEditor.getHTML(); rich = true; }
      } else {
        var cta = root.querySelector("#forum-content");
        content = cta ? cta.value.trim() : "";
      }
      var cat = root.querySelector("#forum-cat-sel").value;
      if (!title || !content) { alert("Title and content required"); return; }
      api("/api/forum/threads", {
        method: "POST", body: { title: title, content: content, category: cat, rich: rich }
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
