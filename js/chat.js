/* MISERY community chat — accounts, live messages, points.
   Backend: Cloudflare Worker (CHAT_API). Renders inside the #journal panel. */
(function () {
  "use strict";

  var CHAT_API = "https://misery-chat.freeglory416.workers.dev";
  var X_CLIENT_ID = "Rkc1RmlJQWwtdFJTOVhudlczanc6MTpjaQ";
  var X_REDIRECT_URI = "https://misery-chat.freeglory416.workers.dev/api/x/callback";
  var X_LOGO = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>';
  var TOKEN_KEY = "chat_token";
  var DEVICE_KEY = "chat_device";
  function deviceId() {
    try {
      var d = localStorage.getItem(DEVICE_KEY);
      if (!d) { d = "d-" + Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem(DEVICE_KEY, d); }
      return d;
    } catch (e) { return ""; }
  }
  function avatarImgURL(username, v) {
    return CHAT_API + "/api/avatarimg/" + encodeURIComponent(username) + "?v=" + (v || 0);
  }
  var AVATAR_EMOJIS = ["\uD83D\uDE00", "\uD83D\uDE0E", "\uD83D\uDD25", "\uD83D\uDC80",
    "\uD83C\uDF19", "\u2B50", "\uD83C\uDFAD", "\uD83D\uDC7B",
    "\uD83D\uDC3A", "\uD83E\uDD81", "\uD83C\uDF0A", "\u26A1", "\uD83C\uDF52", "\uD83D\uDC8E"];

  var root = null;
  var me = null;
  var token = null;
  var seen = {};
  var lastTs = 0;
  var ws = null;
  var wsFails = 0;
  var reconnectTimer = null;
  var pingTimer = null;
  var pollTimer = null;
  var polling = false;

  /* ---------- helpers ---------- */

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

  function api(path, opts) {
    opts = opts || {};
    var headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = "Bearer " + token;
    return fetch(CHAT_API + path, {
      method: opts.method || "GET",
      headers: headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined
    }).then(function (r) { return r.json(); });
  }

  /* Verified seal — same artwork as comments (theme colors come from CSS). */
  var SEAL_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true">' +
    '<path class="seal" d="M22.1 12.0L21.7 12.9L21.0 13.6L20.3 14.2L20.0 14.9L20.1 15.8L20.4 16.8L20.2 17.8L19.6 18.3L18.5 18.5L17.6 18.6L16.9 18.9L16.4 19.7L16.0 20.6L15.4 21.4L14.6 21.6L13.6 21.2L12.8 20.7L12.0 20.4L11.2 20.7L10.4 21.2L9.4 21.6L8.6 21.4L8.0 20.6L7.6 19.7L7.1 18.9L6.4 18.6L5.5 18.5L4.4 18.3L3.8 17.8L3.6 16.8L3.9 15.8L4.0 14.9L3.7 14.2L3.0 13.6L2.3 12.9L1.9 12.0L2.3 11.1L3.0 10.4L3.7 9.8L4.0 9.1L3.9 8.2L3.6 7.2L3.8 6.2L4.4 5.7L5.5 5.5L6.4 5.4L7.1 5.1L7.6 4.3L8.0 3.4L8.6 2.6L9.4 2.4L10.4 2.8L11.2 3.3L12.0 3.6L12.8 3.3L13.6 2.8L14.6 2.4L15.4 2.6L16.0 3.4L16.4 4.3L16.9 5.1L17.6 5.4L18.5 5.5L19.6 5.7L20.2 6.2L20.4 7.2L20.1 8.2L20.0 9.1L20.3 9.8L21.0 10.4L21.7 11.1Z"/>' +
    '<path class="vcheck" d="M8.5 12.3l2.1 2 4.9-5.2" fill="none" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>' +
    "</svg>";

  function sealHTML() {
    return '<span class="chat-verified" title="Verified" aria-label="Verified">' + SEAL_SVG + "</span>";
  }

  /* Badges: "verified" = seal, "100" = \u{1F4AF}, "heart" = theme-adaptive heart. */
  function badgeHTML(badge) {
    if (badge === "100") return '<span class="chat-badge" title="100" aria-label="100 badge">\u{1F4AF}</span>';
    if (badge === "heart") return '<span class="chat-badge" title="" aria-label="Heart badge"><span class="b-dark">\u{1F90D}</span><span class="b-light">\u{1F5A4}</span></span>';
    return sealHTML();
  }
  var userBadges = {};
  function effectiveActive(u) {
    if (!u) return null;
    return u.activeBadge || (u.verified ? "verified" : null);
  }
  function badgeFor(u) {
    var b = effectiveActive(u);
    return b ? badgeHTML(b) : "";
  }
  function msgBadge(m) {
    var b = (m.user && userBadges[m.user]) || m.badge || (m.verified ? "verified" : null);
    return b ? badgeHTML(b) : "";
  }
  function refreshRowBadge(row, username) {
    var wrap = row.querySelector(".chat-avatar-wrap");
    if (!wrap) return;
    var old = wrap.querySelector(".chat-badge, .chat-verified");
    if (old) old.remove();
    var mb = msgBadge({ user: username });
    if (mb) wrap.insertAdjacentHTML("beforeend", mb);
  }

  function avatarNode(username, avatar, size, imgV) {
    var wrap = document.createElement("span");
    wrap.className = "chat-avatar-wrap";
    if (imgV !== undefined && imgV !== null) {
      var im = document.createElement("img");
      im.className = "chat-avatar-img" + (size ? " " + size : "");
      im.alt = "";
      im.src = avatarImgURL(username, imgV);
      wrap.appendChild(im);
    } else {
      var a = document.createElement("span");
      a.className = "chat-avatar" + (size ? " " + size : "");
      a.textContent = avatar || (username || "?").charAt(0).toUpperCase();
      wrap.appendChild(a);
    }
    return wrap;
  }
  function myImgV() { return (me && me.hasAvatarImg) ? me.avatarV : undefined; }

  function openUserSheet(username) {
    if (!username) return;
    api("/api/user/" + encodeURIComponent(username)).then(function (r) {
      if (!r || !r.ok || !r.user) return;
      var u = r.user;
      closeProfile();
      var back = document.createElement("div");
      back.className = "chat-sheet-backdrop";
      var sheet = document.createElement("div");
      sheet.className = "chat-sheet chat-user-sheet";
      sheet.setAttribute("role", "dialog");
      sheet.setAttribute("aria-label", "User profile");
      var x = document.createElement("button");
      x.type = "button";
      x.className = "chat-sheet-x";
      x.setAttribute("aria-label", "Close");
      x.textContent = "\u00D7";
      x.addEventListener("click", closeProfile);
      sheet.appendChild(x);
      var bigHold = document.createElement("div");
      bigHold.className = "chat-sheet-big";
      var bigWrap = avatarNode(u.username, u.avatar, "lg", u.hasAvatarImg ? u.avatarV : undefined);
      var ub = badgeFor(u); if (ub) bigWrap.insertAdjacentHTML("beforeend", ub);
      bigHold.appendChild(bigWrap);
      sheet.appendChild(bigHold);
      var nm = document.createElement("div");
      nm.className = "chat-user-name";
      nm.textContent = u.username;
      sheet.appendChild(nm);
      var pts = document.createElement("div");
      pts.className = "chat-sheet-points";
      pts.innerHTML = '<span aria-hidden="true">\u2605</span> <span>' + esc(u.points || 0) + "</span> points";
      sheet.appendChild(pts);
      if (u.createdAt) {
        var jd = document.createElement("div");
        jd.className = "chat-user-joined";
        jd.textContent = "Joined " + new Date(u.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
        sheet.appendChild(jd);
      }
      if (u.bio) {
        var bv = document.createElement("div");
        bv.className = "chat-bio-view";
        bv.textContent = u.bio;
        sheet.appendChild(bv);
      }
      var adminView = !!(me && me.owner && u.username !== me.username);
      if (!adminView && u.badges && u.badges.length) {
        var vTitle = document.createElement("div");
        vTitle.className = "chat-pw-title";
        vTitle.textContent = "Badges";
        sheet.appendChild(vTitle);
        var vRow = document.createElement("div");
        vRow.className = "chat-badge-row";
        u.badges.forEach(function (bid) {
          var vb = document.createElement("span");
          vb.className = "chat-badge-opt" + ((u.activeBadge || null) === bid ? " on" : "");
          vb.innerHTML = badgeHTML(bid);
          vRow.appendChild(vb);
        });
        sheet.appendChild(vRow);
      }
      if (adminView) {
        var gTitle = document.createElement("div");
        gTitle.className = "chat-pw-title";
        gTitle.textContent = "Badges";
        sheet.appendChild(gTitle);
        var gRow = document.createElement("div");
        gRow.className = "chat-badge-row";
        ["100", "heart"].forEach(function (bid) {
          var gb = document.createElement("button");
          gb.type = "button";
          gb.className = "chat-badge-opt" + ((u.activeBadge || null) === bid ? " on" : "");
          gb.innerHTML = badgeHTML(bid);
          gb.setAttribute("aria-label", "Give " + bid + " badge to " + u.username);
          gb.addEventListener("click", function () {
            gb.disabled = true;
            api("/api/badge", { method: "POST", body: { username: u.username, badge: bid } })
              .then(function (r) {
                gb.disabled = false;
                if (r && r.ok && r.user) {
                  u = r.user;
                  gRow.querySelectorAll(".chat-badge-opt").forEach(function (n) {
                    n.classList.toggle("on", n === gb);
                  });
                  var hw = bigHold.querySelector(".chat-avatar-wrap");
                  if (hw) {
                    var fr2 = avatarNode(u.username, u.avatar, "lg", u.hasAvatarImg ? u.avatarV : undefined);
                    var nb2 = badgeFor(u);
                    if (nb2) fr2.insertAdjacentHTML("beforeend", nb2);
                    hw.parentNode.replaceChild(fr2, hw);
                  }
                }
              }).catch(function () { gb.disabled = false; });
          });
          gRow.appendChild(gb);
        });
        sheet.appendChild(gRow);
        var banBtn = document.createElement("button");
        banBtn.type = "button";
        banBtn.className = "btn chat-banbtn" + (u.banned ? " on" : "");
        banBtn.textContent = u.banned ? "Unban" : "Ban";
        banBtn.addEventListener("click", function () {
          banBtn.disabled = true;
          api("/api/ban", { method: "POST", body: { username: u.username, banned: !u.banned } })
            .then(function (r) {
              banBtn.disabled = false;
              if (r && r.ok) {
                u.banned = r.banned;
                banBtn.textContent = u.banned ? "Unban" : "Ban";
                banBtn.classList.toggle("on", u.banned);
              }
            }).catch(function () { banBtn.disabled = false; });
        });
        sheet.appendChild(banBtn);
      }
      back.appendChild(sheet);
      back.addEventListener("click", function (e) { if (e.target === back) closeProfile(); });
      document.body.appendChild(back);
    }).catch(function () {});
  }

  function makeAvatarClickable(wrap, username) {
    wrap.classList.add("chat-avatar-click");
    wrap.setAttribute("role", "button");
    wrap.setAttribute("tabindex", "0");
    wrap.setAttribute("aria-label", "View " + username + "'s profile");
    var go = function (e) { if (e) e.stopPropagation(); openUserSheet(username); };
    wrap.addEventListener("click", go);
    wrap.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(e); } });
  }

  function setPoints(n) {
    var b = root.querySelector(".chat-points-num");
    if (b) b.textContent = n;
  }

  function refreshMe() {
    api("/api/me").then(function (r) {
      if (r && r.user) {
        me = r.user;
        setPoints(me.points || 0);
      }
    }).catch(function () {});
  }

  function refreshMeBadge(meBtn) {
    if (!meBtn) return;
    var w = meBtn.querySelector(".chat-avatar-wrap");
    if (!w) return;
    var b = badgeFor(me);
    if (b) w.insertAdjacentHTML("beforeend", b);
  }

  /* ---------- auth view ---------- */

  function renderAuth() {
    stopAll();
    me = null;
    root.innerHTML =
      '<div class="chat-auth"><div class="chat-card">' +
      '<div class="chat-tabs">' +
      '<button type="button" class="on" data-tab="login">Log in</button>' +
      '<button type="button" data-tab="register">Sign up</button>' +
      "</div>" +
      '<label class="chat-field"><span>Username</span>' +
      '<input type="text" name="username" maxlength="16" autocomplete="username" autocapitalize="none" spellcheck="false"></label>' +
      '<label class="chat-field"><span>Password</span>' +
      '<input type="password" name="password" maxlength="72" autocomplete="current-password"></label>' +
      '<label class="chat-field chat-secret hidden"><span>Owner secret</span>' +
      '<input type="password" name="secret" autocomplete="off"></label>' +
      '<div class="chat-err" role="alert"></div>' +
      '<button type="button" class="btn accent chat-submit">Log in</button>' +
      '<button type="button" class="btn chat-xbtn"><span class="chat-xlogo">' + X_LOGO + "</span>Continue with X</button>" +
      "</div></div>";

    var mode = "login";
    var errBox = root.querySelector(".chat-err");
    var userInput = root.querySelector('input[name="username"]');
    var passInput = root.querySelector('input[name="password"]');
    var secretWrap = root.querySelector(".chat-secret");
    var secretInput = root.querySelector('input[name="secret"]');
    var submit = root.querySelector(".chat-submit");

    function setErr(t) { errBox.textContent = t || ""; }

    function syncSecret() {
      var show = mode === "register" && userInput.value.trim().toLowerCase() === "dc";
      secretWrap.classList.toggle("hidden", !show);
    }

    root.querySelectorAll(".chat-tabs button").forEach(function (b) {
      b.addEventListener("click", function () {
        mode = b.getAttribute("data-tab");
        root.querySelectorAll(".chat-tabs button").forEach(function (x) {
          x.classList.toggle("on", x === b);
        });
        submit.textContent = mode === "login" ? "Log in" : "Sign up";
        setErr("");
        syncSecret();
      });
    });
    userInput.addEventListener("input", syncSecret);

    function submitAuth() {
      var username = userInput.value.trim();
      var password = passInput.value;
      setErr("");
      if (!/^[a-zA-Z0-9_]{3,16}$/.test(username) && username.toLowerCase() !== "l") {
        setErr("Username must be 3\u201316 characters: letters, numbers, _");
        return;
      }
      if (!password || password.length < 4) {
        setErr("Password must be at least 4 characters.");
        return;
      }
      var body = { username: username, password: password };
      if (mode === "register") {
        body.deviceId = deviceId();
        if (username.toLowerCase() === "dc") body.secret = secretInput.value;
      }
      submit.disabled = true;
      api(mode === "login" ? "/api/login" : "/api/register", { method: "POST", body: body })
        .then(function (r) {
          submit.disabled = false;
          if (r && r.ok) {
            token = r.token;
            try { localStorage.setItem(TOKEN_KEY, token); } catch (e) {}
            me = r.user;
            renderChat();
          } else {
            setErr((r && r.error) || "Something went wrong.");
          }
        })
        .catch(function () {
          submit.disabled = false;
          setErr("Couldn't reach the chat server. Try again.");
        });
    }
    submit.addEventListener("click", submitAuth);
    var xBtn = root.querySelector(".chat-xbtn");
    if (xBtn) xBtn.addEventListener("click", function () {
      var rnd = Math.random().toString(36).slice(2) + Date.now().toString(36);
      try { sessionStorage.setItem("x_state", rnd); } catch (e) {}
      var state = rnd + "." + deviceId();
      var url = "https://x.com/i/oauth2/authorize" +
        "?response_type=code" +
        "&client_id=" + encodeURIComponent(X_CLIENT_ID) +
        "&redirect_uri=" + encodeURIComponent(X_REDIRECT_URI) +
        "&scope=" + encodeURIComponent("users.read tweet.read") +
        "&state=" + encodeURIComponent(state);
      location.href = url;
    });
    passInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") submitAuth();
    });
    userInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); passInput.focus(); }
    });
  }

  /* ---------- chat view ---------- */

  function renderChat() {
    stopAll();
    seen = {};
    lastTs = 0;
    root.innerHTML =
      '<div class="chat-head">' +
      '<div class="chat-title">Chat</div>' +
      '<div class="chat-head-right">' +
      '<span class="chat-points" title="Your points"><span class="chat-star" aria-hidden="true">\u2605</span> <span class="chat-points-num">0</span></span>' +
      '<button type="button" class="chat-me" aria-label="Profile"></button>' +
      "</div></div>" +
      '<div class="chat-msgs" aria-live="polite"></div>' +
      '<div class="chat-attach" hidden></div>' +
      '<div class="chat-inputrow">' +
      '<button type="button" class="chat-plus" aria-label="Add photo or video">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>' +
      "</button>" +
      '<form class="chat-inputbar">' +
      '<input type="text" maxlength="500" placeholder="Message" autocomplete="off" aria-label="Message">' +
      '<button type="submit" class="chat-send" aria-label="Send">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5"/><path d="M5 12l7-7 7 7"/></svg>' +
      "</button></form></div>" +
      '<input type="file" class="chat-file" accept="image/*,video/*" hidden>';

    var meBtn = root.querySelector(".chat-me");
    meBtn.appendChild(avatarNode(me.username, me.avatar, "sm", myImgV()));
    refreshMeBadge(meBtn);
    setPoints(me.points || 0);

    meBtn.addEventListener("click", openProfile);

    var form = root.querySelector(".chat-inputbar");
    var input = form.querySelector("input");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var text = input.value.trim();
      if (!text && !attachMedia) return;
      input.value = "";
      var media = attachMedia;
      attachMedia = null;
      renderAttach();
      var sendBtn = form.querySelector(".chat-send");
      if (sendBtn) {
        sendBtn.classList.remove("pop");
        void sendBtn.offsetWidth;
        sendBtn.classList.add("pop");
      }
      send(text, media);
    });

    var attachMedia = null;
    var attachBox = root.querySelector(".chat-attach");
    var fileInput = root.querySelector(".chat-file");
    var plusBtn = root.querySelector(".chat-plus");
    function renderAttach() {
      attachBox.innerHTML = "";
      if (!attachMedia) { attachBox.hidden = true; return; }
      attachBox.hidden = false;
      if (attachMedia.uploading) {
        var sp = document.createElement("span");
        sp.className = "lg-spin";
        sp.setAttribute("aria-label", "Uploading");
        attachBox.appendChild(sp);
        return;
      }
      var th;
      if (attachMedia.kind === "video") {
        th = document.createElement("span");
        th.className = "chat-attach-vid";
        th.textContent = "\u25B6";
      } else {
        th = document.createElement("img");
        th.src = CHAT_API + "/api/media/" + attachMedia.id;
        th.alt = "";
      }
      attachBox.appendChild(th);
      var x = document.createElement("button");
      x.type = "button";
      x.className = "chat-attach-x";
      x.setAttribute("aria-label", "Remove attachment");
      x.textContent = "\u00D7";
      x.addEventListener("click", function () { attachMedia = null; renderAttach(); });
      attachBox.appendChild(x);
    }
    function attachError(msg) {
      attachMedia = null;
      attachBox.hidden = false;
      attachBox.innerHTML = '<span class="chat-attach-err">' + esc(msg) + "</span>";
      setTimeout(function () { if (!attachMedia) attachBox.hidden = true; }, 2500);
    }
    function uploadAttach(dataUrl, kind) {
      attachMedia = { uploading: true, kind: kind };
      renderAttach();
      api("/api/media", { method: "POST", body: { dataUrl: dataUrl, kind: kind } })
        .then(function (r) {
          if (r && r.ok) {
            attachMedia = { id: r.id, kind: r.kind };
            renderAttach();
          } else {
            attachError((r && r.error) || "Couldn't upload.");
          }
        })
        .catch(function () { attachError("Couldn't reach the chat server."); });
    }
    function compressAndUpload(f) {
      var url = URL.createObjectURL(f);
      var im = new Image();
      im.onload = function () {
        var max = 1600, w = im.width, h = im.height;
        if (Math.max(w, h) > max) {
          var s = max / Math.max(w, h);
          w = Math.round(w * s); h = Math.round(h * s);
        }
        var c = document.createElement("canvas");
        c.width = w; c.height = h;
        c.getContext("2d").drawImage(im, 0, 0, w, h);
        URL.revokeObjectURL(url);
        uploadAttach(c.toDataURL("image/jpeg", 0.82), "image");
      };
      im.onerror = function () { URL.revokeObjectURL(url); attachError("Couldn't read that photo."); };
      im.src = url;
    }
    if (plusBtn && fileInput) {
      plusBtn.addEventListener("click", function () { fileInput.click(); });
      fileInput.addEventListener("change", function () {
        var f = fileInput.files && fileInput.files[0];
        fileInput.value = "";
        if (!f) return;
        var isVideo = f.type.indexOf("video/") === 0;
        var isGif = f.type === "image/gif";
        if (f.size > 12 * 1024 * 1024) { attachError("That file is too big (12 MB max)."); return; }
        if (isVideo || isGif) {
          var rd = new FileReader();
          rd.onload = function () { uploadAttach(rd.result, isVideo ? "video" : "image"); };
          rd.onerror = function () { attachError("Couldn't read that file."); };
          rd.readAsDataURL(f);
        } else if (f.type.indexOf("image/") === 0) {
          compressAndUpload(f);
        } else {
          attachError("Only photos and videos.");
        }
      });
    }

    api("/api/messages?limit=50").then(function (r) {
      if (r && r.badges) userBadges = r.badges;
      if (r && r.messages) r.messages.forEach(addMessage);
      scrollBottom(true);
      scheduleFade();
    }).catch(function () {});
    connect();
    if (!window.__chatFadeHook) {
      window.__chatFadeHook = true;
      window.addEventListener("scroll", scheduleFade, { passive: true });
      window.addEventListener("resize", scheduleFade);
    }
    scheduleFade();
  }

  function msgsBox() { return root.querySelector(".chat-msgs"); }

  function nearBottom() {
    var h = document.documentElement;
    return h.scrollHeight - window.scrollY - window.innerHeight < 200;
  }

  function scrollBottom(force) {
    if (force || nearBottom()) {
      window.scrollTo(0, document.documentElement.scrollHeight);
      scheduleFade();
    }
  }

  var fadeRaf = 0;
  function updateMsgFade() {
    fadeRaf = 0;
    if (!root) return;
    var vh = window.innerHeight;
    var center = vh * 0.46;
    var fullHalf = 340;   /* ~9 messages fully visible around the focus */
    var fadeHalf = 150;   /* fade zone beyond that */
    var msgs = root.querySelectorAll(".chat-msg");
    for (var i = 0; i < msgs.length; i++) {
      var r = msgs[i].getBoundingClientRect();
      var mc = (r.top + r.bottom) / 2;
      var d = Math.abs(mc - center);
      var o;
      if (d <= fullHalf) o = 1;
      else if (d >= fullHalf + fadeHalf) o = 0;
      else o = 1 - (d - fullHalf) / fadeHalf;
      var so = o.toFixed(2);
      if (msgs[i].getAttribute("data-fade") !== so) {
        msgs[i].setAttribute("data-fade", so);
        msgs[i].style.opacity = so;
        msgs[i].style.pointerEvents = o < 0.2 ? "none" : "";
      }
    }
  }
  function scheduleFade() {
    if (!fadeRaf) fadeRaf = requestAnimationFrame(updateMsgFade);
  }

  function stripUrls(text) {
    return String(text || "").replace(/https?:\/\/[^\s<>"')]+/gi, " ").replace(/\s+/g, " ").trim();
  }

  function linkify(text) {
    var safe = esc(String(text || ""));
    return safe.replace(/https?:\/\/[^\s<>"')]+/gi, function (url) {
      var clean = url.replace(/[.,;:!?]+$/, "");
      var trail = url.slice(clean.length);
      return '<a href="' + clean + '" target="_blank" rel="noopener noreferrer">' + clean + "</a>" + trail;
    });
  }

  function mediaNode(media) {
    if (!media || !media.id || !/^[A-Za-z0-9]+$/.test(media.id)) return null;
    var el;
    if (media.kind === "video") {
      el = document.createElement("video");
      el.src = CHAT_API + "/api/media/" + media.id;
      el.controls = true;
      el.playsInline = true;
      el.preload = "metadata";
    } else {
      el = document.createElement("img");
      el.src = CHAT_API + "/api/media/" + media.id;
      el.loading = "lazy";
      el.alt = "";
    }
    el.className = "chat-media";
    return el;
  }

  function embedNode(embed) {
    if (!embed || !embed.title || !embed.url) return null;
    var a = document.createElement("a");
    a.className = "chat-embed";
    a.href = embed.url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    if (embed.thumb) {
      var im = document.createElement("img");
      im.src = embed.thumb;
      im.loading = "lazy";
      im.alt = "";
      im.referrerPolicy = "no-referrer";
      a.appendChild(im);
    }
    var tx = document.createElement("span");
    tx.className = "chat-embed-tx";
    var t = document.createElement("span");
    t.className = "chat-embed-t";
    t.textContent = embed.title;
    tx.appendChild(t);
    var p = document.createElement("span");
    p.className = "chat-embed-p";
    p.textContent = embed.provider || "";
    tx.appendChild(p);
    a.appendChild(tx);
    return a;
  }

  function faviconBadge(embed) {
    if (!embed || !embed.url) return null;
    var host = "";
    try { host = new URL(embed.url).hostname; } catch (e) { return null; }
    if (!host) return null;
    var s = document.createElement("span");
    s.className = "chat-embed-badge";
    var im = document.createElement("img");
    im.src = "https://www.google.com/s2/favicons?domain=" + encodeURIComponent(host) + "&sz=64";
    im.alt = "";
    im.loading = "lazy";
    im.referrerPolicy = "no-referrer";
    s.appendChild(im);
    return s;
  }

  function addMessage(m) {
    if (!m || !m.id || seen[m.id]) return;
    seen[m.id] = true;
    if (m.ts && m.ts > lastTs) lastTs = m.ts;
    var b = msgsBox();
    if (!b) return;
    var stick = nearBottom();

    var row = document.createElement("div");
    row.className = "chat-msg" + (me && m.user === me.username ? " mine" : "");
    row.setAttribute("data-id", m.id);
    row.setAttribute("data-user", m.user || "");

    if (row.classList.contains("mine")) {
      var bubble = document.createElement("div");
      bubble.className = "chat-bubble" + (m.media ? " chat-bubble-media" : "");
      var mn = mediaNode(m.media);
      if (mn) bubble.appendChild(mn);
      var dt0 = m.embed ? stripUrls(m.text) : m.text;
      if (dt0) {
        var tx0 = document.createElement("div");
        tx0.className = "chat-text";
        tx0.innerHTML = linkify(dt0);
        bubble.appendChild(tx0);
      }
      var eb0 = embedNode(m.embed);
      if (eb0) bubble.appendChild(eb0);
      var fb0 = faviconBadge(m.embed);
      if (fb0) bubble.appendChild(fb0);
      row.appendChild(bubble);
      var myWrap = avatarNode(m.user, m.avatar, "sm", (m.av !== undefined ? m.av : myImgV()));
      var mb1 = msgBadge(m); if (mb1) myWrap.insertAdjacentHTML("beforeend", mb1);
      makeAvatarClickable(myWrap, m.user);
      row.appendChild(myWrap);
    } else {
      var wrap = avatarNode(m.user, m.avatar, null, (m.av !== undefined ? m.av : undefined));
      var mb2 = msgBadge(m); if (mb2) wrap.insertAdjacentHTML("beforeend", mb2);
      makeAvatarClickable(wrap, m.user);
      row.appendChild(wrap);
      var main = document.createElement("div");
      main.className = "chat-msg-main";
      var head = document.createElement("div");
      head.className = "chat-msg-head";
      var name = document.createElement("strong");
      name.textContent = m.user || "?";
      head.appendChild(name);
      var t = document.createElement("span");
      t.className = "chat-time";
      t.textContent = m.ts ? timeAgo(m.ts) : "";
      head.appendChild(t);
      main.appendChild(head);
      var b2 = document.createElement("div");
      b2.className = "chat-bubble" + (m.media ? " chat-bubble-media" : "");
      var mn2 = mediaNode(m.media);
      if (mn2) b2.appendChild(mn2);
      var dt2 = m.embed ? stripUrls(m.text) : m.text;
      if (dt2) {
        var tx2 = document.createElement("div");
        tx2.className = "chat-text";
        tx2.innerHTML = linkify(dt2);
        b2.appendChild(tx2);
      }
      var eb2 = embedNode(m.embed);
      if (eb2) b2.appendChild(eb2);
      var fb2 = faviconBadge(m.embed);
      if (fb2) b2.appendChild(fb2);
      main.appendChild(b2);
      row.appendChild(main);
    }


    b.appendChild(row);
    if (stick) window.scrollTo(0, document.documentElement.scrollHeight);
    scheduleFade();
  }

  function removeMessage(id) {
    delete seen[id];
    var n = root.querySelector('.chat-msg[data-id="' + id + '"]');
    if (n && n.parentNode) n.parentNode.removeChild(n);
  }

  function send(text, media) {
    var payload = { t: "send", text: text };
    if (media) payload.media = media;
    if (ws && ws.readyState === 1) {
      ws.send(JSON.stringify(payload));
    } else {
      api("/api/send", { method: "POST", body: { text: text, media: media || null } })
        .then(function (r) {
          if (r && r.ok) {
            if (r.message) addMessage(r.message);
            if (typeof r.points === "number") setPoints(r.points);
            scrollBottom(true);
          }
        })
        .catch(function () {});
    }
  }

  /* ---------- websocket + polling ---------- */

  function wsURL() {
    return CHAT_API.replace(/^http/, "ws") + "/api/ws" +
      (token ? "?token=" + encodeURIComponent(token) : "");
  }

  function connect() {
    if (ws && (ws.readyState === 0 || ws.readyState === 1)) return;
    try {
      ws = new WebSocket(wsURL());
    } catch (e) {
      onWsDown();
      return;
    }
    ws.onopen = function () {
      wsFails = 0;
      stopPolling();
      clearInterval(pingTimer);
      pingTimer = setInterval(function () {
        if (ws && ws.readyState === 1) ws.send(JSON.stringify({ t: "ping" }));
      }, 25000);
    };
    ws.onmessage = function (ev) {
      var o;
      try { o = JSON.parse(ev.data); } catch (e) { return; }
      if (!o || !o.t) return;
      if (o.t === "hello") {
        if (o.badges) userBadges = o.badges;
        if (o.you) {
          me = o.you;
          setPoints(me.points || 0);
        }
        if (o.messages) o.messages.forEach(addMessage);
        scrollBottom(true);
      } else if (o.t === "badge" && o.user) {
        if (o.badge) userBadges[o.user] = o.badge; else delete userBadges[o.user];
        var sel = '.chat-msg[data-user="' + o.user + '"]';
        root.querySelectorAll(sel).forEach(function (row) { refreshRowBadge(row, o.user); });
      } else if (o.t === "ban" && o.user) {
        if (me && o.user === me.username && o.banned) {
          try { localStorage.removeItem(TOKEN_KEY); } catch (e) {}
          token = null;
          closeProfile();
          renderAuth();
        }
      } else if (o.t === "embed" && o.id && o.embed) {
        var erow = root.querySelector('.chat-msg[data-id="' + o.id + '"] .chat-bubble');
        if (erow && !erow.querySelector(".chat-embed")) {
          var en = embedNode(o.embed);
          if (en) {
            var etx = erow.querySelector(".chat-text");
            if (etx) {
              var stripped = stripUrls(etx.textContent);
              if (stripped) { etx.innerHTML = linkify(stripped); }
              else { etx.parentNode.removeChild(etx); }
            }
            erow.appendChild(en);
            var fbw = faviconBadge(o.embed);
            if (fbw && !erow.querySelector(".chat-embed-badge")) erow.appendChild(fbw);
            scrollBottom(false);
          }
        }
      } else if (o.t === "msg") {
        var wasMine = me && o.m && o.m.user === me.username;
        addMessage(o.m);
        if (wasMine) refreshMe();
      } else if (o.t === "del") {
        removeMessage(o.id);
      }
    };
    ws.onclose = onWsDown;
    ws.onerror = function () { try { ws.close(); } catch (e) {} };
  }

  function onWsDown() {
    clearInterval(pingTimer);
    ws = null;
    wsFails++;
    if (wsFails >= 3 && !polling) startPolling();
    clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(connect, Math.min(1000 * Math.pow(2, wsFails), RECONNECT_MAX));
  }

  function startPolling() {
    if (polling) return;
    polling = true;
    var tick = function () {
      api("/api/messages?since=" + lastTs + "&limit=50")
        .then(function (r) {
          if (r && r.badges) { for (var k in r.badges) userBadges[k] = r.badges[k]; }
          if (r && r.messages && r.messages.length) {
            r.messages.forEach(addMessage);
          }
        })
        .catch(function () {});
    };
    tick();
    pollTimer = setInterval(tick, 3000);
  }

  function stopPolling() {
    polling = false;
    clearInterval(pollTimer);
  }

  function stopAll() {
    clearTimeout(reconnectTimer);
    clearInterval(pingTimer);
    stopPolling();
    if (ws) { try { ws.close(); } catch (e) {} ws = null; }
    wsFails = 0;
  }

  /* ---------- profile sheet ---------- */

  function openProfile() {
    closeProfile();
    var back = document.createElement("div");
    back.className = "chat-sheet-backdrop";
    var sheet = document.createElement("div");
    sheet.className = "chat-sheet";
    sheet.setAttribute("role", "dialog");
    sheet.setAttribute("aria-label", "Profile");

    var x = document.createElement("button");
    x.type = "button";
    x.className = "chat-sheet-x";
    x.setAttribute("aria-label", "Close");
    x.textContent = "\u00D7";
    x.addEventListener("click", closeProfile);
    sheet.appendChild(x);

    var bigWrap = avatarNode(me.username, me.avatar, "lg", myImgV());
    var mb0 = badgeFor(me); if (mb0) bigWrap.insertAdjacentHTML("beforeend", mb0);
    var bigHold = document.createElement("div");
    bigHold.className = "chat-sheet-big";
    bigHold.appendChild(bigWrap);
    sheet.appendChild(bigHold);

    var grid = document.createElement("div");
    grid.className = "chat-emoji-grid";
    var refreshMeAvatar = function () {
      var meBtn = root.querySelector(".chat-me");
      if (meBtn) {
        meBtn.innerHTML = "";
        meBtn.appendChild(avatarNode(me.username, me.avatar, "sm", myImgV()));
        refreshMeBadge(meBtn);
      }
    };
    AVATAR_EMOJIS.forEach(function (em) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "chat-emoji" + (!me.hasAvatarImg && em === (me.avatar || "") ? " on" : "");
      b.textContent = em;
      b.setAttribute("aria-label", "Avatar " + em);
      b.addEventListener("click", function () {
        if (em === me.avatar) return;
        grid.querySelectorAll(".chat-emoji").forEach(function (n) {
          n.classList.toggle("on", n === b);
        });
        var prevAv = me.avatar;
        bigHold.querySelector(".chat-avatar").textContent = em;
        errBox.textContent = "";
        api("/api/profile", { method: "POST", body: { avatar: em } })
          .then(function (r) {
            if (r && r.ok && r.user) {
              me = r.user;
              refreshMeAvatar();
            } else {
              errBox.textContent = (r && r.error) || "Couldn't save.";
              bigHold.querySelector(".chat-avatar").textContent = prevAv || "";
              grid.querySelectorAll(".chat-emoji").forEach(function (n) {
                n.classList.toggle("on", n.textContent === (me.avatar || ""));
              });
            }
          })
          .catch(function () {
            errBox.textContent = "Couldn't reach the chat server.";
            bigHold.querySelector(".chat-avatar").textContent = prevAv || "";
          });
      });
      grid.appendChild(b);
    });
    sheet.appendChild(grid);

    var upBtn = document.createElement("button");
    upBtn.type = "button";
    upBtn.className = "btn chat-upload";
    upBtn.textContent = "Upload photo";
    var fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/*";
    fileInput.style.display = "none";
    upBtn.addEventListener("click", function () { fileInput.click(); });
    fileInput.addEventListener("change", function () {
      var f = fileInput.files && fileInput.files[0];
      if (!f) return;
      var url = URL.createObjectURL(f);
      var im = new Image();
      im.onload = function () {
        var s = 256;
        var c = document.createElement("canvas");
        c.width = s; c.height = s;
        var ctx = c.getContext("2d");
        var side = Math.min(im.width, im.height);
        ctx.drawImage(im, (im.width - side) / 2, (im.height - side) / 2, side, side, 0, 0, s, s);
        URL.revokeObjectURL(url);
        var dataUrl = c.toDataURL("image/jpeg", 0.85);
        errBox.textContent = "";
        upMsg.textContent = "";
        upBtn.disabled = true;
        api("/api/avatar", { method: "POST", body: { image: dataUrl } })
          .then(function (r) {
            upBtn.disabled = false;
            if (r && r.ok) {
              me.hasAvatarImg = true;
              me.avatarV = r.avatarV;
              var holder = bigHold.querySelector(".chat-avatar-wrap");
              if (holder) {
                var fresh = avatarNode(me.username, me.avatar, "lg", myImgV());
                var mb3 = badgeFor(me); if (mb3) fresh.insertAdjacentHTML("beforeend", mb3);
                holder.parentNode.replaceChild(fresh, holder);
              }
              var meBtn = root.querySelector(".chat-me");
              if (meBtn) {
                meBtn.innerHTML = "";
                meBtn.appendChild(avatarNode(me.username, me.avatar, "sm", myImgV()));
                refreshMeBadge(meBtn);
              }
              upMsg.textContent = "Photo updated.";
              grid.querySelectorAll(".chat-emoji").forEach(function (n) { n.classList.remove("on"); });
            } else {
              errBox.textContent = (r && r.error) || "Couldn't upload.";
            }
          })
          .catch(function () {
            upBtn.disabled = false;
            errBox.textContent = "Couldn't reach the chat server.";
          });
      };
      im.onerror = function () { URL.revokeObjectURL(url); errBox.textContent = "Couldn't read that image."; };
      im.src = url;
      fileInput.value = "";
    });
    sheet.appendChild(upBtn);
    var upMsg = document.createElement("div");
    upMsg.className = "chat-upload-msg";
    sheet.appendChild(upMsg);
    sheet.appendChild(fileInput);

    var lab = document.createElement("label");
    lab.className = "chat-field";
    var labT = document.createElement("span");
    labT.textContent = "Username";
    lab.appendChild(labT);
    var nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.maxLength = 16;
    nameInput.autocapitalize = "none";
    nameInput.spellcheck = false;
    nameInput.value = me.username;
    lab.appendChild(nameInput);
    sheet.appendChild(lab);
    var saveUsername = function () {
      var newName = nameInput.value.trim();
      if (newName === me.username) return;
      errBox.textContent = "";
      if (!/^[a-zA-Z0-9_]{3,16}$/.test(newName) && newName.toLowerCase() !== "l") {
        errBox.textContent = "Username must be 3\u201316 characters: letters, numbers, _";
        nameInput.value = me.username;
        return;
      }
      api("/api/profile", { method: "POST", body: { username: newName } })
        .then(function (r) {
          if (r && r.ok && r.user) {
            var oldName = me.username;
            me = r.user;
            refreshMeAvatar();
            if (oldName !== me.username) {
              root.querySelectorAll('.chat-msg[data-user]').forEach(function (n) {
                if (n.getAttribute("data-user") === oldName) {
                  n.setAttribute("data-user", me.username);
                  n.classList.add("mine");
                  var nm = n.querySelector(".chat-msg-head strong");
                  if (nm) nm.textContent = me.username;
                  var av = n.querySelector(".chat-avatar");
                  if (av) av.textContent = me.avatar || me.username.charAt(0).toUpperCase();
                }
              });
            }
          } else {
            errBox.textContent = (r && r.error) || "Couldn't save.";
            nameInput.value = me.username;
          }
        })
        .catch(function () {
          errBox.textContent = "Couldn't reach the chat server.";
          nameInput.value = me.username;
        });
    };
    nameInput.addEventListener("change", saveUsername);
    nameInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); nameInput.blur(); }
    });

    var pts = document.createElement("div");
    pts.className = "chat-sheet-points";
    pts.innerHTML = '<span aria-hidden="true">\u2605</span> <span>' + esc(me.points || 0) + "</span> points";
    sheet.appendChild(pts);

    var myBadges = me.badges || [];
    if (myBadges.length) {
      var bTitle = document.createElement("div");
      bTitle.className = "chat-pw-title";
      bTitle.textContent = "Badges";
      sheet.appendChild(bTitle);
      var bRow = document.createElement("div");
      bRow.className = "chat-badge-row";
      myBadges.map(function (b) { return { id: b }; }).forEach(function (o) {
        var bb = document.createElement("button");
        bb.type = "button";
        bb.setAttribute("data-badge", o.id);
        bb.className = "chat-badge-opt" + (effectiveActive(me) === o.id ? " on" : "");
        bb.innerHTML = badgeHTML(o.id);
        bb.setAttribute("aria-label", "Show " + o.id + " badge");
        bb.addEventListener("click", function () {
          var next = (effectiveActive(me) === o.id) ? null : o.id;
          api("/api/badge", { method: "POST", body: { badge: next } })
            .then(function (r) {
              if (r && r.ok && r.user) {
                me = r.user;
                var now = effectiveActive(me);
                bRow.querySelectorAll(".chat-badge-opt").forEach(function (n) {
                  n.classList.toggle("on", n.getAttribute("data-badge") === now);
                });
                var holder = bigHold.querySelector(".chat-avatar-wrap");
                if (holder) {
                  var fresh = avatarNode(me.username, me.avatar, "lg", myImgV());
                  var nb = badgeFor(me);
                  if (nb) fresh.insertAdjacentHTML("beforeend", nb);
                  holder.parentNode.replaceChild(fresh, holder);
                }
                var meBtn2 = root.querySelector(".chat-me");
                if (meBtn2) {
                  meBtn2.innerHTML = "";
                  meBtn2.appendChild(avatarNode(me.username, me.avatar, "sm", myImgV()));
                  refreshMeBadge(meBtn2);
                }
              }
            }).catch(function () {});
        });
        bRow.appendChild(bb);
      });
      sheet.appendChild(bRow);
    }

    var bioTitle = document.createElement("div");
    bioTitle.className = "chat-pw-title";
    bioTitle.textContent = "Bio";
    sheet.appendChild(bioTitle);
    var bioInput = document.createElement("textarea");
    bioInput.className = "chat-bio";
    bioInput.maxLength = 250;
    bioInput.rows = 3;
    bioInput.placeholder = "Tell the chat a little about yourself\u2026";
    bioInput.value = me.bio || "";
    sheet.appendChild(bioInput);
    var bioCount = document.createElement("div");
    bioCount.className = "chat-bio-count";
    sheet.appendChild(bioCount);
    var updateBioCount = function () {
      bioCount.textContent = bioInput.value.length + "/250";
    };
    bioInput.addEventListener("input", updateBioCount);
    updateBioCount();
    var saveBio = function () {
      var newBio = bioInput.value.trim().slice(0, 250);
      if (newBio === (me.bio || "")) return;
      api("/api/profile", { method: "POST", body: { bio: newBio } })
        .then(function (r) {
          if (r && r.ok && r.user) { me = r.user; }
          else { errBox.textContent = (r && r.error) || "Couldn't save bio."; }
        })
        .catch(function () { errBox.textContent = "Couldn't reach the chat server."; });
    };
    bioInput.addEventListener("blur", saveBio);

    var errBox = document.createElement("div");
    errBox.className = "chat-err";
    errBox.setAttribute("role", "alert");
    sheet.appendChild(errBox);



    var pwTitle = document.createElement("div");
    pwTitle.className = "chat-pw-title";
    pwTitle.textContent = "Change password";
    sheet.appendChild(pwTitle);

    var curLab = document.createElement("label");
    curLab.className = "chat-field";
    var curT = document.createElement("span");
    curT.textContent = "Current password";
    curLab.appendChild(curT);
    var curInput = document.createElement("input");
    curInput.type = "password";
    curInput.autocomplete = "current-password";
    curLab.appendChild(curInput);
    sheet.appendChild(curLab);

    var newLab = document.createElement("label");
    newLab.className = "chat-field";
    var newT = document.createElement("span");
    newT.textContent = "New password";
    newLab.appendChild(newT);
    var newInput = document.createElement("input");
    newInput.type = "password";
    newInput.autocomplete = "new-password";
    newLab.appendChild(newInput);
    sheet.appendChild(newLab);

    var pwBtn = document.createElement("button");
    pwBtn.type = "button";
    pwBtn.className = "btn chat-pw";
    pwBtn.textContent = "Change password";
    pwBtn.addEventListener("click", function () {
      errBox.textContent = "";
      if (!curInput.value || newInput.value.length < 4) {
        errBox.textContent = "Enter your current password and a new one (min 4).";
        return;
      }
      pwBtn.disabled = true;
      api("/api/password", { method: "POST", body: { current: curInput.value, "new": newInput.value } })
        .then(function (r) {
          pwBtn.disabled = false;
          if (r && r.ok) {
            curInput.value = "";
            newInput.value = "";
            errBox.textContent = "Password changed.";
          } else {
            errBox.textContent = (r && r.error) || "Couldn't change it.";
          }
        })
        .catch(function () {
          pwBtn.disabled = false;
          errBox.textContent = "Couldn't reach the chat server.";
        });
    });
    sheet.appendChild(pwBtn);

    var out = document.createElement("button");
    out.type = "button";
    out.className = "chat-logout";
    out.textContent = "Log out";
    out.addEventListener("click", function () {
      try { localStorage.removeItem(TOKEN_KEY); } catch (e) {}
      token = null;
      closeProfile();
      renderAuth();
    });
    sheet.appendChild(out);

    back.appendChild(sheet);
    back.addEventListener("click", function (e) {
      if (e.target === back) closeProfile();
    });
    document.body.appendChild(back);
  }

  function closeProfile() {
    var b = document.querySelector(".chat-sheet-backdrop");
    if (b && b.parentNode) b.parentNode.removeChild(b);
  }

  /* ---------- init ---------- */

  function checkXHash() {
    var h = location.hash || "";
    if (h.indexOf("x_token=") < 0 && h.indexOf("x_error=") < 0) return null;
    var tm = h.match(/x_token=([^&]+)/);
    var em = h.match(/x_error=([^&]+)/);
    var sm = h.match(/x_state=([^&]+)/);
    try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {}
    if (em) return { error: decodeURIComponent(em[1]) };
    if (!tm) return null;
    var saved = null;
    try { saved = sessionStorage.getItem("x_state"); } catch (e) {}
    var st = sm ? decodeURIComponent(sm[1]) : "";
    if (!saved || st.split(".")[0] !== saved) return { error: "Sign-in didn't verify. Try again." };
    try { sessionStorage.removeItem("x_state"); } catch (e) {}
    return { token: decodeURIComponent(tm[1]) };
  }

  var xHashErr = null;
  function init() {
    root = document.getElementById("chat");
    if (!root) return;
    var xr = checkXHash();
    if (xr && xr.token) {
      try { localStorage.setItem(TOKEN_KEY, xr.token); } catch (e) {}
      token = xr.token;
    } else if (xr && xr.error) {
      xHashErr = xr.error;
    }
    try { if (!token) token = localStorage.getItem(TOKEN_KEY); } catch (e) { token = null; }
    if (token) {
      api("/api/me")
        .then(function (r) {
          if (r && r.user) {
            me = r.user;
            renderChat();
          } else {
            token = null;
            try { localStorage.removeItem(TOKEN_KEY); } catch (e) {}
            renderAuth();
          }
        })
        .catch(function () { renderAuth(); });
    } else {
      renderAuth();
      if (xHashErr) {
        var eb = root.querySelector(".chat-err");
        if (eb) eb.textContent = xHashErr;
        xHashErr = null;
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
