/* MISERY community chat — accounts, live messages, points.
   Backend: Cloudflare Worker (CHAT_API). Renders inside the #journal panel. */
(function () {
  "use strict";

  var CHAT_API = "https://misery-chat.freeglory416.workers.dev";
  var TOKEN_KEY = "chat_token";
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

  function avatarNode(username, avatar, size) {
    var wrap = document.createElement("span");
    wrap.className = "chat-avatar-wrap";
    var a = document.createElement("span");
    a.className = "chat-avatar" + (size ? " " + size : "");
    a.textContent = avatar || (username || "?").charAt(0).toUpperCase();
    wrap.appendChild(a);
    return wrap;
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
      if (!/^[a-zA-Z0-9_]{2,16}$/.test(username)) {
        setErr("Username must be 2\u201316 characters: letters, numbers, _");
        return;
      }
      if (!password || password.length < 4) {
        setErr("Password must be at least 4 characters.");
        return;
      }
      var body = { username: username, password: password };
      if (mode === "register" && username.toLowerCase() === "dc") {
        body.secret = secretInput.value;
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
      '<form class="chat-inputbar">' +
      '<input type="text" maxlength="500" placeholder="Message" autocomplete="off" aria-label="Message">' +
      '<button type="submit" class="chat-send" aria-label="Send">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5"/><path d="M5 12l7-7 7 7"/></svg>' +
      "</button></form>";

    var meBtn = root.querySelector(".chat-me");
    meBtn.appendChild(avatarNode(me.username, me.avatar, "sm"));
    if (me.verified) meBtn.querySelector(".chat-avatar-wrap").insertAdjacentHTML("beforeend", sealHTML());
    setPoints(me.points || 0);

    meBtn.addEventListener("click", openProfile);

    var form = root.querySelector(".chat-inputbar");
    var input = form.querySelector("input");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var text = input.value.trim();
      if (!text) return;
      input.value = "";
      send(text);
    });

    api("/api/messages?limit=50").then(function (r) {
      if (r && r.messages) r.messages.forEach(addMessage);
      scrollBottom(true);
    }).catch(function () {});
    connect();
  }

  function msgsBox() { return root.querySelector(".chat-msgs"); }

  function nearBottom() {
    var b = msgsBox();
    if (!b) return true;
    return b.scrollHeight - b.scrollTop - b.clientHeight < 120;
  }

  function scrollBottom(force) {
    var b = msgsBox();
    if (b && (force || nearBottom())) b.scrollTop = b.scrollHeight;
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
      bubble.className = "chat-bubble";
      bubble.textContent = m.text || "";
      row.appendChild(bubble);
    } else {
      var wrap = avatarNode(m.user, m.avatar);
      if (m.verified) wrap.insertAdjacentHTML("beforeend", sealHTML());
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
      b2.className = "chat-bubble";
      b2.textContent = m.text || "";
      main.appendChild(b2);
      row.appendChild(main);
    }

    if (me && me.owner) {
      var del = document.createElement("button");
      del.type = "button";
      del.className = "chat-del";
      del.setAttribute("aria-label", "Delete message");
      del.textContent = "\u00D7";
      del.addEventListener("click", function () { deleteMessage(m.id); });
      row.appendChild(del);
    }

    b.appendChild(row);
    if (stick) b.scrollTop = b.scrollHeight;
  }

  function removeMessage(id) {
    delete seen[id];
    var n = root.querySelector('.chat-msg[data-id="' + id + '"]');
    if (n && n.parentNode) n.parentNode.removeChild(n);
  }

  function deleteMessage(id) {
    api("/api/delete", { method: "POST", body: { id: id } })
      .then(function (r) { if (r && r.ok) removeMessage(id); })
      .catch(function () {});
  }

  function send(text) {
    if (ws && ws.readyState === 1) {
      ws.send(JSON.stringify({ t: "send", text: text }));
    } else {
      api("/api/send", { method: "POST", body: { text: text } })
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
        if (o.you) {
          me = o.you;
          setPoints(me.points || 0);
        }
        if (o.messages) o.messages.forEach(addMessage);
        scrollBottom(true);
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

    var bigWrap = avatarNode(me.username, me.avatar, "lg");
    if (me.verified) bigWrap.insertAdjacentHTML("beforeend", sealHTML());
    var bigHold = document.createElement("div");
    bigHold.className = "chat-sheet-big";
    bigHold.appendChild(bigWrap);
    sheet.appendChild(bigHold);

    var grid = document.createElement("div");
    grid.className = "chat-emoji-grid";
    var picked = me.avatar || "";
    AVATAR_EMOJIS.forEach(function (em) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "chat-emoji" + (em === picked ? " on" : "");
      b.textContent = em;
      b.setAttribute("aria-label", "Avatar " + em);
      b.addEventListener("click", function () {
        picked = em;
        grid.querySelectorAll(".chat-emoji").forEach(function (n) {
          n.classList.toggle("on", n === b);
        });
        bigHold.querySelector(".chat-avatar").textContent = em;
      });
      grid.appendChild(b);
    });
    sheet.appendChild(grid);

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

    var pts = document.createElement("div");
    pts.className = "chat-sheet-points";
    pts.innerHTML = '<span aria-hidden="true">\u2605</span> <span>' + esc(me.points || 0) + "</span> points";
    sheet.appendChild(pts);

    var errBox = document.createElement("div");
    errBox.className = "chat-err";
    errBox.setAttribute("role", "alert");
    sheet.appendChild(errBox);

    var save = document.createElement("button");
    save.type = "button";
    save.className = "btn accent chat-save";
    save.textContent = "Save";
    save.addEventListener("click", function () {
      var newName = nameInput.value.trim();
      errBox.textContent = "";
      if (!/^[a-zA-Z0-9_]{2,16}$/.test(newName)) {
        errBox.textContent = "Username must be 2\u201316 characters: letters, numbers, _";
        return;
      }
      var body = {};
      if (newName !== me.username) body.username = newName;
      if (picked !== (me.avatar || "")) body.avatar = picked;
      if (!body.username && !("avatar" in body)) { closeProfile(); return; }
      save.disabled = true;
      api("/api/profile", { method: "POST", body: body })
        .then(function (r) {
          save.disabled = false;
          if (r && r.ok && r.user) {
            var oldName = me.username;
            me = r.user;
            setPoints(me.points || 0);
            var meBtn = root.querySelector(".chat-me");
            if (meBtn) {
              meBtn.innerHTML = "";
              meBtn.appendChild(avatarNode(me.username, me.avatar, "sm"));
              if (me.verified) meBtn.querySelector(".chat-avatar-wrap").insertAdjacentHTML("beforeend", sealHTML());
            }
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
            closeProfile();
          } else {
            errBox.textContent = (r && r.error) || "Couldn't save.";
          }
        })
        .catch(function () {
          save.disabled = false;
          errBox.textContent = "Couldn't reach the chat server.";
        });
    });
    sheet.appendChild(save);

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

  function init() {
    root = document.getElementById("chat");
    if (!root) return;
    try { token = localStorage.getItem(TOKEN_KEY); } catch (e) { token = null; }
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
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
