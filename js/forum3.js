/* MISERY forum — threads, replies, categories.
   Backend: same Cloudflare Worker as chat. Shares chat auth token. */
(function () {
  "use strict";

  var API = "https://misery-chat.freeglory416.workers.dev";
  var TOKEN_KEY = "chat_token";

  var root = null;
  var view = { name: "list", category: "", tag: "", threadId: null, replyTo: null, showNested: {} };
  var tagExpand = {};
  var allTagsCache = null;
  function normTagClient(s) {
    return String(s || "").trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 12);
  }
  function tagsPillsHTML(t, limit) {
    var tags = t.tags || [];
    if (!tags.length) return "";
    var expanded = !!tagExpand[t.id];
    var show = expanded ? tags : tags.slice(0, limit);
    var out = show.map(function (tag) {
      return '<button type="button" class="forum-tag" data-tag="' + esc(tag) + '">#' + esc(tag) + "</button>";
    }).join("");
    if (!expanded && tags.length > limit) {
      out += '<button type="button" class="forum-tag forum-tag-more" data-tagmore="' + esc(t.id) + '">+' + (tags.length - limit) + "</button>";
    }
    return out;
  }
  function filterByTag(tag) {
    view.tag = tag;
    view.category = "";
    view.name = "list";
    view.threadId = null;
    paintedThreadId = null;
    renderList();
    refreshThreads();
    if (window.MPScroll) MPScroll.pinTop(1200);
  }
  var paintedThreadId = null;
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

  function avatarHTMLSmall(author) {
    var name = author.author || "?";
    var inner = "";
    if (author.hasAvatarImg) {
      inner = '<img src="' + API + "/api/avatarimg/" +
        encodeURIComponent(name) + "?v=" + (author.avatarV || 0) + '" alt="">';
    } else {
      inner = esc(author.authorAvatar || "\uD83D\uDE00");
    }
    var badge = badgeFor(author.authorBadge);
    return '<span class="forum-avatar-wrap forum-avatar-sm"><span class="forum-avatar' + (author.hasAvatarImg ? "" : " forum-avatar-emoji") + '">' + inner + "</span>" +
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

  function wireBell() {
    updateBellBadge();
    var bell = document.getElementById("forum-bell");
    if (bell && !bell._wired) {
      bell._wired = true;
      bell.addEventListener("click", function (e) { e.stopPropagation(); showNotifications(); });
    }
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
    return '<span class="chat-badge chat-badge-member" title="VIP" aria-label="VIP badge">\u2B50</span>';
  }

  /* ---------- list view ---------- */

  var meInfo = null;

  /* ---------- rich text ---------- */

  var RICH_ALLOWED = { P: 1, BR: 1, STRONG: 1, B: 1, EM: 1, I: 1, S: 1, STRIKE: 1, CODE: 1, PRE: 1, UL: 1, OL: 1, LI: 1, BLOCKQUOTE: 1, A: 1, H3: 1, H4: 1, IMG: 1 , IFRAME: 1, DIV: 1, SPAN: 1, SVG: 1, PATH: 1 };
  function sanitizeHTML(html) {
    try {
      var doc = new DOMParser().parseFromString(String(html || ""), "text/html");
      (function walk(node) {
        var kids = Array.prototype.slice.call(node.childNodes);
        kids.forEach(function (child) {
          if (child.nodeType === 3) return;
          if (child.nodeType !== 1) { child.remove(); return; }
          var tn = (child.tagName || "").toUpperCase();
          if (!RICH_ALLOWED[tn]) {
            walk(child);
            while (child.firstChild) node.insertBefore(child.firstChild, child);
            child.remove();
            return;
          }
          var keepHref = null, keepSrc = null, keepFrame = null, keepPath = null, keepLock = null;
          if (tn === "DIV") {
            var dcls = (child.getAttribute("class") || "").split(/\s+/);
            // Preserve file rows entirely (generated by uploader, safe)
            // Skip ALL sanitization for this subtree - keep as-is
            if (dcls.indexOf("mp-file") !== -1) {
              return;
            }
            if (dcls.indexOf("mp-locked") !== -1) {
              var lm = child.getAttribute("data-mode");
              if (lm === "reply" || lm === "member") {
                keepLock = { mode: lm };
                var la = child.getAttribute("data-author") || "";
                if (/^[A-Za-z0-9_]{3,16}$/.test(la)) keepLock.author = la;
              }
            }
          }
          if (tn === "A") {
            var href = child.getAttribute("href") || "";
            if (/^https?:\/\//i.test(href)) keepHref = href;
          }
          if (tn === "IMG") {
            var src = child.getAttribute("src") || "";
            if (/^https?:\/\//i.test(src)) keepSrc = src;
          }
          if (tn === "IFRAME") {
            var fsrc = child.getAttribute("src") || "";
            if (YT_EMBED_OK.test(fsrc)) keepFrame = fsrc;
          }
          if (tn === "PATH") {
            var rpd = child.getAttribute("d") || "";
            if (/^[MmLlHhVvCcSsQqTtAaZz0-9.,\s\-+eE]+$/.test(rpd)) keepPath = rpd;
          }
          Array.prototype.slice.call(child.attributes).forEach(function (a) { child.removeAttribute(a.name); });
          if (keepHref) { child.setAttribute("href", keepHref); child.setAttribute("target", "_blank"); child.setAttribute("rel", "noopener noreferrer"); }
          if (keepSrc) { child.setAttribute("src", keepSrc); child.setAttribute("loading", "lazy"); }
          if (tn === "IMG" && !keepSrc) { child.remove(); return; }
          if (tn === "SVG") child.setAttribute("viewBox", "0 0 24 24");
          if (tn === "PATH") {
            if (!keepPath) { child.remove(); return; }
            child.setAttribute("d", keepPath);
            child.setAttribute("fill", "currentColor");
          }
          if (keepLock) {
            child.setAttribute("class", "mp-locked");
            child.setAttribute("data-mode", keepLock.mode);
            if (keepLock.author) child.setAttribute("data-author", keepLock.author);
          }
          if (tn === "IFRAME") {
            if (!keepFrame) { child.remove(); return; }
            child.setAttribute("src", keepFrame);
            child.setAttribute("loading", "lazy");
            child.setAttribute("allowfullscreen", "");
            child.setAttribute("sandbox", "allow-scripts allow-same-origin allow-presentation");
            child.setAttribute("referrerpolicy", "no-referrer-when-downgrade");
          }
          walk(child);
        });
      })(doc.body);
      return doc.body.innerHTML;
    } catch (e) { return ""; }
  }
  var SIG_ALLOWED = { P: 1, BR: 1, STRONG: 1, B: 1, EM: 1, I: 1, S: 1, STRIKE: 1, CODE: 1, PRE: 1, UL: 1, OL: 1, LI: 1, BLOCKQUOTE: 1, A: 1, H3: 1, H4: 1, IMG: 1, IFRAME: 1, DIV: 1 , SVG: 1, PATH: 1 };
  var EMBED_SRC_OK = /^https:\/\/(open\.spotify\.com|w\.soundcloud\.com|player\.vimeo\.com)\//i;
  function sanitizeSignature(html) {
    try {
      var doc = new DOMParser().parseFromString(String(html || ""), "text/html");
      (function walk(node) {
        var kids = Array.prototype.slice.call(node.childNodes);
        kids.forEach(function (child) {
          if (child.nodeType === 3) return;
          if (child.nodeType !== 1) { child.remove(); return; }
          var tn2 = (child.tagName || "").toUpperCase();
          if (!SIG_ALLOWED[tn2]) {
            walk(child);
            while (child.firstChild) node.insertBefore(child.firstChild, child);
            child.remove();
            return;
          }
          var keepHref = null, keepSrc = null, keepFrame = null, keepPath = null;
          if (tn2 === "A") {
            var href = child.getAttribute("href") || "";
            if (/^https?:\/\//i.test(href)) keepHref = href;
          }
          if (tn2 === "IMG") {
            var src = child.getAttribute("src") || "";
            if (/^https?:\/\//i.test(src)) keepSrc = src;
          }
          if (tn2 === "IFRAME") {
            var fsrc = child.getAttribute("src") || "";
            if (EMBED_SRC_OK.test(fsrc)) keepFrame = fsrc;
          }
          if (tn2 === "PATH") {
            var pd = child.getAttribute("d") || "";
            if (/^[MmLlHhVvCcSsQqTtAaZz0-9.,\s\-+eE]+$/.test(pd)) keepPath = pd;
          }
          Array.prototype.slice.call(child.attributes).forEach(function (a) { child.removeAttribute(a.name); });
          if (keepHref) { child.setAttribute("href", keepHref); child.setAttribute("target", "_blank"); child.setAttribute("rel", "noopener noreferrer"); }
          if (keepSrc) { child.setAttribute("src", keepSrc); child.setAttribute("loading", "lazy"); }
          if (tn2 === "IMG" && !keepSrc) { child.remove(); return; }
          if (tn2 === "IFRAME") {
            if (!keepFrame) { child.remove(); return; }
            child.setAttribute("src", keepFrame);
            child.setAttribute("loading", "lazy");
            child.setAttribute("allowfullscreen", "");
            child.setAttribute("sandbox", "allow-scripts allow-same-origin allow-presentation");
            child.setAttribute("referrerpolicy", "no-referrer-when-downgrade");
          }
          if (tn2 === "SVG") { child.setAttribute("viewBox", "0 0 24 24"); child.setAttribute("width", "13"); child.setAttribute("height", "13"); }
          if (tn2 === "PATH") {
            if (!keepPath) { child.remove(); return; }
            child.setAttribute("d", keepPath);
            child.setAttribute("fill", "currentColor");
          }
          walk(child);
        });
      })(doc.body);
      return doc.body.innerHTML;
    } catch (e) { return ""; }
  }
  function canPostEmbed() { return !!(meInfo && (meInfo.member || isOwner)); }

  function sigVisible() {
    try { return localStorage.getItem("mp_show_sigs") !== "0"; } catch (e) { return true; }
  }
  var SIG_EMOJI_NET = { "\uD83D\uDC26": "x", "\uD83D\uDCF8": "instagram", "\uD83C\uDFB5": "tiktok", "\u25B6": "youtube" };
  var SIG_LOGO_PATHS = {
    x: "M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z",
    instagram: "M7.0301.084c-1.2768.0602-2.1487.264-2.911.5634-.7888.3075-1.4575.72-2.1228 1.3877-.6652.6677-1.075 1.3368-1.3802 2.127-.2954.7638-.4956 1.6365-.552 2.914-.0564 1.2775-.0689 1.6882-.0626 4.947.0062 3.2586.0206 3.6671.0825 4.9473.061 1.2765.264 2.1482.5635 2.9107.308.7889.72 1.4573 1.388 2.1228.6679.6655 1.3365 1.0743 2.1285 1.38.7632.295 1.6361.4961 2.9134.552 1.2773.056 1.6884.069 4.9462.0627 3.2578-.0062 3.668-.0207 4.9478-.0814 1.28-.0607 2.147-.2652 2.9098-.5633.7889-.3086 1.4578-.72 2.1228-1.3881.665-.6682 1.0745-1.3378 1.3795-2.1284.2957-.7632.4966-1.636.552-2.9124.056-1.2809.0692-1.6898.063-4.948-.0063-3.2583-.021-3.6668-.0817-4.9465-.0607-1.2797-.264-2.1487-.5633-2.9117-.3084-.7889-.72-1.4568-1.3876-2.1228C21.2982 1.33 20.628.9208 19.8378.6165 19.074.321 18.2017.1197 16.9244.0645 15.6471.0093 15.236-.005 11.977.0014 8.718.0076 8.31.0215 7.0301.0839m.1402 21.6932c-1.17-.0509-1.8053-.2453-2.2287-.408-.5606-.216-.96-.4771-1.3819-.895-.422-.4178-.6811-.8186-.9-1.378-.1644-.4234-.3624-1.058-.4171-2.228-.0595-1.2645-.072-1.6442-.079-4.848-.007-3.2037.0053-3.583.0607-4.848.05-1.169.2456-1.805.408-2.2282.216-.5613.4762-.96.895-1.3816.4188-.4217.8184-.6814 1.3783-.9003.423-.1651 1.0575-.3614 2.227-.4171 1.2655-.06 1.6447-.072 4.848-.079 3.2033-.007 3.5835.005 4.8495.0608 1.169.0508 1.8053.2445 2.228.408.5608.216.96.4754 1.3816.895.4217.4194.6816.8176.9005 1.3787.1653.4217.3617 1.056.4169 2.2263.0602 1.2655.0739 1.645.0796 4.848.0058 3.203-.0055 3.5834-.061 4.848-.051 1.17-.245 1.8055-.408 2.2294-.216.5604-.4763.96-.8954 1.3814-.419.4215-.8181.6811-1.3783.9-.4224.1649-1.0577.3617-2.2262.4174-1.2656.0595-1.6448.072-4.8493.079-3.2045.007-3.5825-.006-4.848-.0608M16.953 5.5864A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.4424M5.8385 12.012c.0067 3.4032 2.7706 6.1557 6.173 6.1493 3.4026-.0065 6.157-2.7701 6.1506-6.1733-.0065-3.4032-2.771-6.1565-6.174-6.1498-3.403.0067-6.156 2.771-6.1496 6.1738M8 12.0077a4 4 0 1 1 4.008 3.9921A3.9996 3.9996 0 0 1 8 12.0077",
    tiktok: "M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z",
    youtube: "M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z",
  };
  function sigLogo(n) {
    var ext = (window.MPSocialLogos || {})[n];
    if (ext) return ext;
    var d = SIG_LOGO_PATHS[n];
    return d ? '<svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true"><path fill="currentColor" d="' + d + '"/></svg>' : "";
  }
  function sigNet(url) {
    var m = String(url || "").match(/^(https?:\/\/)?(www\.)?(x\.com|twitter\.com|instagram\.com|tiktok\.com|youtube\.com|youtu\.be)(\/|$)/i);
    if (!m) return "";
    var d = m[3].toLowerCase();
    return (d === "x.com" || d === "twitter.com") ? "x" : d === "instagram.com" ? "instagram" : d === "tiktok.com" ? "tiktok" : "youtube";
  }
  function upgradeSigSocial(html) {
    var out = String(html || "").replace(/(<a href="[^"]*"[^>]*>)(\uD83D\uDC26|\uD83D\uDCF8|\uD83C\uDFB5|\u25B6)\s?/g, function (m, open, emo) {
      var logo = sigLogo(SIG_EMOJI_NET[emo]);
      return logo ? open + logo + " " : m;
    });
    out = out.replace(/<div>(<a href="([^"]*)"[^>]*>.*?<\/a>)<\/div>/g, function (m, a, url) {
      var net = sigNet(url);
      return net ? '<span class="sig-social-item net-' + net + '">' + a + "</span>" : m;
    });
    out = out.replace(/((?:<span class="sig-social-item[^"]*">.*?<\/span>)+)/g, '<div class="sig-social-row">$1</div>');
    return out;
  }
  function signatureHTML(post, compact) {
    if (!post || !post.authorSignature || !sigVisible()) return "";
    var clean = upgradeSigSocial(sanitizeSignature(post.authorSignature));
    if (!clean.replace(/<[^>]*>/g, "").trim() && clean.indexOf("<img") < 0 && clean.indexOf("<iframe") < 0) return "";
    return '<div class="forum-sig' + (compact ? " compact" : "") + '">' + clean + "</div>";
  }

  function applyLockGates(thread) {
    if (!thread || !root) return;
    var viewer = "";
    try { viewer = meInfo ? String(meInfo.username).toLowerCase() : ""; } catch (e) {}
    var isMem = !!(meInfo && (meInfo.member || isOwner));
    var replied = {};
    (thread.replies || []).forEach(function (r) {
      if (r.author) replied[String(r.author).toLowerCase()] = 1;
    });
    root.querySelectorAll(".mp-locked").forEach(function (el) {
      var mode = el.getAttribute("data-mode") || "reply";
      var author = (el.getAttribute("data-author") || "").toLowerCase();
      var canSee = isOwner || (viewer && viewer === author) ||
        (mode === "member" ? isMem : (viewer && !!replied[viewer]));
      if (!canSee) {
        el.setAttribute("data-gated", "1");
        el.innerHTML = '<div class="mp-locked-note"><span aria-hidden="true">\uD83D\uDD12</span><span>' +
          esc(mode === "member" ? "This hidden content is only available to VIPs" : "This hidden content becomes available once you reply to this thread") +
          "</span></div>";
      }
    });
  }
  // Convert @username to clickable mention links
  function linkMentions(html) {
    if (!html) return html;
    return String(html).replace(/(^|\s)@([A-Za-z0-9_]{3,16})/g, function (m, pre, uname) {
      return pre + '<a href="#" class="forum-mention" data-user="' + uname.toLowerCase() + '" style="color:#6ea8ff;font-weight:600;text-decoration:none;">@' + uname + '</a>';
    });
  }

  function bodyHTML(item) {
    if (item.rich) return linkMentions(sanitizeHTML(item.content));
    return esc(item.content || "").replace(/\n/g, "<br>");
  }

  var replyEditor = null;
  var newEditor = null;
  var editEditor = null;
  var editThumbId = null;
  function destroyEditEditor() { if (editEditor) { try { editEditor.destroy(); } catch (e) {} editEditor = null; } }
  function plainToHTML(text) {
    return String(text || "").split(/\n\s*\n/).map(function (para) {
      return "<p>" + esc(para).replace(/\n/g, "<br>") + "</p>";
    }).join("");
  }
  var editorLibPromise = null;
  function loadEditorLib() {
    if (!editorLibPromise) {
      editorLibPromise = Promise.all([
        import("https://esm.sh/@tiptap/core@2.11.5"),
        import("https://esm.sh/@tiptap/starter-kit@2.11.5"),
        import("https://esm.sh/@tiptap/extension-placeholder@2.11.5"),
        import("https://esm.sh/@tiptap/extension-link@2.11.5"),
        import("https://esm.sh/@tiptap/extension-image@2.11.5")
      ]).then(function (mods) {
        return { Editor: mods[0].Editor, Node: mods[0].Node, StarterKit: mods[1].default, Placeholder: mods[2].default, Link: mods[3].default, Image: mods[4].default };
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
    { act: "quote", label: "\u201D", cls: "" },
    { act: "lock", label: "\uD83D\uDD12", cls: "" }
  ];
  var MEDIA_BTNS = [
    { act: "image", label: "\uD83D\uDCF7", member: false, title: "Upload media" },
    { act: "link", label: "\uD83D\uDD17", member: false, title: "Attach URL" },
    { act: "embed", label: "\uD83D\uDCFA", member: true, title: "Media embed" }
  ];
  function toolbarHTML(opts) {
    opts = opts || {};
    var h = '<div class="forum-toolbar">';
    TOOLBAR.forEach(function (b) {
      if (b.act === "lock" && !opts.lock) return;
      h += '<button type="button" class="forum-tb ' + b.cls + '" data-act="' + b.act + '"' + (b.act === "lock" ? ' title="Hide content"' : "") + '>' + b.label + "</button>";
    });
    MEDIA_BTNS.forEach(function (b) {
      if (b.act === "embed" && !opts.embed) return;
      if (b.member && !opts.member) return;
      h += '<button type="button" class="forum-tb" data-act="' + b.act + '" title="' + b.title + '">' + b.label + "</button>";
    });
    h += "</div>";
    if (opts.lock) h += '<div class="forum-lockbar hidden"><span class="forum-lockbar-label">Hidden for:</span><button type="button" data-lockmode="reply">\uD83D\uDCAC Repliers</button><button type="button" data-lockmode="member">\u2B50 VIPs</button><button type="button" class="forum-lock-cancel" aria-label="Cancel">\u00D7</button></div>';
    h += '<div class="forum-linkbar hidden"><input type="url" class="forum-link-input" placeholder="https://\u2026"><button type="button" class="forum-link-apply">Add link</button><button type="button" class="forum-link-remove">Remove</button></div>';
    if (opts.embed) h += '<div class="forum-embedbar hidden"><input type="text" class="forum-embed-input" placeholder="Paste a YouTube link or embed code"><button type="button" class="forum-embed-add">Embed</button><button type="button" class="forum-embed-cancel">\u00D7</button></div>';
    h += '<input type="file" class="forum-file-input hidden" accept="image/*">';

    return h;
  }
  function toggleLockBar(mountEl) {
    ["linkbar", "embedbar"].forEach(function (c) {
      var el = mountEl.querySelector(".forum-" + c);
      if (el) el.classList.add("hidden");
    });
    var lb = mountEl.querySelector(".forum-lockbar");
    if (lb) lb.classList.toggle("hidden");
  }
  function lockSelection(editor, mode) {
    var txt = "";
    try { var sel = window.getSelection(); if (sel) txt = sel.toString(); } catch (e) {}
    txt = txt.replace(/\s+$/, "");
    var author = "";
    try { author = (meInfo && meInfo.username) || ""; } catch (e) {}
    var inner = txt ? "<p>" + esc(txt).replace(/\n/g, "<br>") + "</p>" : "<p>Hidden content\u2026</p>";
    try {
      editor.chain().focus().deleteSelection().insertContent(
        '<div class="mp-locked" data-mode="' + mode + '" data-author="' + esc(author) + '">' + inner + "</div><p></p>"
      ).run();
    } catch (e) {}
  }
  function wireLockBar(editor, mountEl) {
    var lb = mountEl.querySelector(".forum-lockbar");
    if (!lb || !editor) return;
    lb.querySelectorAll("[data-lockmode]").forEach(function (btn) {
      btn.addEventListener("mousedown", function (e) { e.preventDefault(); });
      btn.addEventListener("click", function () {
        lockSelection(editor, btn.getAttribute("data-lockmode"));
        lb.classList.add("hidden");
      });
    });
    var cx = lb.querySelector(".forum-lock-cancel");
    if (cx) cx.addEventListener("click", function () { lb.classList.add("hidden"); });
  }
  function fmtSize(bytes) {
    bytes = Number(bytes) || 0;
    if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + " MB";
    if (bytes >= 1024) return Math.round(bytes / 1024) + " KB";
    return bytes + " B";
  }
  function uploadEditorFile(file, done) {
    if (file.size > 50 * 1024 * 1024) { alert("Files are capped at 50MB for VIPs."); done(null); return; }
    var reader = new FileReader();
    reader.onload = function () {
      api("/api/media", { method: "POST", body: { dataUrl: String(reader.result || ""), kind: "file", filename: file.name } })
        .then(function (r) {
          if (r && r.ok && r.id) done({ url: API + "/api/media/" + r.id, name: file.name, size: file.size });
          else { alert((r && r.error) || "Upload failed"); done(null); }
        })
        .catch(function () { alert("Upload failed"); done(null); });
    };
    reader.onerror = function () { done(null); };
    reader.readAsDataURL(file);
  }
  var YT_EMBED_OK = /^https:\/\/(www\.youtube\.com|www\.youtube-nocookie\.com)\/embed\//i;
  function extractYouTubeEmbed(raw) {
    raw = String(raw || "").trim();
    var m = raw.match(/<iframe[^>]*src\s*=\s*"([^"]+)"/i) || raw.match(/<iframe[^>]*src\s*=\s*'([^']+)'/i);
    var url = m ? m[1] : raw;
    if (YT_EMBED_OK.test(url)) return url;
    var id = (url.match(/(?:youtube\.com\/(?:watch\?[^\s]*v=|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/i) || [])[1];
    if (id) return "https://www.youtube.com/embed/" + id;
    return null;
  }
  function splitPostEmbeds(html) {
    var embeds = [];
    try {
      var doc = new DOMParser().parseFromString(String(html || ""), "text/html");
      doc.querySelectorAll("iframe").forEach(function (f) {
        var src = f.getAttribute("src") || "";
        if (src && embeds.length < 2) embeds.push({ src: src });
        var w = f.closest ? (f.closest(".forum-embed") || f) : f;
        w.remove();
      });
      html = doc.body.innerHTML;
    } catch (e) {}
    return { html: html, embeds: embeds };
  }
  function appendPostEmbeds(html, embeds) {
    (embeds || []).forEach(function (e) {
      if (!e || !e.src) return;
      html += '<div class="forum-embed"><iframe src="' + String(e.src).replace(/"/g, "%22") + '" allowfullscreen loading="lazy"></iframe></div>';
    });
    return html;
  }
  function paintPostEmbedChips(mount) {
    var box = mount.querySelector(".forum-embed-chips");
    if (!box) return;
    box.innerHTML = "";
    (mount._postEmbeds || []).forEach(function (e, i) {
      var chip = document.createElement("span");
      chip.className = "sig-chip";
      chip.textContent = "\u25B6 YouTube ";
      var rm = document.createElement("button");
      rm.type = "button"; rm.className = "sig-chip-x"; rm.textContent = "\u00D7";
      rm.setAttribute("aria-label", "Remove embed");
      rm.addEventListener("click", function () { (mount._postEmbeds || []).splice(i, 1); paintPostEmbedChips(mount); });
      chip.appendChild(rm);
      box.appendChild(chip);
    });
  }
  function wirePostEmbeds(mount) {
    if (!mount._postEmbeds) mount._postEmbeds = [];
    var bar = mount.querySelector(".forum-embedbar");
    if (!bar) return;
    var chips = document.createElement("div");
    chips.className = "forum-embed-chips";
    mount.appendChild(chips);
    paintPostEmbedChips(mount);
    bar.querySelector(".forum-embed-add").addEventListener("click", function () {
      var inp = bar.querySelector(".forum-embed-input");
      var src = extractYouTubeEmbed(inp.value);
      if (!src) { alert("Paste a YouTube video link or embed code."); return; }
      if (mount._postEmbeds.length >= 2) { alert("Two embeds max."); return; }
      mount._postEmbeds.push({ src: src });
      inp.value = "";
      bar.classList.add("hidden");
      paintPostEmbedChips(mount);
    });
    bar.querySelector(".forum-embed-cancel").addEventListener("click", function () { bar.classList.add("hidden"); });
  }
  function refreshToolbar(editor, bar) {
    if (!editor || !bar) return;
    var map = { bold: "bold", italic: "italic", strike: "strike", code: "code", bullet: "bulletList", ordered: "orderedList", quote: "blockquote" };
    bar.querySelectorAll("[data-act]").forEach(function (btn) {
      var act = btn.getAttribute("data-act");
      var on = false;
      try {
        if (act === "h3") on = editor.isActive("heading", { level: 3 });
        else if (act === "link") on = editor.isActive("link");
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
        if (act === "lock") { toggleLockBar(mountEl); return; }
        if (act === "link") { toggleLinkBar(editor, mountEl); return; }
        if (act === "embed") {
          var lb2 = mountEl.querySelector(".forum-linkbar");
          if (lb2) lb2.classList.add("hidden");
          var eb = mountEl.querySelector(".forum-embedbar");
          if (eb) {
            var opening = eb.classList.contains("hidden");
            eb.classList.toggle("hidden", !opening);
            if (opening) { var ein = eb.querySelector(".forum-embed-input"); if (ein) setTimeout(function () { ein.focus(); }, 50); }
          }
          return;
        }
        if (act === "image") {
          var lb = mountEl.querySelector(".forum-linkbar");
          if (lb) lb.classList.add("hidden");
          var fi = mountEl.querySelector(".forum-file-input");
          if (fi) fi.click();
          return;
        }
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
    var linkBar = mountEl.querySelector(".forum-linkbar");
    if (linkBar) {
      var linkInput = linkBar.querySelector(".forum-link-input");
      linkBar.querySelector(".forum-link-apply").addEventListener("click", function () {
        var url = (linkInput.value || "").trim();
        if (!url) return;
        if (!/^https?:\/\//i.test(url)) url = "https://" + url;
        var sel = editor.state.selection;
        var isNodeSel = !!sel.node;
        if (sel.empty || isNodeSel) {
          // No text selected (or media selected): drop the link in as its own
          // text link so links and media can live in the same post.
          editor.chain().focus().insertContent('<a href="' + url.replace(/"/g, "%22") + '">' + esc(url) + "</a><p></p>").run();
        } else {
          editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
        }
        linkBar.classList.add("hidden");
        linkInput.value = "";
      });
      linkBar.querySelector(".forum-link-remove").addEventListener("click", function () {
        editor.chain().focus().extendMarkRange("link").unsetLink().run();
        linkBar.classList.add("hidden");
      });
    }
    wireLockBar(editor, mountEl);
    var fileInput = mountEl.querySelector(".forum-file-input");
    if (fileInput) {
      fileInput.addEventListener("change", function () {
        var file = fileInput.files && fileInput.files[0];
        fileInput.value = "";
        if (!file) return;
        uploadEditorImage(file, function (url) {
          if (url) editor.chain().focus().setImage({ src: url }).run();
        });
      });
    }
  }
  function toggleLinkBar(editor, mountEl) {
    var bar = mountEl.querySelector(".forum-linkbar");
    if (!bar) return;
    var opening = bar.classList.contains("hidden");
    bar.classList.toggle("hidden", !opening);
    if (opening) {
      var input = bar.querySelector(".forum-link-input");
      var existing = "";
      try { existing = editor.getAttributes("link").href || ""; } catch (e) {}
      input.value = existing;
      setTimeout(function () { input.focus(); }, 50);
    } else {
      editor.commands.focus();
    }
  }
  var newThumbId = null;
  function cropSquareDataUrl(file) {
    return new Promise(function (resolve, reject) {
      if (file.type === "image/gif") {
        var fr = new FileReader();
        fr.onload = function () { resolve(fr.result); };
        fr.onerror = reject;
        fr.readAsDataURL(file);
        return;
      }
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        try {
          var side = Math.min(img.naturalWidth, img.naturalHeight, 900);
          var canvas = document.createElement("canvas");
          canvas.width = side; canvas.height = side;
          var ctx = canvas.getContext("2d");
          var sx = (img.naturalWidth - Math.min(img.naturalWidth, img.naturalHeight)) / 2;
          var sy = (img.naturalHeight - Math.min(img.naturalWidth, img.naturalHeight)) / 2;
          var src = Math.min(img.naturalWidth, img.naturalHeight);
          ctx.drawImage(img, sx, sy, src, src, 0, 0, side, side);
          URL.revokeObjectURL(url);
          resolve(canvas.toDataURL("image/jpeg", 0.85));
        } catch (e) { reject(e); }
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  function uploadEditorImage(file, done) {
    function send(dataUrl) {
      api("/api/media", { method: "POST", body: { dataUrl: dataUrl, kind: "image" } })
        .then(function (r) {
          if (r && r.ok && r.id) done(API + "/api/media/" + r.id);
          else { alert((r && r.error) || "Upload failed"); done(null); }
        })
        .catch(function () { alert("Upload failed"); done(null); });
    }
    var isGif = file.type === "image/gif";
    var reader = new FileReader();
    reader.onload = function () {
      var dataUrl = String(reader.result || "");
      // GIFs go up as-is to keep the animation (backend enforces size caps)
      if (isGif) { send(dataUrl); return; }
      var img = new Image();
      img.onload = function () {
        try {
          var max = 1600;
          var scale = Math.min(1, max / Math.max(img.width, img.height));
          if (scale >= 1 && file.type === "image/jpeg") { send(dataUrl); return; }
          var cv = document.createElement("canvas");
          cv.width = Math.round(img.width * scale);
          cv.height = Math.round(img.height * scale);
          cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
          send(cv.toDataURL("image/jpeg", 0.85));
        } catch (e) { send(dataUrl); }
      };
      img.onerror = function () { send(dataUrl); };
      img.src = dataUrl;
    };
    reader.onerror = function () { done(null); };
    reader.readAsDataURL(file);
  }
  function lockedBlockNode(Node) {
    return Node.create({
      name: "lockedBlock",
      group: "block",
      content: "block+",
      defining: true,
      addAttributes: function () {
        return {
          mode: { default: "reply", parseHTML: function (el) { return el.getAttribute("data-mode") || "reply"; } },
          author: { default: "", parseHTML: function (el) { return el.getAttribute("data-author") || ""; } }
        };
      },
      parseHTML: function () { return [{ tag: "div.mp-locked" }]; },
      renderHTML: function (ctx) {
        var a = ctx.HTMLAttributes;
        return ["div", { class: "mp-locked", "data-mode": a.mode, "data-author": a.author }, 0];
      }
    });
  }
  var mentionUserCache = null;
  function getMentionUsers() {
    if (mentionUserCache) return Promise.resolve(mentionUserCache);
    return api("/api/users").then(function (r) {
      if (r && r.ok && r.users) {
        mentionUserCache = r.users.map(function (u) { return u.username; }).filter(Boolean);
        return mentionUserCache;
      }
      return [];
    }).catch(function () { return []; });
  }

  function wireMentionAutocomplete(editor, mount) {
    var dropdown = null;
    function hideDropdown() {
      if (dropdown) { dropdown.remove(); dropdown = null; }
    }
    editor.on("update", function () {
      var sel = editor.state.selection;
      var textBefore = "";
      try {
        var pos = sel.$head.pos;
        var start = Math.max(0, pos - 20);
        textBefore = editor.state.doc.textBetween(start, pos, " ");
      } catch (e) { hideDropdown(); return; }
      var m = textBefore.match(/@([A-Za-z0-9_]{0,16})$/);
      if (!m) { hideDropdown(); return; }
      var query = m[1].toLowerCase();
      getMentionUsers().then(function (users) {
        var matches = users.filter(function (u) {
          return u.toLowerCase().indexOf(query) === 0 && u.toLowerCase() !== query;
        }).slice(0, 5);
        if (!matches.length) { hideDropdown(); return; }
        hideDropdown();
        dropdown = document.createElement("div");
        dropdown.className = "forum-mention-dropdown";
        dropdown.style.cssText = "position:absolute;z-index:1000;background:rgba(20,25,45,.98);border:1px solid rgba(255,255,255,.12);border-radius:10px;padding:4px;min-width:160px;box-shadow:0 8px 24px rgba(0,0,0,.4);";
        matches.forEach(function (uname) {
          var item = document.createElement("button");
          item.type = "button";
          item.textContent = "@" + uname;
          item.style.cssText = "display:block;width:100%;text-align:left;padding:8px 10px;border:none;background:none;color:#fff;border-radius:6px;cursor:pointer;font-size:14px;";
          item.addEventListener("click", function () {
            // Replace @query with @username
            var tr = editor.state.tr;
            var endPos = sel.$head.pos;
            var startPos = endPos - query.length - 1;
            tr.delete(startPos, endPos);
            tr.insertText("@" + uname + " ");
            editor.view.dispatch(tr);
            editor.view.focus();
            hideDropdown();
          });
          item.addEventListener("mouseenter", function () { item.style.background = "rgba(80,140,255,.2)"; });
          item.addEventListener("mouseleave", function () { item.style.background = "none"; });
          dropdown.appendChild(item);
        });
        // Position near cursor
        var coords = editor.view.coordsAtPos(sel.$head.pos);
        var mountRect = mount.getBoundingClientRect();
        dropdown.style.left = (coords.left - mountRect.left) + "px";
        dropdown.style.top = (coords.bottom - mountRect.top + 4) + "px";
        mount.style.position = "relative";
        mount.appendChild(dropdown);
      });
    });
    // Hide on click outside
    document.addEventListener("click", function (e) {
      if (dropdown && !dropdown.contains(e.target)) hideDropdown();
    });
  }

  function createEditor(mount, placeholder, initialHTML) {
    return loadEditorLib().then(function (lib) {
      if (!lib) return null;
      var editor = new lib.Editor({
        element: mount.querySelector(".forum-editor-mount"),
        extensions: [
          lib.StarterKit.configure({ heading: { levels: [3] } }),
          lib.Placeholder.configure({ placeholder: placeholder }),
          lib.Link.configure({ openOnClick: false, autolink: true }),
          lib.Image.configure({ inline: false })
        ].concat(lib.Node ? [lockedBlockNode(lib.Node)] : []),
        content: initialHTML || "",
        editorProps: { attributes: { class: "forum-editor-input" } }
      });
      wireToolbar(editor, mount);
      wireMentionAutocomplete(editor, mount);
      return editor;
    });
  }

  window.MPSigEditor = {
    // Mounts the shared TipTap editor for signature editing.
    // opts: { html, member, placeholder } -> Promise<Editor|null>
    mount: function (container, opts) {
      opts = opts || {};
      container.innerHTML = toolbarHTML({ member: !!opts.member }) + '<div class="forum-editor-mount"></div>';
      if (!opts.member) {
        var ib = container.querySelector('[data-act="image"]');
        if (ib) ib.remove();
      }
      return createEditor(container, opts.placeholder || "Your signature\u2026", opts.html || "");
    }
  };

  function wireSigninTop() {
    var b = root && root.querySelector("#forum-signin-top");
    if (b) b.addEventListener("click", function () {
      if (window.MPNav && window.MPNav.show) window.MPNav.show("journal");
    });
  }
  function forumTopBar() {
    var pts = meInfo ? (meInfo.points || 0) : 0;
    var avHtml = "";
    if (meInfo && window.MPChat && window.MPChat.avatarNode) {
      var node = window.MPChat.avatarNode(meInfo.username, meInfo.avatar, "sm", meInfo.avatarV || 0);
      avHtml = node.outerHTML;
      // Add active badge like the chat header does
      if (window.MPChat && window.MPChat.badgeFor) {
        var b = window.MPChat.badgeFor(meInfo);
        if (b) avHtml = avHtml.replace(/<\/span>$/, b + "</span>");
      }
    }
    return '<div class="chat-head forum-topbar">' +
      '<div class="chat-title">Forum</div>' +
      '<div class="chat-head-right">' +
      (token() && view.name !== "new" ? (view.name === "thread"
        ? '<button type="button" class="btn accent forum-topbar-new" id="forum-reply-top">New reply</button>'
        : '<button type="button" class="btn accent forum-topbar-new" id="forum-new-top">New thread</button>') : "") +
      (!token() ? '<button type="button" class="btn forum-topbar-signin" id="forum-signin-top">Sign in</button>' : "") +
      '<span class="chat-points" title="Your points"><span class="chat-star" aria-hidden="true">\u2605</span> <span class="chat-points-num" id="forum-points">' + pts + "</span></span>" +

      (token() ? '<button type="button" class="chat-me" id="forum-me" aria-label="Profile">' + avHtml + "</button>" : "") +
      "</div></div>";
  }

  function renderList() {
    destroyEditEditor();
    updateTopBtn();
    var html = '<div class="forum-anim">' + forumTopBar();

    // Category pills
    html += '<div class="forum-cats">';
    html += '<button type="button" class="forum-cat' + (view.category === "" ? " on" : "") + '" data-cat="">All</button>';
    cache.categories.forEach(function (c) {
      html += '<button type="button" class="forum-cat' + (view.category === c.id ? " on" : "") + '" data-cat="' + esc(c.id) + '">' +
        esc(c.name) + (c.membersOnly ? " \u2B50" : "") + (c.ownerOnly ? ' <svg class="forum-cat-lock" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><rect x="4.5" y="10.5" width="15" height="9.5" rx="2.5"/><path d="M8 10.5V7.5a4 4 0 0 1 7.8-1.3"/></svg>' : "") + "</button>";
    });
    html += "</div>";

    if (view.tag) {
      html += '<div class="forum-tagbar"><span>Filtering by</span><span class="forum-tag on">#' + esc(view.tag) + '</span>' +
        '<button type="button" class="forum-tag-clear" id="forum-tag-clear">\u2715 Clear</button></div>';
    }

    // Threads
    var threads = cache.threads.filter(function (t) {
      if (view.tag) return (t.tags || []).indexOf(view.tag) !== -1;
      return !view.category || t.category === view.category;
    });

    if (!threads.length) {
      html += '<div class="forum-empty">' + (view.tag ? "No posts with #" + esc(view.tag) + " yet." : "No threads yet. Start one.") + "</div>";
    } else {
      html += '<div class="forum-threads">';
      threads.forEach(function (t) {
        html += '<div class="forum-thread-row">' +
          '<button type="button" class="forum-thread' + (t.thumb ? " has-thumb" : "") + '" data-id="' + esc(t.id) + '">' +
          '<span class="forum-thread-main">' +
          '<span class="forum-thread-title">' + esc(t.title) + "</span>" +
          '<span class="forum-thread-meta">' + avatarHTMLSmall(t) + '<span class="forum-thread-meta-text">' + authorLine(t) + " \u00B7 " + esc(t.categoryName) +
          (t.membersOnly ? " \u2B50" : "") + " \u00B7 " + timeAgo(t.lastActivity) + " \u00B7 \uD83D\uDCAC " + t.replies + "</span></span>" +
          (t.excerpt ? '<span class="forum-thread-excerpt">' + esc(t.excerpt) + "</span>" : "") +
          "</span>" +
          (t.thumb ? '<img class="forum-thread-thumb" src="' + API + "/api/media/" + esc(t.thumb) + '" alt="" loading="lazy">' : "") +
          "</button>";
        var rowTags = t.tags || [];
        if (isOwner || t.pinned || rowTags.length) {
          html += '<div class="forum-admin">' +
            (t.pinned ? '<span class="forum-pin-bubble" title="Pinned">\uD83D\uDCCC</span>' : "") +
            tagsPillsHTML(t, 2) +
            (isOwner ? '<button type="button" class="forum-admin-btn" data-pin="' + esc(t.id) + '">' + (t.pinned ? "Unpin" : "Pin") + "</button>" +
            '<button type="button" class="forum-admin-btn forum-admin-del" data-del="' + esc(t.id) + '">Delete</button>' : "") +
            "</div>";
        }
        html += "</div>";
      });
      html += "</div>";
    }

    html += "</div>";
    root.innerHTML = html;
    

    wireAvatars();
    // Content is painted; now pin to top (images loading later won't shift us)
    if (view.name === "list") window.scrollTo(0, 0);
    root.querySelectorAll(".forum-cat").forEach(function (b) {
      b.addEventListener("click", function () {
        view.tag = "";
        view.category = b.getAttribute("data-cat");
        renderList();
      });
    });
    var tagClear = root.querySelector("#forum-tag-clear");
    if (tagClear) tagClear.addEventListener("click", function () { view.tag = ""; renderList(); });
    root.querySelectorAll("[data-tag]").forEach(function (b) {
      b.addEventListener("click", function (e) {
        e.stopPropagation();
        filterByTag(b.getAttribute("data-tag"));
      });
    });
    root.querySelectorAll("[data-tagmore]").forEach(function (b) {
      b.addEventListener("click", function (e) {
        e.stopPropagation();
        tagExpand[b.getAttribute("data-tagmore")] = true;
        var sy = window.scrollY;
        renderList();
        window.scrollTo(0, sy);
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
    wireSigninTop();
    var nbTop = root.querySelector("#forum-new-top");
    if (nbTop) nbTop.addEventListener("click", function () {
      view.name = "new";
      renderNew();
    });
  }

  /* ---------- thread view ---------- */

  function renderThread() {
    root.innerHTML = '<div class="lg-spin-wrap"><span class="lg-spin"></span></div>';
    api("/api/forum/thread/" + encodeURIComponent(view.threadId)).then(function (res) {
      if (!res.ok || !res.thread) {
        root.innerHTML = '<div class="forum-empty">Thread not found.</div>';
        return;
      }
      if (res.locked) {
        var lockIcon = res.privateLock ? "\uD83D\uDD12" : "\u2B50";
        var lockMsg = res.privateLock
          ? "Private. Only the owner can view this thread."
          : "VIPs only. Become a VIP to read this thread.";
        root.innerHTML = '<div class="forum-anim">' + forumTopBar() + '<div class="forum-head">' +
          '<button type="button" class="forum-back forum-glass-pill" id="forum-back">\u2190 Back</button></div>' +
          '<div class="forum-locked"><div class="forum-locked-icon">' + lockIcon + '</div>' +
          '<div class="forum-locked-title">' + esc(res.thread.title) + "</div>" +
          '<div class="forum-locked-sub">' + lockMsg + "</div></div></div>";
        wireAvatars();
        root.querySelector("#forum-back").addEventListener("click", backToList);
        return;
      }
      cache.thread = res.thread;
      paintThread();
    });
  }

  function pollHTML(t) {
    if (!t.poll || !t.poll.options || !t.poll.options.length) return "";
    var total = t.poll.options.reduce(function (sum, o) { return sum + (o.votes || 0); }, 0);
    var myVote = meInfo && t.poll.voters ? t.poll.voters[meInfo.username.toLowerCase()] : undefined;
    var h = '<div class="forum-poll" data-thread="' + esc(t.id) + '" style="margin:12px 0;padding:14px;border-radius:12px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);">';
    h += '<div style="font-weight:700;margin-bottom:10px;">' + esc(t.poll.question) + '</div>';
    t.poll.options.forEach(function (opt, i) {
      var pct = total > 0 ? Math.round((opt.votes || 0) / total * 100) : 0;
      var voted = myVote === i;
      h += '<button type="button" class="forum-poll-opt" data-idx="' + i + '" ' + (!token() ? "disabled" : "") + ' style="display:block;width:100%;text-align:left;margin-bottom:8px;padding:10px 12px;border-radius:10px;border:1px solid ' + (voted ? "rgba(80,140,255,.6)" : "rgba(255,255,255,.1)") + ';background:' + (voted ? "rgba(80,140,255,.12)" : "rgba(255,255,255,.03)") + ';color:#fff;cursor:' + (token() ? "pointer" : "default") + ';position:relative;overflow:hidden;">';
      h += '<span style="position:absolute;left:0;top:0;bottom:0;width:' + pct + '%;background:rgba(80,140,255,.18);"></span>';
      h += '<span style="position:relative;display:flex;justify-content:space-between;"><span>' + esc(opt.text) + (voted ? " ✓" : "") + '</span><span style="opacity:.7;">' + pct + '% (' + (opt.votes || 0) + ')</span></span>';
      h += '</button>';
    });
    h += '<div style="font-size:12px;opacity:.6;margin-top:4px;">' + total + ' vote' + (total === 1 ? "" : "s") + (token() ? "" : " · Sign in to vote") + '</div></div>';
    return h;
  }

  function paintThread() {
    var t = cache.thread;
    if (!t) return;
    updateTopBtn();
    var freshOpen = paintedThreadId !== t.id;
    paintedThreadId = t.id;
    var html = forumTopBar() +
        '<div class="forum-head">' +
        '<button type="button" class="forum-back forum-glass-pill" id="forum-back">\u2190 Back</button></div>';

      html += '<article class="forum-post forum-op">' +
        '<div class="forum-post-head">' + avatarHTML(t) +
        '<span class="forum-post-author">' + authorLine(t) + "</span>" +
        (t.pinned ? '<span class="forum-pin-ico" title="Pinned">\uD83D\uDCCC</span>' : "") +
        '<span class="forum-post-time">' + timeAgo(t.createdAt) + "</span></div>" +
        '<h3 class="forum-post-title">' + esc(t.title) + "</h3>" +
        ((t.tags && t.tags.length) ? '<div class="forum-post-tags">' + tagsPillsHTML(t, 3) + "</div>" : "") +
        '<div class="forum-post-body">' + bodyHTML(t) + "</div>" +
        pollHTML(t) +
        signatureHTML(t, false) +
        '<div class="forum-admin forum-admin-thread">' + (token() ? starBtn(t, null) : "") +
          '<button type="button" class="forum-admin-btn" id="forum-copy-link" title="Copy link">\uD83D\uDD17</button>' +
          ((meInfo && (isOwner || meInfo.username.toLowerCase() === String(t.author).toLowerCase()) && cache.threads.length && ("excerpt" in cache.threads[0])) ? '<button type="button" class="forum-admin-btn" id="forum-edit-btn">Edit</button>' : "") +
          (isOwner ? '<button type="button" class="forum-admin-btn" data-pin="' + esc(t.id) + '">' + (t.pinned ? "Unpin" : "Pin") + '</button><button type="button" class="forum-admin-btn forum-admin-del" data-del="' + esc(t.id) + '">Delete</button>' : "") + "</div>" + "</article>";

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
          '<div class="forum-editor" id="forum-reply-editor">' + toolbarHTML({ embed: true, member: canPostEmbed(), lock: true }) + '<div class="forum-editor-mount"></div></div>' +
          '<button type="button" class="btn accent" id="forum-send">Reply</button></div>';
      } else {
        html += '<div class="forum-signin">Sign in to join the discussion.</div>';
      }

      root.innerHTML = '<div class="forum-anim">' + html + "</div>";
      applyLockGates(cache.thread);
      // Poll voting
      root.querySelectorAll(".forum-poll-opt").forEach(function (btn) {
        btn.addEventListener("click", function () {
          if (!token()) return;
          var pollDiv = btn.closest(".forum-poll");
          var tid = pollDiv ? pollDiv.getAttribute("data-thread") : null;
          var idx = parseInt(btn.getAttribute("data-idx"), 10);
          if (!tid || isNaN(idx)) return;
          btn.disabled = true;
          api("/api/forum/thread/" + encodeURIComponent(tid) + "/poll/vote", {
            method: "POST", body: { option: idx }
          }).then(function (res) {
            if (res.ok && res.poll) {
              cache.thread.poll = res.poll;
              paintThread();
            } else {
              alert(res.error || "Vote failed");
              btn.disabled = false;
            }
          }).catch(function () { btn.disabled = false; });
        });
      });
      wireAvatars();
      root.querySelector("#forum-back").addEventListener("click", backToList);
      var copyBtn = root.querySelector("#forum-copy-link");
      if (copyBtn) copyBtn.addEventListener("click", function () {
        var link = API + "/t/" + t.id;
        var done = function () {
          copyBtn.textContent = "\u2713";
          setTimeout(function () { copyBtn.innerHTML = "\uD83D\uDD17"; }, 1800);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(link).then(done).catch(function () { window.prompt("Copy this link:", link); });
        } else {
          window.prompt("Copy this link:", link);
        }
      });
      if (freshOpen) {
        window.scrollTo(0, 0);
        if (window.MPScroll) MPScroll.pinTop(2000);
      }
      initReplyEditor();
      attachLinkPreviews();
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
      wireSigninTop();
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
      var editBtn = root.querySelector("#forum-edit-btn");
      if (editBtn) editBtn.addEventListener("click", function () { renderEdit(); });
      root.querySelectorAll("[data-tag]").forEach(function (b) {
        b.addEventListener("click", function () { filterByTag(b.getAttribute("data-tag")); });
      });
      root.querySelectorAll("[data-tagmore]").forEach(function (b) {
        b.addEventListener("click", function () {
          tagExpand[b.getAttribute("data-tagmore")] = true;
          renderThreadInPlace();
        });
      });

      var send = root.querySelector("#forum-send");
      if (send) send.addEventListener("click", function () {
        var content = "", rich = false;
        if (replyEditor) {
          if (replyEditor.isEmpty) return;
          content = appendPostEmbeds(replyEditor.getHTML(), mount._postEmbeds);
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

  var previewCache = {};
  function attachLinkPreviews() {
    if (!token()) return;
    var bodies = root.querySelectorAll(".forum-post-body");
    var seen = {};
    bodies.forEach(function (body) {
      var links = body.querySelectorAll('a[href^="http"]');
      links.forEach(function (a) {
        var url = a.getAttribute("href");
        if (!url || seen[url]) return;
        // Skip links that wrap an image or point at uploaded media
        if (a.querySelector("img")) return;
        if (url.indexOf("/api/media/") !== -1) return;
        seen[url] = true;
        if (body.querySelector('.forum-linkcard[href="' + CSS.escape(url) + '"]')) return;
        var host = document.createElement("div");
        body.appendChild(host);
        var renderCard = function (embed) {
          if (!embed || !embed.title) { host.remove(); return; }
          var linkText = (a.textContent || "").trim();
          if (/^https?:\/\//i.test(linkText)) {
            a.style.display = "none";
            var p = a.closest("p");
            if (p && !p.textContent.trim()) p.style.display = "none";
          }
          var card = document.createElement("a");
          card.className = "forum-linkcard";
          card.href = embed.url || url;
          card.target = "_blank";
          card.rel = "noopener noreferrer";
          if (embed.thumb) {
            var im = document.createElement("img");
            im.src = embed.thumb;
            im.loading = "lazy";
            im.alt = "";
            im.referrerPolicy = "no-referrer";
            card.appendChild(im);
          }
          var tx = document.createElement("span");
          tx.className = "forum-linkcard-tx";
          var t = document.createElement("span");
          t.className = "forum-linkcard-t";
          t.textContent = embed.title;
          var p = document.createElement("span");
          p.className = "forum-linkcard-p";
          p.textContent = embed.provider || "";
          tx.appendChild(t);
          tx.appendChild(p);
          card.appendChild(tx);
          host.replaceWith(card);
        };
        if (previewCache[url]) { renderCard(previewCache[url]); return; }
        api("/api/unfurl?url=" + encodeURIComponent(url)).then(function (r) {
          var embed = r && r.ok ? r.embed : null;
          previewCache[url] = embed;
          renderCard(embed);
        }).catch(function () { host.remove(); });
      });
    });
  }

  var topBtnEl = null;
  function ensureTopBtn() {
    if (topBtnEl) return topBtnEl;
    var panel = document.getElementById("forum");
    if (!panel) return null;
    var b = document.createElement("button");
    b.type = "button";
    b.className = "forum-topbtn";
    b.setAttribute("aria-label", "Back to top");
    b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5"/><path d="M5 12l7-7 7 7"/></svg>';
    b.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    panel.appendChild(b);
    topBtnEl = b;
    window.addEventListener("scroll", updateTopBtn, { passive: true });
    return b;
  }
  function updateTopBtn() {
    var b = ensureTopBtn();
    if (!b) return;
    var show = view.name === "thread" && window.scrollY > 500;
    b.classList.toggle("show", show);
  }

  function initReplyEditor() {
    var mount = root.querySelector("#forum-reply-editor");
    wirePostEmbeds(mount);
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
    paintedThreadId = null;
    view.replyTo = null;
    view.showNested = {};
    window.scrollTo(0, 0);
    if (window.MPScroll) MPScroll.pinTop(1500);
    render();
  }

  /* ---------- new thread ---------- */

  var newTagState = { tags: [] };
  var editTagState = { tags: [] };

  function tagEditorHTML(prefix) {
    return '<div class="forum-tag-editor">' +
      '<div class="forum-tag-pills" id="' + prefix + '-tag-pills"></div>' +
      '<input type="text" class="forum-tag-input" id="' + prefix + '-tag-input" placeholder="Add a tag and press enter" maxlength="24" autocomplete="off" autocapitalize="none">' +
      '<div class="forum-tag-suggest hidden" id="' + prefix + '-tag-suggest"></div></div>';
  }

  function wireTagEditor(prefix, state) {
    var pillsEl = root.querySelector("#" + prefix + "-tag-pills");
    var input = root.querySelector("#" + prefix + "-tag-input");
    var suggest = root.querySelector("#" + prefix + "-tag-suggest");
    if (!pillsEl || !input) return;
    function paintPills() {
      pillsEl.innerHTML = state.tags.map(function (tag, i) {
        return '<span class="forum-tag chosen">#' + esc(tag) + '<button type="button" class="forum-tag-x" data-untag="' + i + '" aria-label="Remove tag">\u00D7</button></span>';
      }).join("");
      pillsEl.querySelectorAll("[data-untag]").forEach(function (b) {
        b.addEventListener("click", function () {
          state.tags.splice(parseInt(b.getAttribute("data-untag"), 10), 1);
          paintPills();
        });
      });
      input.style.display = state.tags.length >= 5 ? "none" : "";
    }
    function hideSuggest() { if (suggest) { suggest.classList.add("hidden"); suggest.innerHTML = ""; } }
    function showSuggest() {
      if (!suggest) return;
      var q = normTagClient(input.value);
      if (!q || !allTagsCache) { hideSuggest(); return; }
      var matches = allTagsCache.filter(function (name) {
        return name.indexOf(q) === 0 && state.tags.indexOf(name) === -1;
      }).slice(0, 6);
      if (!matches.length) { hideSuggest(); return; }
      suggest.innerHTML = matches.map(function (name) {
        return '<button type="button" class="forum-tag-sug" data-sug="' + esc(name) + '">#' + esc(name) + "</button>";
      }).join("");
      suggest.classList.remove("hidden");
      suggest.querySelectorAll("[data-sug]").forEach(function (b) {
        b.addEventListener("mousedown", function (e) {
          e.preventDefault();
          addTag(b.getAttribute("data-sug"));
        });
      });
    }
    function addTag(raw) {
      var tag = normTagClient(raw);
      if (!tag) return;
      if (state.tags.length >= 5) { alert("Max 5 tags"); return; }
      if (state.tags.indexOf(tag) === -1) state.tags.push(tag);
      input.value = "";
      hideSuggest();
      paintPills();
    }
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(input.value); }
      else if (e.key === "Backspace" && !input.value && state.tags.length) { state.tags.pop(); paintPills(); }
    });
    input.addEventListener("input", showSuggest);
    input.addEventListener("blur", function () { setTimeout(hideSuggest, 150); });
    if (!allTagsCache) {
      api("/api/forum/tags").then(function (r) {
        if (r && r.ok) allTagsCache = r.tags.map(function (t) { return t.name; });
      }).catch(function () {});
    }
    paintPills();
  }

  function renderEdit() {
    destroyEditEditor();
    if (replyEditor) { try { replyEditor.destroy(); } catch (e) {} replyEditor = null; }
    var t = cache.thread;
    if (!t) { renderList(); return; }
    view.name = "edit";
    editThumbId = t.thumb || null;
    editTagState = { tags: (t.tags || []).slice() };
    var html = forumTopBar() +
      '<div class="forum-head">' +
      '<button type="button" class="forum-back forum-glass-pill" id="forum-edit-back">\u2190 Back</button>' +
      '<h2 class="forum-title">Edit post</h2></div>';
    html += '<div class="forum-form">' +
      '<label class="chat-field"><span>Title</span>' +
      '<input type="text" id="forum-edit-title" maxlength="120" value="' + esc(t.title) + '"></label>' +
      '<div class="forum-field-wrap"><span class="forum-content-label">Tags <span class="forum-optional">(optional, max 5)</span></span>' + tagEditorHTML("forum-edit") + "</div>" +
      '<div class="forum-field-wrap"><span class="forum-content-label">Content</span>' +
      '<div class="forum-editor" id="forum-edit-editor">' + toolbarHTML({ embed: true, member: canPostEmbed(), lock: true }) + '<div class="forum-editor-mount"></div></div></div>' +
      '<div class="forum-field-wrap"><span class="forum-content-label">Thumbnail <span class="forum-optional">(optional)</span></span>' +
      '<div class="forum-thumb-row">' +
      '<span class="forum-thumb-preview" id="forum-ethumb-preview">' + (t.thumb ? '<img src="' + API + "/api/media/" + esc(t.thumb) + '" alt="">' : "") + '</span>' +
      '<button type="button" class="forum-admin-btn" id="forum-ethumb-add">' + (t.thumb ? "Change thumbnail" : "Add thumbnail") + '</button>' +
      '<button type="button" class="forum-admin-btn forum-admin-del' + (t.thumb ? "" : " hidden") + '" id="forum-ethumb-remove">Remove</button>' +
      '<input type="file" id="forum-ethumb-input" accept="image/*" class="hidden">' +
      "</div></div>" +
      '<div class="forum-edit-actions">' +
      '<button type="button" class="btn" id="forum-edit-cancel">Cancel</button>' +
      '<button type="button" class="btn accent" id="forum-edit-save">Save changes</button></div></div>';
    root.innerHTML = html;
    window.scrollTo(0, 0);
    if (window.MPScroll) MPScroll.pinTop(1500);
    wireAvatars();
    wireTagEditor("forum-edit", editTagState);
    var rerender = function () { view.name = "thread"; renderThread(); };
    root.querySelector("#forum-edit-back").addEventListener("click", rerender);
    root.querySelector("#forum-edit-cancel").addEventListener("click", rerender);
    var editMount = root.querySelector("#forum-edit-editor");
    if (editMount) {
      var editSplit = splitPostEmbeds(t.rich ? t.content : plainToHTML(t.content));
      editMount._postEmbeds = editSplit.embeds;
      wirePostEmbeds(editMount);
      createEditor(editMount, "Edit your post\u2026", editSplit.html).then(function (ed) {
        if (ed) { editEditor = ed; return; }
        var wrap = document.createElement("div");
        wrap.innerHTML = '<textarea id="forum-edit-content" rows="6" maxlength="5000">' + esc(t.rich ? String(t.content).replace(/<[^>]*>/g, " ") : t.content) + "</textarea>";
        editMount.replaceWith(wrap.firstChild);
      });
    }
    var eInput = root.querySelector("#forum-ethumb-input");
    var ePreview = root.querySelector("#forum-ethumb-preview");
    var eAdd = root.querySelector("#forum-ethumb-add");
    var eRemove = root.querySelector("#forum-ethumb-remove");
    if (eAdd) eAdd.addEventListener("click", function () { if (eInput) eInput.click(); });
    if (eRemove) eRemove.addEventListener("click", function () {
      editThumbId = null;
      if (ePreview) ePreview.innerHTML = "";
      eRemove.classList.add("hidden");
      if (eAdd) eAdd.textContent = "Add thumbnail";
    });
    if (eInput) eInput.addEventListener("change", function () {
      var file = eInput.files && eInput.files[0];
      if (!file) return;
      if (eAdd) { eAdd.disabled = true; eAdd.textContent = "Uploading\u2026"; }
      cropSquareDataUrl(file).then(function (dataUrl) {
        return api("/api/media", { method: "POST", body: { dataUrl: dataUrl, kind: "image" } });
      }).then(function (r) {
        if (eAdd) { eAdd.disabled = false; eAdd.textContent = "Change thumbnail"; }
        if (r && r.ok && r.id) {
          editThumbId = r.id;
          if (ePreview) ePreview.innerHTML = '<img src="' + API + "/api/media/" + r.id + '" alt="">';
          if (eRemove) eRemove.classList.remove("hidden");
        } else {
          alert("Thumbnail upload failed");
        }
      }).catch(function () {
        if (eAdd) { eAdd.disabled = false; eAdd.textContent = "Change thumbnail"; }
        alert("Thumbnail upload failed");
      });
    });
    root.querySelector("#forum-edit-save").addEventListener("click", function () {
      var title = root.querySelector("#forum-edit-title").value.trim();
      var content = "", rich = false;
      if (editEditor) {
        if (!editEditor.isEmpty) { content = appendPostEmbeds(editEditor.getHTML(), editMount._postEmbeds); rich = true; }
      } else {
        var cta = root.querySelector("#forum-edit-content");
        content = cta ? cta.value.trim() : "";
      }
      if (!title || !content) { alert("Title and content required"); return; }
      api("/api/forum/thread/" + encodeURIComponent(t.id), {
        method: "PUT", body: { title: title, content: content, rich: rich, thumb: editThumbId, tags: editTagState.tags }
      }).then(function (res) {
        if (res.ok) { destroyEditEditor(); view.name = "thread"; renderThread(); }
        else { alert(res.error || "Failed to save"); }
      });
    });
  }

  function renderNew() {
    destroyEditEditor();
    var html = forumTopBar() +
      '<div class="forum-head">' +
      '<button type="button" class="forum-back forum-glass-pill" id="forum-back">\u2190 Back</button>' +
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
      '<div class="forum-field-wrap"><span class="forum-content-label">Tags <span class="forum-optional">(optional, max 5)</span></span>' + tagEditorHTML("forum-new") + "</div>" +
      '<div class="forum-field-wrap"><span class="forum-content-label">Content</span>' +
      '<div class="forum-editor" id="forum-new-editor">' + toolbarHTML({ embed: true, member: canPostEmbed(), lock: true }) + '<div class="forum-editor-mount"></div></div></div>' +
      '<div class="forum-field-wrap"><span class="forum-content-label">Thumbnail <span class="forum-optional">(optional)</span></span>' +
      '<div class="forum-thumb-row">' +
      '<span class="forum-thumb-preview" id="forum-thumb-preview"></span>' +
      '<button type="button" class="forum-admin-btn" id="forum-thumb-add">Add thumbnail</button>' +
      '<button type="button" class="forum-admin-btn forum-admin-del hidden" id="forum-thumb-remove">Remove</button>' +
      '<input type="file" id="forum-thumb-input" accept="image/*" class="hidden">' +
      "</div></div>" +
      '<div class="forum-field-wrap"><span class="forum-content-label">Poll <span class="forum-optional">(optional)</span></span>' +
      '<button type="button" class="forum-admin-btn" id="forum-poll-toggle">Add poll</button>' +
      '<div id="forum-poll-form" class="hidden" style="margin-top:10px;">' +
      '<input type="text" id="forum-poll-q" maxlength="200" placeholder="Poll question" class="forum-poll-input">' +
      '<div id="forum-poll-opts"></div>' +
      '<button type="button" class="forum-admin-btn" id="forum-poll-add-opt">+ Add option</button>' +
      "</div></div>" +
      '<button type="button" class="btn accent" id="forum-post">Post thread</button></div>';

    root.innerHTML = html;
    window.scrollTo(0, 0);
    if (window.MPScroll) MPScroll.pinTop(2000);
    wireAvatars();
    var nbTop2 = root.querySelector("#forum-new-top");
    if (nbTop2) nbTop2.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: "smooth" }); });
    root.querySelector("#forum-back").addEventListener("click", backToList);
    var newMount = root.querySelector("#forum-new-editor");
    wirePostEmbeds(newMount);
    if (newMount) {
      if (newEditor) { try { newEditor.destroy(); } catch (e) {} newEditor = null; }
      createEditor(newMount, "Say it\u2026").then(function (ed) {
        if (ed) { newEditor = ed; return; }
        var wrap = document.createElement("div");
        wrap.innerHTML = '<textarea id="forum-content" rows="6" maxlength="5000" placeholder="Say it\u2026"></textarea>';
        newMount.replaceWith(wrap.firstChild);
      });
    }
    // Thumbnail picker: square-crop, upload immediately, keep the media id
    newThumbId = null;
    newTagState = { tags: [] };
    wireTagEditor("forum-new", newTagState);
    var thumbInput = root.querySelector("#forum-thumb-input");
    var thumbPreview = root.querySelector("#forum-thumb-preview");
    var thumbAdd = root.querySelector("#forum-thumb-add");
    var thumbRemove = root.querySelector("#forum-thumb-remove");
    if (thumbAdd) thumbAdd.addEventListener("click", function () { if (thumbInput) thumbInput.click(); });
    if (thumbRemove) thumbRemove.addEventListener("click", function () {
      newThumbId = null;
      if (thumbPreview) thumbPreview.innerHTML = "";
      thumbRemove.classList.add("hidden");
      if (thumbAdd) thumbAdd.textContent = "Add thumbnail";
    });
    if (thumbInput) thumbInput.addEventListener("change", function () {
      var file = thumbInput.files && thumbInput.files[0];
      if (!file) return;
      if (thumbAdd) { thumbAdd.disabled = true; thumbAdd.textContent = "Uploading\u2026"; }
      cropSquareDataUrl(file).then(function (dataUrl) {
        return api("/api/media", { method: "POST", body: { dataUrl: dataUrl, kind: "image" } });
      }).then(function (r) {
        if (thumbAdd) { thumbAdd.disabled = false; thumbAdd.textContent = "Change thumbnail"; }
        if (r && r.ok && r.id) {
          newThumbId = r.id;
          if (thumbPreview) thumbPreview.innerHTML = '<img src="' + API + "/api/media/" + r.id + '" alt="">';
          if (thumbRemove) thumbRemove.classList.remove("hidden");
        } else {
          alert("Thumbnail upload failed");
        }
      }).catch(function () {
        if (thumbAdd) { thumbAdd.disabled = false; thumbAdd.textContent = "Add thumbnail"; }
        alert("Thumbnail upload failed");
      });
    });
    // Poll form handlers
    var pollToggle = root.querySelector("#forum-poll-toggle");
    var pollForm = root.querySelector("#forum-poll-form");
    var pollOpts = root.querySelector("#forum-poll-opts");
    function addPollOpt(val) {
      if (pollOpts.children.length >= 6) return;
      var inp = document.createElement("input");
      inp.type = "text";
      inp.maxLength = 80;
      inp.placeholder = "Option " + (pollOpts.children.length + 1);
      inp.value = val || "";
      inp.className = "forum-poll-input";
      pollOpts.appendChild(inp);
    }
    if (pollToggle) pollToggle.addEventListener("click", function () {
      pollForm.classList.toggle("hidden");
      if (!pollForm.classList.contains("hidden") && pollOpts.children.length === 0) {
        addPollOpt(); addPollOpt();
      }
      pollToggle.textContent = pollForm.classList.contains("hidden") ? "Add poll" : "Remove poll";
    });
    var pollAddOpt = root.querySelector("#forum-poll-add-opt");
    if (pollAddOpt) pollAddOpt.addEventListener("click", function () { addPollOpt(); });

    root.querySelector("#forum-post").addEventListener("click", function () {
      var title = root.querySelector("#forum-title").value.trim();
      var content = "", rich = false;
      if (newEditor) {
        if (!newEditor.isEmpty) { content = appendPostEmbeds(newEditor.getHTML(), newMount._postEmbeds); rich = true; }
      } else {
        var cta = root.querySelector("#forum-content");
        content = cta ? cta.value.trim() : "";
      }
      var cat = root.querySelector("#forum-cat-sel").value;
      if (!title || !content) { alert("Title and content required"); return; }
      // Collect poll data
      var pollData = null;
      var pq = root.querySelector("#forum-poll-q");
      if (pq && !root.querySelector("#forum-poll-form").classList.contains("hidden")) {
        var q = pq.value.trim();
        var opts = [];
        pollOpts.querySelectorAll("input").forEach(function (inp) {
          var v = inp.value.trim();
          if (v) opts.push(v);
        });
        if (q && opts.length >= 2) pollData = { question: q, options: opts };
      }
      api("/api/forum/threads", {
        method: "POST", body: { title: title, content: content, category: cat, rich: rich, thumb: newThumbId || undefined, tags: newTagState.tags, poll: pollData }
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
    // Paint instantly from cache so the top bar swaps in the same frame
    // as the view switch; fresh data repaints when it lands.
    if (cache.threads.length || cache.categories.length) {
      if (view.name === "list") renderList();
    }
    api("/api/forum/categories").then(function (res) {
      cache.categories = (res.ok && res.categories) || [];
      return api("/api/forum/threads");
    }).then(function (res) {
      var fresh = (res.ok && res.threads) || [];
      // Skip re-render if data is unchanged (avoids visual glitch)
      var same = fresh.length === cache.threads.length &&
        fresh.every(function (t, i) { return t.id === cache.threads[i].id && t.updatedAt === cache.threads[i].updatedAt; });
      cache.threads = fresh;
      if (same) return;
      if (view.name === "thread" && view.threadId) renderThread();
      else if (view.name === "new") renderNew();
      else renderList();
    }).catch(function () {
      if (!cache.threads.length) root.innerHTML = '<div class="forum-empty">Couldn\u2019t load the forum.</div>';
    });
  }

  function goHome() {
    view.name = "list";
    view.threadId = null;
    view.replyTo = null;
    paintedThreadId = null;
    function toTop() {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      var p = document.getElementById("forum");
      if (p) p.scrollTop = 0;
      var r = document.getElementById("forum-root");
      if (r) r.scrollTop = 0;
    }
    toTop();
    render();
    requestAnimationFrame(toTop);
    setTimeout(toTop, 100);
    setTimeout(toTop, 500);
  }

  function openThread(id) {
    if (!id) return;
    view.name = "thread";
    view.threadId = id;
    render();
  }

  window.MPForum = { render: render, goHome: goHome, openThread: openThread };
})();
