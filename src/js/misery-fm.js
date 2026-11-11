/* Misery FM (dc, 2026-11-09): owner-run live radio on every page. No mic, no recording.
   State lives in the chat Durable Object; this module keeps its own small socket (/api/fm/ws) so Shop,
   Globe, product and cart pages light up the top bar the moment the station goes live, without loading chat.
   Every listener derives the same position from startedAt (or pos while paused); iOS needs a tap to start audio.
   Pieces: state + socket, player (2 elements for crossfade, Media Session, heartbeat), top-bar live state + morph,
   chat live bar, listener sheet / owner studio, edit sheet, uploads (ID3/M4A tags, cover, loudness map). */
(function () {
  "use strict";
  var API = "https://api.misereperdue.com", WSU = "wss://api.misereperdue.com/api/fm/ws";
  var RM = window.matchMedia ? matchMedia("(prefers-reduced-motion: reduce)") : { matches: !1 };
  var IOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  var VOLOK = (function () { try { var a = document.createElement("audio"); a.volume = 0.5; return a.volume === 0.5 && !IOS; } catch (e) { return !1; } })();
  var EMO = ["\u{1F525}", "\u2764\uFE0F", "\u{1F62D}", "\u{1F64C}", "\u{1F480}", "\u{1F3B6}"];
  var S = null, off = 0, me = null, meP = null, ws = null, wsT = 0, wsN = 0, hideT = 0, pollT = 0;
  var on = !1, vol = 1, A = [], act = 0, hbT = 0, tickT = 0, tickN = 0, fadeT = 0, actx = null, waves = {}, lastReact = 0, sentE = {};
  var sheet = null, tab = "now", morph = null, hb = null, phT = 0, edit = null, ups = [], drag = null, dirty = !1;
  try { vol = Math.max(0, Math.min(1, +(localStorage.getItem("mp-fm-vol") || 1))); } catch (e) {}

  /* ---------- helpers ---------- */
  function tok() { try { return localStorage.getItem("chat_token") || ""; } catch (e) { return ""; } }
  function dev() { try { return localStorage.getItem("chat_device") || ""; } catch (e) { return ""; } }
  function hdr(isJson) {
    var h = {}, t = tok(), d = dev();
    isJson && (h["Content-Type"] = "application/json");
    t && (h.Authorization = "Bearer " + t);
    d && (h["X-Device-Id"] = d);
    return h;
  }
  function api(p, body) {
    var o = body === void 0 ? { headers: hdr() } : { method: "POST", headers: hdr(!0), body: JSON.stringify(body) };
    return fetch(API + p, o).then(function (r) { return r.json().catch(function () { return { ok: !1, error: "HTTP " + r.status }; }); }, function () { return { ok: !1, error: "Network error" }; });
  }
  function esc(v) { return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function fmt(s) { s = Math.max(0, Math.floor(+s || 0)); var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = ("0" + (s % 60)).slice(-2); return h ? h + ":" + ("0" + m).slice(-2) + ":" + x : m + ":" + x; }
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; }
  function q(sel, root) { return (root || document).querySelector(sel); }
  function live() { return !!(S && S.live && S.list && S.list.length); }
  function owner() { return !!(me && me.owner); }
  function now() { return Date.now() + off; }
  function durOf(t) { return Math.max(1, +(t && t.dur) || 180); }
  function eff(t) { return Math.max(1, durOf(t) - ((S && S.xf) || 0)); }
  function byId(id) { for (var i = 0; S && i < S.list.length; i++) if (S.list[i].id === id) return S.list[i]; return null; }
  function artUrl(t) { return t && t.art ? API + "/api/fm/art/" + encodeURIComponent(t.art) : ""; }
  var EMB = '<svg class="fm-emb" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8.6 7.6a4.8 4.8 0 0 1 6.8 0M6.1 5.1a8.3 8.3 0 0 1 11.8 0"/><circle cx="12" cy="10.1" r="1.1" fill="currentColor" stroke="none"/><path d="M3.6 13.3c2.4 2.7 5.3 4 8.4 4s6-1.3 8.4-4M7 16.1l-1.2 2.2M10.2 17.2l-.4 2.4M13.8 17.2l.4 2.4M17 16.1l1.2 2.2"/></svg>';
  function E(t) { return t && t.explicit ? '<span class="fm-e" role="img" aria-label="Explicit" title="Explicit">E</span>' : ""; }
  function art(t, cls) {
    cls = "fm-art " + (cls || "");
    if (t && t.art) return '<span class="' + cls + '"><img src="' + esc(artUrl(t)) + '" alt="" decoding="async"></span>';
    var h = hash((t && (t.id + (t.title || ""))) || "fm");
    return '<span class="' + cls + ' fm-gen" style="--h1:' + (h % 360) + ";--h2:" + ((h >>> 9) % 360) + '">' + EMB + "</span>";
  }
  function sub(t) { return [t.artist, t.album, t.year].filter(Boolean).map(esc).join(" · "); }
  var ICO = {
    play: '<path d="M18.8906 12.846C18.5371 14.189 16.8667 15.138 13.5257 17.0361C10.296 18.8709 8.6812 19.7884 7.37983 19.4196C6.8418 19.2671 6.35159 18.9776 5.95624 18.5787C5 17.6139 5 15.7426 5 12C5 8.2574 5 6.3861 5.95624 5.42132C6.35159 5.02245 6.8418 4.73288 7.37983 4.58042C8.6812 4.21165 10.296 5.12907 13.5257 6.96393C16.8667 8.86197 18.5371 9.811 18.8906 11.154C19.0365 11.7084 19.0365 12.2916 18.8906 12.846Z" fill="currentColor" stroke-width="1.5"/>',
    pause: '<path d="M4 7C4 5.58579 4 4.87868 4.43934 4.43934C4.87868 4 5.58579 4 7 4C8.41421 4 9.12132 4 9.56066 4.43934C10 4.87868 10 5.58579 10 7V17C10 18.4142 10 19.1213 9.56066 19.5607C9.12132 20 8.41421 20 7 20C5.58579 20 4.87868 20 4.43934 19.5607C4 19.1213 4 18.4142 4 17V7Z"/><path d="M14 7C14 5.58579 14 4.87868 14.4393 4.43934C14.8787 4 15.5858 4 17 4C18.4142 4 19.1213 4 19.5607 4.43934C20 4.87868 20 5.58579 20 7V17C20 18.4142 20 19.1213 19.5607 19.5607C19.1213 20 18.4142 20 17 20C15.5858 20 14.8787 20 14.4393 19.5607C14 19.1213 14 18.4142 14 17V7Z"/>',
    vol: '<path d="M14 14.8135V9.18646C14 6.04126 14 4.46866 13.0747 4.0773C12.1494 3.68593 11.0603 4.79793 8.88232 7.02192C7.75439 8.17365 7.11085 8.42869 5.50604 8.42869C4.10257 8.42869 3.40084 8.42869 2.89675 8.77262C1.85035 9.48655 2.00852 10.882 2.00852 12C2.00852 13.118 1.85035 14.5134 2.89675 15.2274C3.40084 15.5713 4.10257 15.5713 5.50604 15.5713C7.11085 15.5713 7.75439 15.8264 8.88232 16.9781C11.0603 19.2021 12.1494 20.3141 13.0747 19.9227C14 19.5313 14 17.9587 14 14.8135Z"/><path d="M17 9C17.6254 9.81968 18 10.8634 18 12C18 13.1366 17.6254 14.1803 17 15"/><path d="M20 7C21.2508 8.36613 22 10.1057 22 12C22 13.8943 21.2508 15.6339 20 17"/>',
    mute: '<path d="M14 14.8135V9.18646C14 6.04126 14 4.46866 13.0747 4.0773C12.1494 3.68593 11.0603 4.79793 8.88232 7.02192C7.75439 8.17365 7.11085 8.42869 5.50604 8.42869C4.10257 8.42869 3.40084 8.42869 2.89675 8.77262C1.85035 9.48655 2.00852 10.882 2.00852 12C2.00852 13.118 1.85035 14.5134 2.89675 15.2274C3.40084 15.5713 4.10257 15.5713 5.50604 15.5713C7.11085 15.5713 7.75439 15.8264 8.88232 16.9781C11.0603 19.2021 12.1494 20.3141 13.0747 19.9227C14 19.5313 14 17.9587 14 14.8135Z"/><path d="M18 10L22 14M18 14L22 10"/>',
    next: '<path d="M15.9351 12.6258C15.6807 13.8374 14.327 14.7077 11.6198 16.4481C8.67528 18.3411 7.20303 19.2876 6.01052 18.9229C5.60662 18.7994 5.23463 18.5823 4.92227 18.2876C4 17.4178 4 15.6118 4 12C4 8.38816 4 6.58224 4.92227 5.71235C5.23463 5.41773 5.60662 5.20057 6.01052 5.07707C7.20304 4.71243 8.67528 5.6589 11.6198 7.55186C14.327 9.29233 15.6807 10.1626 15.9351 11.3742C16.0216 11.7865 16.0216 12.2135 15.9351 12.6258Z"/><path d="M20 5V19"/>',
    prev: '<path d="M8.06492 12.6258C8.31931 13.8374 9.67295 14.7077 12.3802 16.4481C15.3247 18.3411 16.797 19.2876 17.9895 18.9229C18.3934 18.7994 18.7654 18.5823 19.0777 18.2876C20 17.4178 20 15.6118 20 12C20 8.38816 20 6.58224 19.0777 5.71235C18.7654 5.41773 18.3934 5.20057 17.9895 5.07707C16.797 4.71243 15.3247 5.6589 12.3802 7.55186C9.67295 9.29233 8.31931 10.1626 8.06492 11.3742C7.97836 11.7865 7.97836 12.2135 8.06492 12.6258Z"/><path d="M4 4L4 20"/>',
    restart: '<path d="M20.0092 2V5.13219C20.0092 5.42605 19.6418 5.55908 19.4537 5.33333C17.6226 3.2875 14.9617 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12"/>',
    shuffle: '<path d="M19.5576 4L20.4551 4.97574C20.8561 5.41165 21.0566 5.62961 20.9861 5.81481C20.9155 6 20.632 6 20.0649 6C18.7956 6 17.2771 5.79493 16.1111 6.4733C15.3903 6.89272 14.8883 7.62517 14.0392 9M3 18H4.58082C6.50873 18 7.47269 18 8.2862 17.5267C9.00708 17.1073 9.50904 16.3748 10.3582 15"/><path d="M19.5576 20L20.4551 19.0243C20.8561 18.5883 21.0566 18.3704 20.9861 18.1852C20.9155 18 20.632 18 20.0649 18C18.7956 18 17.2771 18.2051 16.1111 17.5267C15.2976 17.0534 14.7629 16.1815 13.6935 14.4376L10.7038 9.5624C9.63441 7.81853 9.0997 6.9466 8.2862 6.4733C7.47269 6 6.50873 6 4.58082 6H3"/>',
    repeat: '<path d="M16.3884 3L17.3913 3.97574C17.8393 4.41165 18.0633 4.62961 17.9844 4.81481C17.9056 5 17.5888 5 16.9552 5H9.19422C5.22096 5 2 8.13401 2 12C2 13.4872 2.47668 14.8662 3.2895 16"/><path d="M7.61156 21L6.60875 20.0243C6.16074 19.5883 5.93673 19.3704 6.01557 19.1852C6.09441 19 6.4112 19 7.04478 19H14.8058C18.779 19 22 15.866 22 12C22 10.5128 21.5233 9.13383 20.7105 8"/>',
    x: '<path d="M18.9991 19L5 5.00098"/><path d="M19 5L5.00092 18.999"/>',
    back: '<path d="M15 6C15 6 9.00001 10.4189 9 12C8.99999 13.5812 15 18 15 18"/>',
    up: '<path d="M17.9998 15C17.9998 15 13.5809 9.00001 11.9998 9C10.4187 8.99999 5.99985 15 5.99985 15"/>',
    down: '<path d="M18 9.00005C18 9.00005 13.5811 15 12 15C10.4188 15 6 9 6 9"/>',
    more: '<path d="M6.00449 12.5V12M18.0045 12.5V12M12.0045 12.5V12M7.00449 12.5C7.00449 11.9477 6.55677 11.5 6.00449 11.5C5.4522 11.5 5.00449 11.9477 5.00449 12.5C5.00449 13.0523 5.4522 13.5 6.00449 13.5C6.55677 13.5 7.00449 13.0523 7.00449 12.5ZM19.0045 12.5C19.0045 11.9477 18.5568 11.5 18.0045 11.5C17.4522 11.5 17.0045 11.9477 17.0045 12.5C17.0045 13.0523 17.4522 13.5 18.0045 13.5C18.5568 13.5 19.0045 13.0523 19.0045 12.5ZM13.0045 12.5C13.0045 11.9477 12.5568 11.5 12.0045 11.5C11.4522 11.5 11.0045 11.9477 11.0045 12.5C11.0045 13.0523 11.4522 13.5 12.0045 13.5C12.5568 13.5 13.0045 13.0523 13.0045 12.5Z"/>',
    grip: '<path d="M4 5L20 5"/><path d="M4 12L20 12"/><path d="M4 19L20 19"/>',
    plus: '<path d="M12.001 4.00101V20.001"/><path d="M20.001 12.001L4.00098 12.001"/>',
    ear: '<path d="M6.07692 18C6.07692 20.2091 7.226 22 9.30769 22C11.3894 22 13.0769 20.5 13.6154 18C13.8736 16.8013 14.4026 16.0767 15.2308 15.5C17.3846 14 19 11.6923 19 9C19 5.13401 15.866 2 12 2C8.13401 2 5 5.13401 5 9"/><path d="M9 15C10.385 15 11.5078 13.9926 11.5078 12.75C11.5078 11.5074 10.385 10.5 9 10.5C9 8.48311 9.46383 6 12.0094 6C13.7998 6 14.8496 7.37416 15 9.15"/>',
    next1: '<path d="M2 3L20 3"/><path d="M2 10L15 10"/><path d="M2 17L9 17"/><path d="M18.25 19C18.25 20.6569 16.8509 22 15.125 22C13.3991 22 12 20.6569 12 19C12 17.3431 13.3991 16 15.125 16C16.8509 16 18.25 17.3431 18.25 19ZM18.25 19V10C18.6667 10.6 19 13.12 22 13.6"/>',
    edit: '<path d="M15.2141 5.98239L16.6158 4.58063C17.39 3.80646 18.6452 3.80646 19.4194 4.58063C20.1935 5.3548 20.1935 6.60998 19.4194 7.38415L18.0176 8.78591M15.2141 5.98239L6.98023 14.2163C5.93493 15.2616 5.41226 15.7842 5.05637 16.4211C4.70047 17.058 4.3424 18.5619 4 20C5.43809 19.6576 6.94199 19.2995 7.57889 18.9436C8.21579 18.5877 8.73844 18.0651 9.78375 17.0198L18.0176 8.78591M15.2141 5.98239L18.0176 8.78591"/><path d="M11 20H17"/>',
    expand: '<path d="M18 9.00005C18 9.00005 13.5811 15 12 15C10.4188 15 6 9 6 9"/>',
    golive: '<circle cx="11.9922" cy="8.65723" r="2"/><circle cx="11.9922" cy="8.65723" r="2"/><path d="M15.5277 12.1931C17.4803 10.2405 17.4803 7.07469 15.5277 5.12207M8.45665 12.1931C6.50403 10.2405 6.50403 7.07469 8.45665 5.12207"/><path d="M15.5277 12.1931C17.4803 10.2405 17.4803 7.07469 15.5277 5.12207M8.45665 12.1931C6.50403 10.2405 6.50403 7.07469 8.45665 5.12207"/><path d="M17.649 14.3137C20.7732 11.1895 20.7732 6.12419 17.649 3M6.33533 14.3137C3.21114 11.1895 3.21114 6.12419 6.33533 3"/><path d="M17.649 14.3137C20.7732 11.1895 20.7732 6.12419 17.649 3M6.33533 14.3137C3.21114 11.1895 3.21114 6.12419 6.33533 3"/><path d="M11.9922 11V21M8.49219 21H15.4922"/>',
    radio: '<circle cx="12" cy="12" r="2"/><path d="M7.5 8C6.5 9 6 10.5 6 12C6 13.5 6.5 15 7.5 16"/><path d="M4.5 6C3 7.5 2 9.5 2 12C2 14.5 3 16.5 4.5 18"/><path d="M16.5 16C17.5 15 18 13.5 18 12C18 10.5 17.5 9 16.5 8"/><path d="M19.5 18C21 16.5 22 14.5 22 12C22 9.5 21 7.5 19.5 6"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 8V12L14 14"/>',
    msg: '<path d="M21.9598 12.9919C21.6856 17.2342 18.3536 20.6134 14.1706 20.8915C13.4574 20.9389 12.7285 21.001 12 21.001C10.4054 21.001 8.95127 20.8637 7.44544 20.2902C7.44544 20.2902 5.56108 21.7589 3.69962 21.4587C3.31009 21.3959 3.11532 21.3644 3.00091 21.1343C2.8865 20.9042 3.00788 20.6756 3.25063 20.2185C3.65964 19.4483 3.92248 18.6737 3.80076 17.8306C3.73703 17.3892 3.50433 16.9974 3.27644 16.6136L3.26529 16.5948C2.62637 15.5188 2.12462 14.2975 2.04024 12.9919C1.98659 12.1617 1.98659 11.3019 2.04024 10.4717C2.31441 6.22935 5.64639 2.85011 9.8294 2.57205C11.2536 2.47738 12.7435 2.47719 14.1706 2.57205C18.3536 2.85011 21.6856 6.22935 21.9598 10.4717C22.0134 11.3019 22.0134 12.1617 21.9598 12.9919Z"/><path d="M8.75 14.501H15.25M8.75 9.50098H12.25"/>',
    xf: '<path d="M19 9H6.65856C5.65277 9 5.14987 9 5.02472 8.69134C4.89957 8.38268 5.25517 8.01942 5.96637 7.29289L8.21091 5"/><path d="M5 15H17.3414C18.3472 15 18.8501 15 18.9753 15.3087C19.1004 15.6173 18.7448 15.9806 18.0336 16.7071L15.7891 19"/>',
    send: '<path d="M12 5.5V19"/><path d="M18 11C18 11 13.5811 5.00001 12 5C10.4188 4.99999 6 11 6 11"/>',
    check: '<path d="M5 14L8.5 17.5L19 6.5"/>'
  };
  /* Original filled transport glyphs (drawn for Misery FM; rounded joins, Apple-player proportions). */
  var GLY = {
    play: '<path d="M18.8906 12.846C18.5371 14.189 16.8667 15.138 13.5257 17.0361C10.296 18.8709 8.6812 19.7884 7.37983 19.4196C6.8418 19.2671 6.35159 18.9776 5.95624 18.5787C5 17.6139 5 15.7426 5 12C5 8.2574 5 6.3861 5.95624 5.42132C6.35159 5.02245 6.8418 4.73288 7.37983 4.58042C8.6812 4.21165 10.296 5.12907 13.5257 6.96393C16.8667 8.86197 18.5371 9.811 18.8906 11.154C19.0365 11.7084 19.0365 12.2916 18.8906 12.846Z"/>',
    pause: '<path d="M4 7C4 5.58579 4 4.87868 4.43934 4.43934C4.87868 4 5.58579 4 7 4C8.41421 4 9.12132 4 9.56066 4.43934C10 4.87868 10 5.58579 10 7V17C10 18.4142 10 19.1213 9.56066 19.5607C9.12132 20 8.41421 20 7 20C5.58579 20 4.87868 20 4.43934 19.5607C4 19.1213 4 18.4142 4 17V7Z"/><path d="M14 7C14 5.58579 14 4.87868 14.4393 4.43934C14.8787 4 15.5858 4 17 4C18.4142 4 19.1213 4 19.5607 4.43934C20 4.87868 20 5.58579 20 7V17C20 18.4142 20 19.1213 19.5607 19.5607C19.1213 20 18.4142 20 17 20C15.5858 20 14.8787 20 14.4393 19.5607C14 19.1213 14 18.4142 14 17V7Z"/>',
    next: '<path d="M21.8371 12.9178C21.5547 13.6884 20.7014 14.3047 18.9948 15.5372C16.6677 17.218 15.5041 18.0583 14.5312 17.9969C13.7882 17.9499 13.0976 17.6007 12.6223 17.0315C12 16.2863 12 14.8575 12 12C12 9.14246 12 7.71369 12.6223 6.96846C13.0976 6.39933 13.7882 6.0501 14.5312 6.00315C15.5041 5.94167 16.6677 6.78203 18.9948 8.46275C20.7014 9.6953 21.5547 10.3116 21.8371 11.0822C22.0543 11.675 22.0543 12.325 21.8371 12.9178Z"/><path d="M11.8371 12.9178C11.5547 13.6884 10.7014 14.3047 8.99482 15.5372C6.66769 17.218 5.50413 18.0583 4.5312 17.9969C3.78818 17.9499 3.09758 17.6007 2.62232 17.0315C2 16.2863 2 14.8575 2 12C2 9.14246 2 7.71369 2.62232 6.96846C3.09758 6.39933 3.78818 6.0501 4.5312 6.00315C5.50413 5.94167 6.66769 6.78203 8.99482 8.46275C10.7014 9.6953 11.5547 10.3116 11.8371 11.0822C12.0543 11.675 12.0543 12.325 11.8371 12.9178Z"/>',
    prev: '<path d="M2.16293 12.9178C2.4453 13.6884 3.29859 14.3047 5.00518 15.5372C7.33231 17.218 8.49587 18.0583 9.4688 17.9969C10.2118 17.9499 10.9024 17.6007 11.3777 17.0315C12 16.2863 12 14.8575 12 12C12 9.14246 12 7.71369 11.3777 6.96846C10.9024 6.39933 10.2118 6.0501 9.4688 6.00315C8.49587 5.94167 7.33231 6.78203 5.00518 8.46275C3.29859 9.6953 2.4453 10.3116 2.16293 11.0822C1.94569 11.675 1.94569 12.325 2.16293 12.9178Z"/><path d="M12.1629 12.9178C12.4453 13.6884 13.2986 14.3047 15.0052 15.5372C17.3323 17.218 18.4959 18.0583 19.4688 17.9969C20.2118 17.9499 20.9024 17.6007 21.3777 17.0315C22 16.2863 22 14.8575 22 12C22 9.14246 22 7.71369 21.3777 6.96846C20.9024 6.39933 20.2118 6.0501 19.4688 6.00315C18.4959 5.94167 17.3323 6.78203 15.0052 8.46275C13.2986 9.6953 12.4453 10.3116 12.1629 11.0822C11.9457 11.675 11.9457 12.325 12.1629 12.9178Z"/>'
  };
  function gly(k) { return '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + GLY[k] + "</svg>"; }
  function ico(k) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICO[k] + "</svg>"; }

  /* ---------- timeline (same rules as the Worker's fmAdvance / fmStep) ---------- */
  function calc() {
    if (!live()) return null;
    var L = S.list, ix = {}, i = S.idx >= L.length ? 0 : S.idx, up = (S.upNext || []).slice(), el;
    L.forEach(function (t, k) { ix[t.id] = k; });
    if (S.paused) el = S.pos || 0;
    else {
      el = (now() - S.startedAt) / 1e3;
      for (var n = 0; n < 50 && el >= eff(L[i]); n++) {
        if (!up.length || ix[up[0]] == null) { el = Math.min(el, durOf(L[i])); break; }
        el -= eff(L[i]); i = ix[up.shift()];
      }
    }
    var tr = L[i], d = durOf(tr);
    return { i: i, tr: tr, t: Math.max(0, Math.min(el, d)), d: d, up: up.map(function (id) { return L[ix[id]]; }).filter(Boolean), paused: !!S.paused };
  }

  /* ---------- state + socket ---------- */
  function set(fm) {
    if (!fm || !Array.isArray(fm.list)) return;
    if (S && fm.v < S.v && fm.now && S.now && fm.now <= S.now) return;
    S = fm;
    if (fm.now) off = fm.now - Date.now();
    if (!live() && on) listen(!1);
    if (!live() && morph) closeMorph(!0);
    render();
    sync();
  }
  function refresh() { return api("/api/fm/state").then(function (r) { r && r.ok && set(r.fm); }); }
  function connect() {
    if (ws || document.hidden || !window.WebSocket) return;
    try { ws = new WebSocket(WSU); } catch (e) { ws = null; return; }
    ws.onopen = function () { wsN = 0; clearInterval(pollT); pollT = 0; };
    ws.onmessage = function (ev) {
      var m;
      try { m = JSON.parse(ev.data); } catch (e) { return; }
      if (m.t === "fm") set(m.fm);
      else if (m.t === "fml" && S) { S.listeners = m.n; paint(); }
      else if (m.t === "fmr") { var k = m.e + "|"; if (me && m.u && m.u === me.username) return; if (!m.u && sentE[k] && Date.now() - sentE[k] < 2e3) return; float(m.e); }
    };
    ws.onclose = function () {
      ws = null;
      if (document.hidden && !on) return;
      wsN++;
      clearTimeout(wsT);
      wsT = setTimeout(connect, Math.min(3e4, 1e3 * Math.pow(2, wsN)));
      if (wsN > 2 && !pollT) { refresh(); pollT = setInterval(refresh, 3e4); }
    };
  }
  document.addEventListener("visibilitychange", function () {
    clearTimeout(hideT);
    if (document.hidden) hideT = setTimeout(function () { if (document.hidden && ws && !on) ws.close(); }, 6e4);
    else { connect(); refresh(); }
  });
  function getMe() {
    if (meP) return meP;
    if (!tok()) { me = null; return (meP = Promise.resolve(null)); }
    meP = api("/api/me").then(function (r) { me = (r && r.user) || null; return me; });
    return meP;
  }

  /* ---------- player ---------- */
  function el(k) {
    if (A[k]) return A[k];
    var a = document.createElement("audio");
    a.className = "fm-audio";
    a.preload = "auto";
    a.setAttribute("playsinline", "");
    if (!IOS) a.crossOrigin = "anonymous";
    a._f = 1;
    a.addEventListener("loadedmetadata", function () { var c = calc(); if (A[act] === a && c && c.tr.id === a._id) seek(a, c.t); });
    a.addEventListener("ended", function () { setTimeout(sync, 300); });
    document.body.appendChild(a);
    A[k] = a;
    graph(a);
    return a;
  }
  function graph(a) {
    // Real-time analyser where it is safe (not iOS: routing a media element through Web Audio stops
    // lock-screen playback there). iOS uses the uploaded loudness map instead.
    if (IOS || !actx || a._g) return;
    try { var s = actx.createMediaElementSource(a); a._g = actx.createGain(); s.connect(a._g); a._g.connect(actx._an); } catch (e) {}
  }
  function seek(a, t) { try { if (Math.abs(a.currentTime - t) > 0.25) a.currentTime = t; } catch (e) {} }
  function applyVol() {
    A.forEach(function (a) {
      if (!a) return;
      var v = Math.max(0, Math.min(1, vol * a._f));
      if (a._g) a._g.gain.value = v;
      else if (VOLOK) a.volume = v;
    });
  }
  function fade(a, to, secs, stopAfter) {
    a._fd = { from: a._f, to: to, t0: Date.now(), d: Math.max(0.2, secs) * 1e3, stop: stopAfter };
    if (!fadeT) fadeT = setInterval(function () {
      var any = !1;
      A.forEach(function (x) {
        if (!x || !x._fd) return;
        var f = x._fd, k = Math.min(1, (Date.now() - f.t0) / f.d);
        x._f = f.from + (f.to - f.from) * k;
        if (k >= 1) { x._fd = null; if (f.stop) { x.pause(); x._id = ""; } } else any = !0;
      });
      applyVol();
      if (!any) { clearInterval(fadeT); fadeT = 0; }
    }, 80);
  }
  function sync() {
    var c = calc(), a = A[act];
    if (!on || !c || c.paused) {
      A.forEach(function (x) { x && !x.paused && x.pause(); });
      media(c);
      return;
    }
    if (!a || a._id !== c.tr.id) {
      var old = a, xf = S.xf || 0;
      act = a ? 1 - act : 0;
      a = el(act);
      a._id = c.tr.id;
      a._fd = null;
      if (old && !old.paused && xf > 0 && (VOLOK || old._g)) { fade(old, 0, Math.min(xf, Math.max(0.3, (old.duration || 0) - old.currentTime || xf)), !0); a._f = 0; fade(a, 1, xf); }
      else { if (old) { old.pause(); old._id = ""; } a._f = 1; }
      a.src = API + "/api/fm/audio/" + encodeURIComponent(c.tr.id);
      wave(c.tr);
    } else if (a.readyState > 0 && Math.abs(a.currentTime - c.t) > 1.5 && c.t < c.d - 0.5) seek(a, c.t);
    if (a.paused && c.t < c.d - 0.3) {
      var p = a.play();
      p && p.catch && p.catch(function (e) { if (e && e.name === "NotAllowedError") listen(!1); });
    }
    applyVol();
    media(c);
  }
  function listen(v) {
    v = !!v && live();
    if (v === on) { if (v) sync(); return; }
    on = v;
    clearInterval(hbT); hbT = 0;
    if (on) {
      if (!IOS && !actx && (window.AudioContext || window.webkitAudioContext)) {
        try { actx = new (window.AudioContext || window.webkitAudioContext)(); actx._an = actx.createAnalyser(); actx._an.fftSize = 128; actx._an.smoothingTimeConstant = 0.78; actx._an.connect(actx.destination); A.forEach(function (a) { a && graph(a); }); } catch (e) { actx = null; }
      }
      actx && actx.state === "suspended" && actx.resume();
      sync();
      // iOS unlocks each <audio> on a tap: prime the second element now so crossfades/track changes can start it later.
      var b = el(1 - act), a = A[act];
      if (a && !b._id && !b._primed) { b._primed = 1; b.muted = !0; b.src = a.src; var pb = b.play(); pb && pb.then ? pb.then(function () { b.pause(); b.muted = !1; }, function () { b.muted = !1; }) : (b.muted = !1); }
      api("/api/fm/listen", { on: !0 });
      hbT = setInterval(function () { api("/api/fm/listen", { on: !0 }); }, 3e4);
    } else {
      A.forEach(function (x) { x && x.pause(); });
      api("/api/fm/listen", { on: !1 });
    }
    media(calc());
    render();
  }
  var msKey = "";
  function media(c) {
    if (!("mediaSession" in navigator)) return;
    var m = navigator.mediaSession;
    try {
      if (c && on) {
        var k = c.tr.id + "|" + c.tr.title + "|" + c.tr.artist + "|" + c.tr.art;
        if (k !== msKey && window.MediaMetadata) {
          msKey = k;
          m.metadata = new MediaMetadata({ title: c.tr.title || "Misery FM", artist: c.tr.artist || "Misery FM", album: c.tr.album || "Misery FM · Live",
            artwork: c.tr.art ? [{ src: artUrl(c.tr), sizes: "600x600", type: "image/jpeg" }] : [{ src: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }, { src: "/img/icon-512.png", sizes: "512x512", type: "image/png" }] });
        }
        m.playbackState = c.paused ? "paused" : "playing";
        m.setPositionState && m.setPositionState({ duration: c.d, position: Math.min(c.t, c.d), playbackRate: 1 });
      } else m.playbackState = "paused";
    } catch (e) {}
  }
  try {
    var MS = navigator.mediaSession;
    if (MS && MS.setActionHandler) {
      MS.setActionHandler("play", function () { listen(!0); });
      MS.setActionHandler("pause", function () { listen(!1); });
      MS.setActionHandler("nexttrack", function () { owner() && ctl({ action: "skip" }); });
      MS.setActionHandler("previoustrack", function () { owner() && ctl({ action: "prev" }); });
    }
  } catch (e) {}
  function wave(t) {
    if (!t || !t.wave || waves[t.id]) return;
    waves[t.id] = "loading";
    fetch(API + "/api/fm/wave/" + encodeURIComponent(t.id)).then(function (r) { return r.ok ? r.arrayBuffer() : null; }).then(function (b) { waves[t.id] = b ? new Uint8Array(b) : null; }, function () { waves[t.id] = null; });
  }

  /* ---------- top bar: dotted ring + "MISERY FM IS LIVE" crossfade, tap to morph ---------- */
  function topBar() {
    var p = q(".panel.on"), h = p && p.querySelector(".chat-head");
    if (h && h.getClientRects().length) return h;
    var n = q(".nav");
    return n && n.getClientRects().length ? n : null;
  }
  function deco() {
    if (morph || document.querySelector(".is-profile-bar")) return;
    var bar = live() ? topBar() : null;
    if (hb && hb !== bar) undeco(hb);
    if (!bar) return;
    if (!bar._fm) {
      bar._fm = 1;
      if (getComputedStyle(bar).position === "static") { bar.style.position = "relative"; bar._fmPos = 1; }
      var o = document.createElement("span");
      o.className = "fm-hb";
      o.innerHTML = '<svg class="fm-ring" aria-hidden="true" focusable="false"><rect/></svg><span class="fm-hb-in" aria-hidden="true"><span class="fm-hb-logo"></span><span class="fm-hb-is"><svg viewBox="0 0 360 160" fill="none" stroke="currentColor" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"><path d="M18 76v48M18 52v1M82 61C47 37 36 83 65 88C103 94 83 143 44 117"/><g transform="translate(25 0)"><path d="M115 26v89q0 9 12 9M151 76v48M151 52v1M181 58l25 66 25-66M256 88h54C310 39 250 39 250 88s39 42 55 28"/></g></svg></span></span><span class="fm-hb-np"></span>';
      bar.appendChild(o);
      bar.classList.add("fm-on");
      bar.setAttribute("aria-description", "Misery FM is live. Tap the bar for now playing.");
      bar.addEventListener("click", barTap, !0);
      o.querySelector(".fm-hb-np").addEventListener("click", npTap);
      hb = bar;
    }
    ring(bar);
    if (!phT && !RM.matches) phT = setInterval(function () { if (hb && !morph) { hb.classList.toggle("is-fm"); } }, 4e3);
    if (RM.matches && phT) { clearInterval(phT); phT = 0; hb && hb.classList.remove("is-fm"); }
  }
  /* Dotted outline on the bar's own rounded shape. The rect sits half a stroke inside the edge (never
     clipped), uses the bar's real corner radius, and the dot pitch divides the perimeter exactly, so
     the dots are evenly spaced all the way round with no seam or doubled dot. */
  function ring(bar) {
    var svg = bar.querySelector(":scope > .fm-hb > .fm-ring"), rect = svg && svg.firstChild;
    if (!rect) return;
    var w = bar.offsetWidth, h = bar.offsetHeight;
    if (!w || !h || (svg._w === w && svg._h === h && svg._rm === RM.matches)) return;
    svg._rm = RM.matches;
    svg._w = w; svg._h = h;
    var sw = 1.5, i = sw / 2, rw = w - sw, rh = h - sw, cs = getComputedStyle(bar);
    var rad = Math.max(0, Math.min((parseFloat(cs.borderTopLeftRadius) || h / 2) - i, rh / 2, rw / 2));
    var per = 2 * (rw + rh) - (8 - 2 * Math.PI) * rad, n = Math.max(8, Math.round(per / 6)), pitch = per / n;
    svg.setAttribute("viewBox", "0 0 " + w + " " + h);
    svg.setAttribute("width", w); svg.setAttribute("height", h);
    rect.setAttribute("x", i); rect.setAttribute("y", i); rect.setAttribute("width", rw); rect.setAttribute("height", rh);
    rect.setAttribute("rx", rad); rect.setAttribute("ry", rad);
    rect.setAttribute("stroke-width", sw);
    rect.style.strokeDasharray = "0 " + pitch.toFixed(4);
    // cover the bar's border box exactly (the overlay is positioned inside the border otherwise)
    var o = svg.parentNode, bt = parseFloat(cs.borderTopWidth) || 0, bl = parseFloat(cs.borderLeftWidth) || 0;
    o.style.top = o.style.bottom = -bt + "px"; o.style.left = o.style.right = -bl + "px";
    o.style.setProperty("--fm-r", rad + "px");
    o.style.setProperty("--fm-R", (parseFloat(cs.borderTopLeftRadius) || h / 2) + "px");
    if (rect._an) { rect._an.cancel(); rect._an = null; }
    if (!RM.matches && rect.animate) rect._an = rect.animate([{ strokeDashoffset: 0 }, { strokeDashoffset: -pitch }], { duration: 1600, iterations: Infinity });
  }
  function undeco(bar) {
    if (!bar) return;
    if (morph === bar) closeMorph(!0);
    bar._fm = 0; bar._fmTy = 0;
    bar.classList.remove("fm-on", "is-fm", "is-np");
    bar.removeAttribute("aria-description");
    var o = bar.querySelector(":scope > .fm-hb");
    o && o.remove();
    if (bar._fmPos) { bar.style.position = ""; bar._fmPos = 0; }
    bar.removeEventListener("click", barTap, !0);
    if (hb === bar) { hb = null; clearInterval(phT); phT = 0; }
  }
  function barTap(e) {
    if (!live() || e.currentTarget.classList.contains("is-profile-bar")) return;
    var bar = e.currentTarget;
    if (e.target.closest(".chat-me")) return; // avatar taps always reach the profile bar
    if (bar.classList.contains("is-np")) return; // the now-playing layer handles its own buttons
    var hit = e.target.closest("button, a, input, select, textarea, [role=button], [role=tab], label");
    if (bar.classList.contains("is-fm") || !hit) {
      e.preventDefault(); e.stopPropagation();
      openMorph(bar);
    }
  }

  /* ---------- morph: the bar keeps its exact shape and size; only its content crossfades
     into now playing (transform + opacity) and back ---------- */
  function morphHTML() {
    var c = calc();
    if (!c) return '<div class="fm-m-in"></div>';
    // dc (t517u): the whole bar is the progress bar; tapping it (anywhere but Listen) returns to the normal bar
    return '<div class="fm-m-in"><span class="fm-m-fill fm-pbar" aria-hidden="true"><i style="transform:scaleX(' + (c.t / c.d).toFixed(4) + ')"></i></span>' +
      '<button type="button" class="fm-m-x" data-a="collapse" aria-label="Back to the top bar">' + ico("back") + "</button>" +
      '<span class="fm-m-np">' + art(c.tr, "fm-m-art") +
      '<span class="fm-m-tx"><span class="fm-m-1"><b class="fm-m-t">' + esc(c.tr.title || "Untitled") + "</b>" + E(c.tr) + '</span><small class="fm-m-a">' + esc(c.tr.artist || (c.paused ? "Paused" : "Misery FM")) + "</small></span></span>" +
      '<button type="button" class="fm-m-l fm-listen' + (on ? " is-on" : "") + '" data-a="listen" aria-pressed="' + on + '" aria-label="' + (on ? "Mute" : "Listen live") + '">' + ico(on ? "mute" : "play") + "</button></div>";
  }
  function openMorph(bar) {
    if (morph || !live()) return;
    bar = bar || hb || topBar();
    if (!bar || !bar._fm) return;
    getMe();
    var np = bar.querySelector(":scope > .fm-hb > .fm-hb-np");
    np.innerHTML = morphHTML();
    np.setAttribute("role", "group");
    np.setAttribute("aria-label", "Misery FM now playing");
    morph = bar;
    // lock the bar's box so nothing about its shape, size or position can move while morphed
    bar.style.width = bar.offsetWidth + "px"; bar.style.height = bar.offsetHeight + "px";
    bar.classList.remove("is-fm");
    bar.classList.add("is-np");
    setTimeout(function () { document.addEventListener("pointerdown", outside, !0); }, 0);
    document.addEventListener("keydown", escKey);
    window.addEventListener("resize", closeMorphNow);
    document.documentElement.classList.add("fm-morphing");
  }
  function npTap(e) {
    if (e.target.closest('[data-a="listen"]')) return onAct(e);
    e.preventDefault(); e.stopPropagation();
    closeMorph();
  }
  function closeMorphNow() { closeMorph(!0); }
  function outside(e) { if (morph && !morph.contains(e.target) && !(sheet && sheet.contains(e.target))) closeMorph(); }
  function escKey(e) { if (e.key === "Escape") { if (edit) closeEdit(); else if (sheet) closeSheet(); else if (morph) closeMorph(); } }
  function closeMorph(instant) {
    if (!morph) return;
    var bar = morph;
    morph = null;
    document.documentElement.classList.remove("fm-morphing");
    document.removeEventListener("pointerdown", outside, !0);
    window.removeEventListener("resize", closeMorphNow);
    bar.classList.remove("is-np");
    var np = bar.querySelector(":scope > .fm-hb > .fm-hb-np"), fin = function () { if (!bar.classList.contains("is-np")) { np && (np.innerHTML = ""); bar.style.width = ""; bar.style.height = ""; } };
    if (instant) fin(); else setTimeout(fin, 380);
    deco();
  }

  /* ---------- chat live bar under the chat header ---------- */
  function chatBar() {
    // dc (t514u): no separate now-playing pill; the live top bar is the only surface
    var c = q("#chat"), bar = c && c.querySelector(".fm-bar");
    bar && bar.remove();
    c && c.classList.remove("chat-has-fm");
  }


  /* ---------- floating reactions (everyone sees them) ---------- */
  function float(e, fromX) {
    if (EMO.indexOf(e) < 0) return;
    var box = q(".fm-floats");
    if (!box) { box = document.createElement("div"); box.className = "fm-floats"; box.setAttribute("aria-hidden", "true"); document.body.appendChild(box); }
    if (box.childElementCount > 24) box.firstChild.remove();
    var s = document.createElement("span"), anchor = sheet && q(".fm-reacts", sheet), r = anchor ? anchor.getBoundingClientRect() : null;
    s.className = "fm-float";
    s.textContent = e;
    var x = fromX != null ? fromX - 15 + (Math.random() - 0.5) * 16 : r ? r.left + Math.random() * r.width : innerWidth - 40 - Math.random() * 60, y = r ? r.top - (fromX != null ? 30 : 0) : innerHeight - 120;
    s.style.left = Math.round(x) + "px";
    s.style.top = Math.round(y) + "px";
    s.style.setProperty("--dx", Math.round((Math.random() - 0.5) * 70) + "px");
    s.style.setProperty("--rot", Math.round((Math.random() - 0.5) * 40) + "deg");
    box.appendChild(s);
    setTimeout(function () { s.remove(); }, RM.matches ? 1300 : 2600);
  }
  function pop(b) { b.classList.remove("is-pop"); void b.offsetWidth; b.classList.add("is-pop"); setTimeout(function () { b.classList.remove("is-pop"); }, 420); }
  function react(e, fromX) {
    if (Date.now() - lastReact < 650) return !1;
    lastReact = Date.now();
    sentE[e + "|"] = Date.now();
    float(e, fromX);
    api("/api/fm/react", { e: e }).then(function (r) { r && !r.ok && r.error && toast(r.error === "slow down" ? "Easy, one at a time" : r.error); });
    return !0;
  }
  /* dc t536u: press-and-slide reactions (iMessage tapback / Telegram style). Touch down anywhere on the
     pill, slide across: the emoji under the thumb lifts and magnifies on a spring, its neighbours lean in,
     each change gives a light tick. Release sends the hovered one (a plain tap sends too), release away
     from the pill cancels. The pill is touch-action:none and touchmove is cancelled, so neither the page
     nor the panel scrolls during the gesture; renders wait until it ends. */
  var rxG = null, rxAt = 0;
  function rxHit(x, y) {
    var g = rxG, r = g.r;
    if (y < r.top - 64 || y > r.bottom + 30 || x < r.left - 16 || x > r.right + 16) return -1;
    var bi = -1, bd = 1e9;
    for (var i = 0; i < g.cx.length; i++) { var d = Math.abs(x - g.cx[i]); if (d < bd) { bd = d; bi = i; } }
    return bi;
  }
  function rxSet(i) {
    var g = rxG;
    if (!g || i === g.i) return;
    g.i = i;
    g.btns.forEach(function (b, k) { b.classList.toggle("is-hov", k === i); b.classList.toggle("is-near", i >= 0 && Math.abs(k - i) === 1); });
    g.box.classList.toggle("is-sliding", i >= 0);
    if (i >= 0 && g.moved && window.haptic) window.haptic(5);
  }
  function rxStart(e) {
    var box = e.target.closest && e.target.closest(".fm-reacts");
    if (!box || rxG || (e.pointerType === "mouse" && e.button)) return;
    e.preventDefault();
    var btns = [].slice.call(box.querySelectorAll("button[data-e]"));
    rxG = { box: box, btns: btns, r: box.getBoundingClientRect(), cx: btns.map(function (b) { var r = b.getBoundingClientRect(); return r.left + r.width / 2; }), i: -2, id: e.pointerId, moved: !1, x0: e.clientX };
    try { box.setPointerCapture(e.pointerId); } catch (_) {}
    box.classList.add("is-press");
    rxSet(rxHit(e.clientX, e.clientY));
    box.addEventListener("pointermove", rxMove);
    box.addEventListener("pointerup", rxUp);
    box.addEventListener("pointercancel", rxCancel);
  }
  function rxMove(e) { if (!rxG || e.pointerId !== rxG.id) return; if (Math.abs(e.clientX - rxG.x0) > 4) rxG.moved = !0; rxSet(rxHit(e.clientX, e.clientY)); }
  function rxEnd(send) {
    var g = rxG;
    if (!g) return;
    rxG = null; rxAt = Date.now();
    g.box.removeEventListener("pointermove", rxMove); g.box.removeEventListener("pointerup", rxUp); g.box.removeEventListener("pointercancel", rxCancel);
    var b = send && g.i >= 0 ? g.btns[g.i] : null;
    g.btns.forEach(function (x) { x.classList.remove("is-near"); x !== b && x.classList.remove("is-hov"); });
    g.box.classList.remove("is-press", "is-sliding");
    if (b) rxSend(b); else g.box.setAttribute("data-rx", "cancel");
    b && setTimeout(function () { b.classList.remove("is-hov"); }, 30);
    if (dirty) setTimeout(function () { !rxG && dirty && renderSheet(); }, 0);
  }
  function rxUp(e) { if (rxG && e.pointerId === rxG.id) { rxSet(rxHit(e.clientX, e.clientY)); rxEnd(!0); } }
  function rxCancel() { rxEnd(!1); }
  function rxSend(b) {
    var e = b.getAttribute("data-e"), r = b.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    pop(b);
    if (!react(e, x)) return;
    var box = b.closest(".fm-reacts");
    box && box.setAttribute("data-rx", "sent:" + e);
    if (RM.matches || !document.body.animate) return;
    var fly = document.createElement("span"), ring = document.createElement("span");
    fly.className = "fm-rx-fly"; fly.textContent = e; ring.className = "fm-rx-ring";
    [fly, ring].forEach(function (n) { n.setAttribute("aria-hidden", "true"); n.style.left = Math.round(x) + "px"; n.style.top = Math.round(y) + "px"; document.body.appendChild(n); });
    var T = "translate(-50%,-50%) ";
    fly.animate([
      { transform: T + "translateY(-14px) scale(1.65)", opacity: 1 },
      { transform: T + "translateY(-30px) scale(2.25)", opacity: 1, offset: 0.3 },
      { transform: T + "translateY(-44px) scale(1.9) rotate(-6deg)", opacity: 1, offset: 0.55 },
      { transform: T + "translateY(-96px) scale(1.15) rotate(4deg)", opacity: 0 }
    ], { duration: 820, easing: "cubic-bezier(.22,.9,.3,1)" }).onfinish = function () { fly.remove(); };
    ring.animate([{ transform: T + "scale(.35)", opacity: 0.6 }, { transform: T + "scale(1.9)", opacity: 0 }], { duration: 560, easing: "cubic-bezier(.2,.8,.2,1)" }).onfinish = function () { ring.remove(); };
  }

  /* ---------- visualizer: analyser (non-iOS) > uploaded loudness map > idle ---------- */
  var vizRaf = 0, vizE = 0;
  function viz() {
    vizRaf = 0;
    var cv = sheet && q(".fm-viz", sheet);
    if (!cv || !cv.isConnected) return;
    var dpr = Math.min(2, window.devicePixelRatio || 1), W = cv.clientWidth, H = cv.clientHeight, N = 28;
    if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    var g = cv.getContext("2d"), c = calc(), t = performance.now() / 1e3, lv = [], src = "idle";
    if (on && c && !c.paused && actx && actx._an && actx.state === "running") {
      var fd = new Uint8Array(actx._an.frequencyBinCount);
      actx._an.getByteFrequencyData(fd);
      for (var i = 0; i < N; i++) { var a0 = Math.floor(Math.pow(i / N, 1.6) * (fd.length - 2)), a1 = Math.max(a0 + 1, Math.floor(Math.pow((i + 1) / N, 1.6) * (fd.length - 2))), sm = 0; for (var j = a0; j < a1; j++) sm += fd[j]; lv.push(sm / (a1 - a0) / 255); }
      src = "analyser";
    } else if (c && !c.paused && waves[c.tr.id] && waves[c.tr.id].length) {
      var wv = waves[c.tr.id], pt = c.t * 10, k0 = Math.min(wv.length - 1, Math.floor(pt)), amp = wv[k0] / 255;
      for (var b = 0; b < N; b++) { var wob = 0.55 + 0.45 * Math.sin(b * 1.9 + t * 7.3 + Math.sin(t * 2.1 + b)), tilt = 1 - Math.abs(b - N * 0.35) / N; lv.push(Math.max(0.04, amp * wob * (0.6 + 0.6 * tilt))); }
      src = on ? "map" : "map-idle";
    } else for (var n = 0; n < N; n++) lv.push(0.08 + 0.07 * (1 + Math.sin(t * 1.6 + n * 0.55)) * (c && !c.paused ? 1 : 0.5));
    cv.setAttribute("data-src", src);
    // dc (t521u): smooth layered waves instead of bars. Energy comes from the same sources (live
    // analyser, the song's loudness map, or a calm idle swell) and is eased so motion stays fluid.
    var en = 0;
    for (var m = 0; m < N; m++) en += Math.min(1, lv[m]);
    en = src === "idle" ? (c && !c.paused ? 0.3 : 0.12) : Math.min(1, en / N * 1.6);
    vizE += (en - vizE) * (RM.matches ? 1 : 0.06);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    var cs2 = getComputedStyle(cv), c1 = cs2.color, c2 = cs2.getPropertyValue("--fm-viz2").trim() || c1, mid = H / 2, tt = RM.matches ? 0 : t;
    var L = [[1, 1.15, 0.9, 1.9, 0.95], [0.72, 1.75, -1.25, 1.4, 0.55], [0.5, 2.6, 1.7, 1.1, 0.32]];
    for (var k = L.length - 1; k >= 0; k--) {
      var ly = L[k], A = (H * 0.46) * (0.34 + 0.66 * vizE) * ly[0], fr = ly[1] * Math.PI * 2 / Math.max(1, W), ph = tt * ly[2];
      var gr = g.createLinearGradient(0, 0, W, 0);
      gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(0.18, c1); gr.addColorStop(0.6, c2); gr.addColorStop(0.85, c1); gr.addColorStop(1, "rgba(0,0,0,0)");
      g.beginPath();
      for (var x = 0; x <= W; x += 2) {
        var env = Math.pow(Math.sin(Math.PI * x / W), 1.4), y = mid + A * env * (Math.sin(fr * x + ph) * 0.78 + Math.sin(fr * 2.3 * x - ph * 1.6) * 0.22);
        x ? g.lineTo(x, y) : g.moveTo(x, y);
      }
      g.strokeStyle = gr; g.lineWidth = ly[3]; g.globalAlpha = ly[4]; g.lineCap = "round"; g.lineJoin = "round";
      g.stroke();
      if (!k) { g.lineTo(W, mid); g.lineTo(0, mid); g.closePath(); g.fillStyle = gr; g.globalAlpha = 0.12; g.fill(); }
    }
    g.globalAlpha = 1;
    if (!RM.matches && !document.hidden) vizRaf = requestAnimationFrame(viz);
  }
  function vizStart() { if (!vizRaf) vizRaf = requestAnimationFrame(viz); }

  /* ---------- sheet: listener view + owner studio (Now / Queue / Station) ---------- */
  function when(ts) {
    var d = new Date(ts), t = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }), td = new Date();
    return (d.toDateString() === td.toDateString() ? "today" : d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })) + " at " + t;
  }
  function li(t, extra, cls) {
    return '<li class="fm-li ' + (cls || "") + '" data-id="' + esc(t.id) + '">' + art(t, "fm-sm") + '<span class="fm-li-t"><span class="fm-li-1"><b>' + esc(t.title || "Untitled") + "</b>" + E(t) + "</span><small>" + (sub(t) || "&nbsp;") + "</small></span>" + (extra || "") + "</li>";
  }
  /* Compact layout (dc, 2026-11-09: "keep it more compact"): same panel, header, rows and dividers as the + menu's Music picker. */
  function heroHTML(c, o) {
    if (!c) {
      /* dc t532u: polished off-air card — logo, Off air status, one short line, owner entry points */
      var n = S && S.list ? S.list.length : 0, line = S && S.sched ? "Back on air " + esc(when(S.sched)) : o ? (n ? n + (n === 1 ? " song" : " songs") + " ready to play" : "Add a few songs to start your station") : "Nothing playing right now. Check back soon.";
      return '<div class="fm-hero is-off"><div class="fm-off"><span class="fm-off-logo" role="img" aria-label="Misery FM"></span>' +
        '<span class="fm-off-st"><i aria-hidden="true"></i>' + (S && S.sched ? "Scheduled" : "Off air") + "</span>" +
        '<p class="fm-off-l">' + line + "</p>" +
        '<canvas class="fm-viz" aria-hidden="true"></canvas>' +
        (o ? '<div class="fm-off-act"><button type="button" class="fm-btn fm-primary fm-golive" data-a="golive" aria-label="Go live" title="Go live"' + (n ? "" : " disabled") + ">" + ico("golive") + "</button>" +
          '<button type="button" class="fm-btn fm-off-add" data-a="add">' + ico("plus") + "Add songs</button></div>" : "") +
        "</div></div>";
    }
    var t = c.tr;
    return '<div class="fm-hero"><div class="fm-np"><div class="fm-cover">' + art(t, "fm-big") + (c.paused ? '<span class="fm-paused" aria-label="Paused">' + ico("pause") + "</span>" : "") + "</div>" +
      '<div class="fm-np-tx"><div class="fm-ttl"><b>' + esc(t.title || "Untitled") + "</b>" + E(t) + "</div>" +
      '<div class="fm-sub">' + (sub(t) || "Misery FM") + "</div>" + (t.genre ? '<span class="fm-chip">' + esc(t.genre) + "</span>" : "") + "</div>" +
      (o ? '<button type="button" class="fm-ib" data-a="edit" data-id="' + esc(t.id) + '" aria-label="Edit this song">' + ico("edit") + "</button>" : "") +
      '<button type="button" class="fm-ib fm-listen' + (on ? " is-on" : "") + '" data-a="listen" aria-pressed="' + on + '" aria-label="' + (on ? "Mute" : "Listen live") + '">' + ico(on ? "mute" : "play") + "</button></div>" +
      '<canvas class="fm-viz" aria-hidden="true"></canvas>' +
      '<div class="fm-prog">' + (o ? '<input type="range" class="fm-scrub" min="0" max="' + Math.floor(c.d) + '" step="1" value="' + Math.floor(c.t) + '" aria-label="Seek the station">' : '<span class="fm-pbar fm-pbar-l"><i></i></span>') +
      '<div class="fm-times"><span class="fm-el">' + fmt(c.t) + '</span><span class="fm-rem">-' + fmt(c.d - c.t) + "</span></div></div>" +
      (t.notes ? '<p class="fm-tnote">' + esc(t.notes) + "</p>" : "") +
      "</div>";
  }
  function listenHTML() {
    return VOLOK && on ? '<label class="fm-vol">' + ico("vol") + '<input type="range" min="0" max="1" step="0.01" value="' + vol + '" data-a="vol" aria-label="Volume"></label>' : "";
  }
  function nowHTML() {
    var c = calc(), o = owner(), h = heroHTML(c, o);
    if (o) {
      if (c) {
        h += '<div class="fm-tp" role="group" aria-label="Station controls">' +
          '<button type="button" class="fm-ib fm-tog' + (S.shuffle ? " is-on" : "") + '" data-a="shuffle" aria-pressed="' + !!S.shuffle + '" aria-label="Shuffle">' + ico("shuffle") + "</button>" +
          '<button type="button" class="fm-tpb fm-tpb-s" data-a="prev" aria-label="Previous (restarts the song after 3 seconds)">' + gly("prev") + "</button>" +
          '<button type="button" class="fm-tpb fm-tpb-pp" data-a="' + (c.paused ? "resume" : "pause") + '" aria-label="' + (c.paused ? "Resume the station" : "Pause the station for everyone") + '">' + gly(c.paused ? "play" : "pause") + "</button>" +
          '<button type="button" class="fm-tpb fm-tpb-s" data-a="skip" aria-label="Skip">' + gly("next") + "</button>" +
          '<button type="button" class="fm-ib fm-tog' + (S.repeat !== "off" ? " is-on" : "") + '" data-a="repeat" aria-label="Repeat: ' + S.repeat + '">' + ico("repeat") + (S.repeat === "one" ? '<em class="fm-one">1</em>' : "") + "</button>" +
          "</div>";
      }
    }
    if (c) {
      h += listenHTML();
      h += '<div class="fm-reacts" role="group" aria-label="Send a reaction">' + EMO.map(function (e) { return '<button type="button" data-a="react" data-e="' + e + '" aria-label="React ' + e + '">' + e + "</button>"; }).join("") + "</div>";
      if (c.up.length) h += '<h3 class="fm-h">Up next' + (S.shuffle ? " · shuffled" : "") + '</h3><ol class="fm-list">' + c.up.slice(0, 3).map(function (t) { return li(t, '<span class="fm-dur">' + fmt(t.dur) + "</span>"); }).join("") + "</ol>";
    }
    return h;
  }
  var addDraft=null, lookupEpoch=0, lookupAbort=null, pickMeta=null;
  function cancelLookup(){lookupEpoch++;if(lookupAbort)lookupAbort.abort();lookupAbort=null;}
  function beginAdd(){if(!owner())return;cancelLookup();pickMeta=null;addDraft={url:'',meta:null,status:'',busy:false};tab='queue';renderSheet();}
  function addFormHTML(){
    if(!addDraft)return '';
    var d=addDraft,m=d.meta;
    return '<section class="fm-add-song" aria-label="Add a song"><div class="fm-add-hd"><b>Add a song</b><button type="button" class="fm-ib" data-a="addcancel" aria-label="Cancel adding song">'+ico('x')+'</button></div><label class="fm-add-label">Apple Music song URL<input class="fm-apple-url" type="url" inputmode="url" maxlength="2048" autocomplete="off" placeholder="https://music.apple.com/…" value="'+esc(d.url)+'"></label><button type="button" class="fm-btn" data-a="applelookup"'+(d.busy?' disabled':'')+'>'+ (d.busy?'Finding song…':'Match song')+'</button>'+
      (m?'<div class="fm-match">'+(m.art?'<img src="'+esc(m.art)+'" alt="">':'')+'<span><strong>'+esc(m.title)+'</strong><small>'+esc(m.artist)+'</small><small>'+esc(m.album)+'</small></span></div>':'')+
      '<p class="fm-add-status" role="status" aria-live="polite">'+esc(d.status)+'</p><button type="button" class="fm-btn fm-add-audio" data-a="addaudio"'+(d.busy||(d.url.trim()&&!m)?' disabled':'')+'>'+ico('plus')+'Choose audio file'+(m?' & add song':'')+'</button><p class="fm-add-hint">'+(m?'Attach your audio file. The matched metadata and artwork will be applied.':'Match an Apple Music link, or choose your own audio file directly.')+' MP3, M4A, AAC · 25 MB.</p></section>';
  }
  function appleSongRef(value){
    try{var u=new URL(value.trim());if(u.protocol!=='https:'||u.hostname!=='music.apple.com'||u.port||u.username||u.password)return null;var id=u.searchParams.get('i')||(/\/song\/(?:[^/]+\/)?(\d+)\/?$/.exec(u.pathname)||[])[1];if(!/^\d{5,20}$/.test(id||''))return null;var country=(/^\/([a-z]{2})\//i.exec(u.pathname)||[])[1]||'us';return{id:id,country:country.toLowerCase()};}catch(e){return null;}
  }
  function catalogArt(value){try{var u=new URL(value);return u.protocol==='https:'&&/(^|\.)mzstatic\.com$/.test(u.hostname)?u.href.replace(/\/\d+x\d+bb\./,'/600x600bb.'):'';}catch(e){return '';}}
  async function matchApple(){
    if(!owner()||!addDraft)return;var input=q('.fm-apple-url',sheet);if(input){addDraft.url=input.value;input.blur();}
    cancelLookup();var epoch=lookupEpoch,d=addDraft,ref=appleSongRef(d.url);d.meta=null;
    if(!ref){d.status='Paste an Apple Music song link (album links need a selected song).';renderSheet();return;}
    d.busy=true;d.status='';renderSheet();var ac=new AbortController();lookupAbort=ac;var timer=setTimeout(function(){ac.abort();},10000);
    try{var response=await fetch('https://itunes.apple.com/lookup?id='+ref.id+'&entity=song&country='+ref.country,{signal:ac.signal});if(!response.ok)throw Error('Catalog unavailable. Try again.');var data=await response.json();if(epoch!==lookupEpoch||addDraft!==d)return;var track=(data.results||[]).find(function(t){return String(t.trackId)===ref.id&&t.trackName&&t.artistName;});if(!track)throw Error('Song not found in this storefront. Try another Apple Music song link.');
      d.meta={title:String(track.trackName).slice(0,120),artist:String(track.artistName).slice(0,120),album:String(track.collectionName||'').slice(0,120),year:String(track.releaseDate||'').slice(0,4),genre:String(track.primaryGenreName||'').slice(0,120),explicit:track.trackExplicitness==='explicit',dur:(+track.trackTimeMillis||0)/1000,art:catalogArt(track.artworkUrl100)};d.status='Song matched. Choose your audio file to add it.';
    }catch(e){if(epoch===lookupEpoch&&addDraft===d)d.status=e.name==='AbortError'?'Lookup timed out. Try again.':e.message||'Could not match this song. Try again.';}
    finally{clearTimeout(timer);if(epoch===lookupEpoch&&addDraft===d){d.busy=false;lookupAbort=null;renderSheet();}}
  }
  function chooseAddAudio(){if(!owner()||!addDraft||addDraft.busy||(addDraft.url.trim()&&!addDraft.meta))return;pickMeta=addDraft.meta?Object.assign({},addDraft.meta):null;var file=picker('audio');file.multiple=!pickMeta;file.click();}
  async function matchedCover(url){var ac=new AbortController(),timer=setTimeout(function(){ac.abort();},10000);try{var r=await fetch(url,{signal:ac.signal});return r.ok?await r.blob():null;}catch(e){return null;}finally{clearTimeout(timer);}}
  function queueHTML() {
    var c = calc(), L = S.list, Q = S.q || [];
    var h = '<div class="fm-upl">'+addFormHTML()+(addDraft?'':'<button type="button" class="fm-add" data-a="add">' + ico("plus") + "<span>Add songs</span><small>Apple Music link or audio file</small></button>") +
      (ups.length ? '<ul class="fm-ups">' + ups.map(function (u) { return '<li class="' + (u.err ? "is-err" : u.done ? "is-done" : "") + '"><span><b>' + esc(u.name) + "</b><small>" + esc(u.st) + '</small></span><span class="fm-upbar"><i style="transform:scaleX(' + (u.p || 0).toFixed(3) + ')"></i></span></li>'; }).join("") + "</ul>" : "") + "</div>";
    if (!L.length) return h + '<p class="fm-empty">No songs yet.</p>';
    var tot = L.reduce(function (s, t) { return s + durOf(t); }, 0);
    h += '<h3 class="fm-h">Library · ' + L.length + (L.length === 1 ? " song" : " songs") + " · " + fmt(tot) + '<small>Drag to reorder</small></h3><ol class="fm-list fm-q">';
    h += L.map(function (t, i) {
      var cur = c && c.i === i, qn = Q.indexOf(t.id);
      return li(t, (qn >= 0 ? '<span class="fm-chip fm-chip-q">Next' + (qn ? " " + (qn + 1) : "") + "</span>" : "") + '<span class="fm-dur">' + fmt(t.dur) + "</span>" +
        '<button type="button" class="fm-ib" data-a="playnow" aria-label="Play ' + esc(t.title) + ' now">' + ico(cur ? "restart" : "play") + "</button>" +
        '<button type="button" class="fm-ib" data-a="playnext" aria-label="Play ' + esc(t.title) + ' next">' + ico("next1") + "</button>" +
        '<button type="button" class="fm-ib" data-a="edit" aria-label="Edit ' + esc(t.title) + '">' + ico("more") + "</button>", cur ? "is-cur" : "")
        .replace('<li class="fm-li', '<li class="fm-li fm-qi').replace(/(<li [^>]*>)/, '$1<button type="button" class="fm-drag" aria-label="Reorder ' + esc(t.title) + ' (arrow keys)">' + ico("grip") + "</button>");
    }).join("");
    return h + "</ol>";
  }
  function pad(n) { return ("0" + n).slice(-2); }
  function localIn(ts) { if (!ts) return ""; var d = new Date(ts); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + "T" + pad(d.getHours()) + ":" + pad(d.getMinutes()); }
  /* dc (t516u): Station reworked into grouped compact rows (icon, label + status, control),
     the same row rhythm and dividers as the + chat menu. */
  function srow(icon, label, sub, ctrl, cls) {
    return '<div class="fm-sr' + (cls ? " " + cls : "") + '"><span class="fm-sr-i">' + ico(icon) + '</span><span class="fm-sr-t"><b>' + label + "</b>" + (sub ? "<small>" + sub + "</small>" : "") + "</span>" + (ctrl || "") + "</div>";
  }
  var XF_MAX = 6;
  function xfLabel(v) { return v ? v + "s" : "Off"; }
  function stepHTML(v) {
    return '<span class="fm-step" role="group" aria-label="Crossfade"><button type="button" class="fm-step-b" data-a="xfm" aria-label="Less crossfade"' + (v <= 0 ? " disabled" : "") + '><svg ' + SV + '><path d="M20 12L4 12"/></svg></button>' +
      '<output class="fm-xf-v" aria-live="polite">' + xfLabel(v) + '</output><button type="button" class="fm-step-b" data-a="xfp" aria-label="More crossfade"' + (v >= XF_MAX ? " disabled" : "") + '><svg ' + SV + '><path d="M12.001 4.00101V20.001"/><path d="M20.001 12.001L4.00098 12.001"/></svg></button></span>';
  }
  function stationHTML() {
    var st = S.stats || {}, c = calc(), lv = live(), up = c && st.since ? fmt((now() - st.since) / 1e3) : "–";
    var air = lv ? '<button type="button" class="fm-pill fm-pill-stop" data-a="stop">Stop</button>' : '<button type="button" class="fm-pill fm-pill-go fm-golive" data-a="golive" aria-label="Go live" title="Go live"' + (S.list.length ? "" : " disabled") + ">" + ico("golive") + "</button>";
    return '<h3 class="fm-h">Broadcast</h3><div class="fm-grp">' +
      srow("radio", lv ? (c && c.paused ? "Paused" : "On air") : "Off air", lv ? (S.listeners || 0) + " listening · " + up : S.list.length ? S.list.length + (S.list.length === 1 ? " song" : " songs") + " ready" : "Add songs in Queue first", air, lv ? "is-live" : "") +
      srow("xf", "Crossfade", "Blend between songs", stepHTML(Math.round(S.xf || 0))) +
      srow("clock", "Scheduled go-live", S.sched ? "Goes live " + esc(when(S.sched)) : "Not scheduled",
        '<span class="fm-sr-c"><input type="datetime-local" class="fm-sched-in" value="' + localIn(S.sched) + '" aria-label="Go-live time">' +
        '<button type="button" class="fm-sr-b" data-a="sched" aria-label="Schedule">' + ico("check") + "</button>" +
        (S.sched ? '<button type="button" class="fm-sr-b" data-a="schedclr" aria-label="Clear schedule">' + ico("x") + "</button>" : "") + "</span>", "fm-sr-sched") +
      "</div>" +
      '<h3 class="fm-h">Session</h3><dl class="fm-stats">' +
      [["Listening", S.listeners || 0], ["Peak", st.peak || 0], ["Played", st.played || 0], ["Reactions", st.reacts || 0], ["On air", up], ["Library", S.list.length]].map(function (r) { return "<div><dt>" + r[0] + "</dt><dd>" + esc(r[1]) + "</dd></div>"; }).join("") + "</dl>";
  }
  /* Placeholder until the first state arrives (or if the station API is down), so the sheet is never blank. */
  var BLANK = { live: !1, paused: !1, pos: 0, idx: 0, startedAt: 0, v: -1, now: 0, list: [], q: [], upNext: [], hist: [], listeners: 0, shuffle: !1, repeat: "all", xf: 0, note: "", sched: 0, stats: { since: 0, played: 0, peak: 0, reacts: 0 } };
  function renderSheet() {
    if (!sheet) return;
    if (!S) { S = BLANK; try { renderSheet(); } finally { S = null; } return; }
    var ae = document.activeElement, body = q(".fm-sh-body", sheet);
    if (drag || rxG || (ae && sheet.contains(ae) && /^(TEXTAREA|SELECT)$|^INPUT$/.test(ae.tagName) && ae.type !== "range" && ae.type !== "file" && !edit)) { dirty = !0; return; }
    dirty = !1;
    if (!owner() && tab !== "now") tab = "now";
    tabsSync();
    var swap = sheet.getAttribute("data-tab") && sheet.getAttribute("data-tab") !== tab, h0 = swap ? sheet.offsetHeight : 0;
    sheet.querySelectorAll(".fm-tab").forEach(function (b) { var s = b.getAttribute("data-tab") === tab; b.classList.toggle("is-on", s); b.setAttribute("aria-selected", s); });
    var st = body.scrollTop;
    body.innerHTML = tab === "queue" ? queueHTML() : tab === "station" ? stationHTML() : nowHTML();
    body.scrollTop = st;
    sheet.setAttribute("data-tab", tab);
    if (swap && !RM.matches && sheet.animate) { var h1 = sheet.offsetHeight; h1 !== h0 && sheet.animate([{ height: h0 + "px" }, { height: h1 + "px" }], { duration: 260, easing: "cubic-bezier(.22,.8,.25,1)" }); }
    vizStart();
  }
  function lockScroll(v) {
    var b = document.body, de = document.documentElement;
    if (v) { lockScroll.y = window.scrollY; b.style.top = -lockScroll.y + "px"; de.classList.add("fm-lock"); }
    else { de.classList.remove("fm-lock"); b.style.top = ""; window.scrollTo(0, lockScroll.y || 0); }
  }
  function lcText() {
    var c = calc();
    if (!live()) return S && S.sched ? "Offline · scheduled" : "Offline";
    return (c && c.paused ? "Paused" : '<i class="fm-lc-dot"></i>Live') + " · " + ((S && S.listeners) || 0) + " listening";
  }
  /* Same spot as the + menu panels: above the composer on Chat, bottom-centred elsewhere. */
  function place() {
    if (!sheet) return;
    var vw = document.documentElement.clientWidth, vh = window.innerHeight, w = Math.min(360, vw - 24), plus = null;
    document.querySelectorAll(".chat-plus").forEach(function (b) { var r = b.getBoundingClientRect(); if (r.width && r.bottom > 0 && r.top < vh) plus = b; });
    var row = plus && plus.parentNode, r = row && row.getBoundingClientRect(), left, bottom;
    if (r && r.width) { left = Math.max(12, Math.min(r.left, vw - w - 12)); bottom = Math.max(12, vh - r.top + 8); sheet.classList.add("is-anch"); }
    else { left = (vw - w) / 2; bottom = 0; sheet.classList.remove("is-anch"); }
    sheet.style.setProperty("--fm-l", left + "px");
    sheet.style.setProperty("--fm-w", w + "px");
    sheet.style.setProperty("--fm-b", bottom + "px");
    // never grow over the page's top bar (like the Music panel, which stays below the chat header)
    var top = 0;
    document.querySelectorAll(".panel.on .chat-head, .nav").forEach(function (h) { var hr = h.getBoundingClientRect(); if (hr.height && hr.bottom > top && hr.bottom < vh / 2) top = hr.bottom; });
    var room = vh - (bottom || 12) - top - 10 - (bottom ? 0 : (parseFloat(getComputedStyle(sheet).getPropertyValue("--fm-sab")) || 0));
    sheet.style.setProperty("--fm-mh", Math.max(260, Math.min(560, room)) + "px");
  }
  function openSheet(t) {
    if (t) tab = t;
    if (morph) closeMorph(!0);
    if (sheet) { renderSheet(); return; }
    getMe().then(function () {
      if (sheet) return;
      if (!S) refresh();
      var back = document.createElement("div");
      back.className = "fm-scrim";
      sheet = document.createElement("div");
      sheet.className = "fm-sheet";
      sheet.setAttribute("role", "dialog");
      sheet.setAttribute("aria-modal", "true");
      sheet.setAttribute("aria-label", "Misery FM");
      sheet._back = back;
      sheet.className = "fm-sheet fm-c fm-root";
      sheet.innerHTML = frameHTML();
      document.body.appendChild(back);
      document.body.appendChild(sheet);
      sheet.addEventListener("scroll", function () { if (sheet.scrollTop) sheet.scrollTop = 0; });
      lockScroll(!0);
      back.addEventListener("click", closeSheet);
      back.addEventListener("touchmove", function (e) { e.preventDefault(); }, { passive: !1 });
      wire(sheet);
      swipe(sheet);
      document.addEventListener("keydown", escKey);
      renderSheet();
      paint();
      place();
      window.addEventListener("resize", place);
      // grows out of the + button like the other + menu panels
      if (RM.matches) sheet.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160 });
      else sheet.animate([{ transform: "scale(.7)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 260, easing: "cubic-bezier(.3,1.25,.5,1)" });
      var cl = q('[data-a="close"]', sheet);
      cl && cl.focus({ preventScroll: !0 });
    });
  }
  /* dc (t516u): the FM menu is a + menu sub-panel. Same header as the Music picker (Back, title, Close),
     with the real Misery FM logo as the title. */
  var SV = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
  function frameHTML() {
    return '<div class="chat-pbig-hd fm-sh-hd"><button type="button" class="chat-pbig-btn fm-back" data-a="back" aria-label="Back"><svg ' + SV + '><path d="M15 6C15 6 9.00001 10.4189 9 12C8.99999 13.5812 15 18 15 18"/></svg></button>' +
      '<div class="fm-hd-t"><span class="fm-hd-logo" role="img" aria-label="Misery FM"></span><span class="fm-lc" aria-live="polite"></span></div>' +
      '<button type="button" class="chat-pbig-btn fm-x" data-a="close" aria-label="Close"><svg ' + SV + '><path d="M18.9991 19L5 5.00098"/><path d="M19 5L5.00092 18.999"/></svg></button></div><div class="fm-sh-body"></div>';
  }
  function tabsSync() {
    var tb = q(".fm-tabs", sheet);
    if (owner() && !tb) {
      tb = document.createElement("div"); tb.className = "fm-tabs"; tb.setAttribute("role", "tablist"); tb.setAttribute("aria-label", "Studio");
      tb.innerHTML = [["now", "Now"], ["queue", "Queue"], ["station", "Station"]].map(function (x) { return '<button type="button" role="tab" class="fm-tab" data-a="tab" data-tab="' + x[0] + '">' + x[1] + "</button>"; }).join("");
      q(".fm-sh-hd", sheet).after(tb);
    } else if (!owner() && tb) tb.remove();
  }
  function wire(el) {
    el.addEventListener("click", onAct);
    el.addEventListener('keydown',function(e){if(e.key==='Enter'&&e.target.classList.contains('fm-apple-url')){e.preventDefault();matchApple();}});
    el.addEventListener("input", onInput);
    el.addEventListener("change", onChange);
    el.addEventListener("focusout", function () { setTimeout(function () { dirty && renderSheet(); }, 0); });
    el.addEventListener("pointerdown", dragStart);
    el.addEventListener("pointerdown", rxStart);
    el.addEventListener("touchmove", function (e) { rxG && e.cancelable && e.preventDefault(); }, { passive: !1 });
    el.addEventListener("keydown", dragKey);
  }
  /* Mounted inside the + chat menu: chat.js morphs the menu exactly as for Music / Polls / Globe and
     hands the menu element over. o = { back, close } from chat.js. */
  function mount(m, o) {
    if (sheet && !sheet._mnt) closeSheet();
    if (morph) closeMorph(!0);
    sheet = m; m._mnt = o || {};
    m.classList.add("fm-c", "fm-root", "fm-mnt");
    m.setAttribute("role", "dialog"); m.setAttribute("aria-label", "Misery FM");
    m.innerHTML = frameHTML();
    wire(m);
    m._dispose = function () { unmount(m); };
    m._esc = function () { if (edit) { closeEdit(); return !0; } return !1; };
    if (!S) refresh();
    fitMnt();
    renderSheet(); paint();
    window.addEventListener("resize", fitMnt);
    if (!tickT) tickT = setInterval(tick, 1e3);
    getMe().then(function () { sheet === m && renderSheet(); });
  }
  function fitMnt() {
    if (!sheet || !sheet._mnt) return;
    var row = sheet.parentNode, r = row && row.getBoundingClientRect(), top = 0, vh = window.innerHeight;
    document.querySelectorAll(".panel.on .chat-head, .nav").forEach(function (h) { var hr = h.getBoundingClientRect(); if (hr.height && hr.bottom > top && hr.bottom < vh / 2) top = hr.bottom; });
    sheet.style.setProperty("--fm-mh", Math.max(260, Math.min(540, (r ? r.top : vh) - 8 - top - 12)) + "px");
  }
  function unmount(m) {
    cancelLookup();if(addDraft)addDraft.busy=false;
    if (sheet !== m) return;
    closeEdit(!0);
    sheet = null;
    window.removeEventListener("resize", fitMnt);
  }
  function closeSheet() {
    cancelLookup();if(addDraft)addDraft.busy=false;
    if (!sheet) return;
    if (sheet._mnt) { var mo = sheet._mnt; unmount(sheet); mo.close && mo.close(); return; }
    var sh = sheet, back = sh._back;
    sheet = null;
    closeEdit(!0);
    document.removeEventListener("keydown", escKey);
    window.removeEventListener("resize", place);
    var an = RM.matches ? sh.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 150 }) : sh.animate([{ transform: getComputedStyle(sh).transform === "none" ? "none" : getComputedStyle(sh).transform, opacity: 1 }, { transform: "scale(.7)", opacity: 0 }], { duration: 170, easing: "cubic-bezier(.4,0,.6,1)" });
    an.onfinish = function () { sh.remove(); back.remove(); };
    lockScroll(!1);
  }
  function swipe(sh) {
    var y0 = 0, dy = 0, live2 = !1;
    sh.addEventListener("pointerdown", function (e) {
      if (!e.target.closest(".fm-grab, .fm-sh-hd") || e.target.closest("button")) return;
      live2 = !0; y0 = e.clientY; dy = 0;
      try { sh.setPointerCapture(e.pointerId); } catch (_) {}
    });
    sh.addEventListener("pointermove", function (e) { if (!live2) return; dy = Math.max(0, e.clientY - y0); sh.style.transform = dy ? "translateY(" + dy + "px)" : ""; });
    var end = function () { if (!live2) return; live2 = !1; if (dy > 110) closeSheet(); else { sh.style.transform = ""; } };
    sh.addEventListener("pointerup", end);
    sh.addEventListener("pointercancel", end);
  }

  /* ---------- drag to reorder (touch-friendly handle, arrow keys too) ---------- */
  function dragStart(e) {
    var h = e.target.closest(".fm-drag");
    if (!h || !owner()) return;
    e.preventDefault();
    var row = h.closest("li"), list = row.parentNode, rows = [].slice.call(list.children), from = rows.indexOf(row), r0 = row.getBoundingClientRect();
    var step = rows[1] ? rows[1].getBoundingClientRect().top - rows[0].getBoundingClientRect().top : r0.height;
    drag = { row: row, rows: rows, from: from, to: from, y0: e.clientY, step: step, id: row.getAttribute("data-id") };
    row.classList.add("is-drag");
    try { h.setPointerCapture(e.pointerId); } catch (_) {}
    h.addEventListener("pointermove", dragMove);
    h.addEventListener("pointerup", dragEnd);
    h.addEventListener("pointercancel", dragEnd);
  }
  function dragMove(e) {
    if (!drag) return;
    var dy = e.clientY - drag.y0, to = Math.max(0, Math.min(drag.rows.length - 1, drag.from + Math.round(dy / drag.step)));
    drag.to = to;
    drag.row.style.transform = "translateY(" + dy + "px)";
    drag.rows.forEach(function (r, k) {
      if (r === drag.row) return;
      var s = drag.from < to && k > drag.from && k <= to ? -drag.step : to < drag.from && k >= to && k < drag.from ? drag.step : 0;
      r.style.transform = s ? "translateY(" + s + "px)" : "";
    });
  }
  function dragEnd(e) {
    var h = e.currentTarget;
    h.removeEventListener("pointermove", dragMove);
    h.removeEventListener("pointerup", dragEnd);
    h.removeEventListener("pointercancel", dragEnd);
    if (!drag) return;
    var d = drag;
    drag = null;
    d.rows.forEach(function (r) { r.style.transform = ""; });
    d.row.classList.remove("is-drag");
    if (d.to !== d.from) moveTo(d.id, d.to);
    else if (dirty) renderSheet();
  }
  function moveTo(id, to) {
    var L = S.list, at = L.findIndex(function (t) { return t.id === id; });
    if (at < 0) return;
    var cur = L[S.idx], t = L.splice(at, 1)[0];
    L.splice(to, 0, t);
    S.idx = Math.max(0, L.indexOf(cur));
    renderSheet();
    ctl({ action: "move", id: id, to: to });
  }
  function dragKey(e) {
    var h = e.target.closest && e.target.closest(".fm-drag");
    if (!h || (e.key !== "ArrowUp" && e.key !== "ArrowDown")) return;
    e.preventDefault();
    var id = h.closest("li").getAttribute("data-id"), at = S.list.findIndex(function (t) { return t.id === id; }), to = at + (e.key === "ArrowUp" ? -1 : 1);
    if (to < 0 || to >= S.list.length) return;
    moveTo(id, to);
    var nh = sheet && sheet.querySelector('li[data-id="' + CSS.escape(id) + '"] .fm-drag');
    nh && nh.focus();
  }

  /* ---------- actions ---------- */
  function ctl(body) {
    return api("/api/fm/control", body).then(function (r) { if (r && r.ok) set(r.fm); else toast((r && r.error) || "Something went wrong"); return r; });
  }
  function toast(t) {
    var el2 = q(".fm-toast");
    if (!el2) { el2 = document.createElement("div"); el2.className = "fm-toast"; el2.setAttribute("role", "status"); document.body.appendChild(el2); }
    el2.textContent = t;
    el2.classList.add("is-on");
    clearTimeout(toast.t);
    toast.t = setTimeout(function () { el2.classList.remove("is-on"); }, 2600);
  }
  function confirmFM(msg, ok, cb, danger) {
    var cf = document.createElement("div");
    cf.className = "fm-cf-back";
    cf.innerHTML = '<div class="fm-cf" role="alertdialog" aria-modal="true" aria-label="' + esc(msg) + '"><p>' + esc(msg) + '</p><div class="fm-row"><button type="button" class="fm-btn" data-c="0">Cancel</button><button type="button" class="fm-btn ' + (danger ? "fm-danger" : "fm-primary") + '" data-c="1">' + esc(ok) + "</button></div></div>";
    document.body.appendChild(cf);
    cf.addEventListener("click", function (e) { var b = e.target.closest("[data-c]"); if (!b && e.target !== cf) return; e.stopPropagation(); cf.remove(); b && b.getAttribute("data-c") === "1" && cb(); });
    var y = q('[data-c="1"]', cf);
    y && y.focus();
  }
  function goLiveBurst(button){
    if(RM.matches||!button||button.disabled)return;var rect=button.getBoundingClientRect(),burst=document.createElement('div');burst.className='fm-live-burst';burst.setAttribute('aria-hidden','true');burst.style.left=(rect.left+rect.width/2)+'px';burst.style.top=(rect.top+rect.height/2)+'px';
    for(var i=0;i<12;i++){var ray=document.createElement('i');ray.className='fm-live-ray';ray.style.setProperty('--ray-angle',(i*30)+'deg');ray.style.setProperty('--ray-length',(i%2?72:104)+'px');burst.appendChild(ray);}var ring=document.createElement('i');ring.className='fm-live-ring';burst.appendChild(ring);document.body.appendChild(burst);button.animate&&button.animate([{transform:'scale(.92)'},{transform:'scale(1.09)'},{transform:'scale(1)'}],{duration:380,easing:'cubic-bezier(.2,.8,.2,1)'});setTimeout(function(){burst.remove();},900);
  }
  function onAct(e) {
    var b = e.target.closest("[data-a]");
    if (!b || b.disabled) return;
    var a = b.getAttribute("data-a"), row = b.closest("[data-id]"), id = b.getAttribute("data-id") || (row && row.getAttribute("data-id"));
    if (a === "vol" || a === "xf" || a === "noop") return;
    e.stopPropagation();
    if (a === "listen") listen(!on);
    else if (a === "sheet") openSheet("now");
    else if (a === "collapse") closeMorph();
    else if (a === "close") closeSheet();
    else if (a === "back") { if (sheet && sheet._mnt && sheet._mnt.back) { var bo = sheet._mnt; unmount(sheet); bo.back(); } else closeSheet(); }
    else if (a === "tab") { tab = b.getAttribute("data-tab"); renderSheet(); }
    else if (a === "react") { if (Date.now() - rxAt > 700) rxSend(b); }
    else if (a === "prev") { var cc = calc(); ctl({ action: cc && cc.t > 3 ? "restart" : "prev" }); }
    else if (a === "restart" || a === "skip" || a === "pause" || a === "resume") ctl({ action: a });
    else if (a === "shuffle") ctl({ action: "shuffle", on: !S.shuffle });
    else if (a === "repeat") ctl({ action: "repeat", mode: { all: "one", one: "off", off: "all" }[S.repeat] || "all" });
    else if (a === "golive") {if(owner())goLiveBurst(b);ctl({ action: "live" });} // dc t536u: no confirmation, act immediately
    else if (a === "stop") ctl({ action: "stop" });
    else if (a === "add") { if (!tok()) toast("Sign in again to add songs"); else beginAdd(); }
    else if (a === "applelookup") matchApple();
    else if (a === "addaudio") chooseAddAudio();
    else if (a === "addcancel") {cancelLookup();pickMeta=null;addDraft=null;var url=q('.fm-apple-url',sheet);url&&url.blur();renderSheet();}
    else if (a === "playnow") { closeEdit(); ctl({ action: "play", id: id }); }
    else if (a === "playnext") { closeEdit(); ctl({ action: "next", id: id }).then(function (r) { r && r.ok && toast("Plays next"); }); }
    else if (a === "edit") openEdit(id);
    else if (a === "sched") {
      var si = q(".fm-sched-in", sheet), ts = si && si.value ? new Date(si.value).getTime() : 0;
      if (!ts || ts < Date.now()) return toast("Pick a time in the future");
      ctl({ action: "sched", at: ts }).then(function (r) { r && r.ok && toast("Scheduled for " + when(ts)); });
    } else if (a === "schedclr") ctl({ action: "sched", at: 0 });
    else if (a === "xfm" || a === "xfp") {
      var xv = Math.max(0, Math.min(XF_MAX, Math.round(S.xf || 0) + (a === "xfp" ? 1 : -1))), st2 = b.closest(".fm-step");
      if (st2) st2.outerHTML = stepHTML(xv);
      S.xf = xv; ctl({ action: "xf", sec: xv });
    }
    else if (a === "edclose") closeEdit();
    else if (a === "edsave") saveEdit();
    else if (a === "cover") { pickFor = edit._id; picker("img").click(); }
    else if (a === "coverdel") ctl({ action: "artdel", id: edit._id }).then(function (r) { r && r.ok && fillEdit(); });
    else if (a === "remove") { var t = byId(id); confirmFM("Remove “" + ((t && t.title) || "this song") + "” from Misery FM?", "Remove", function () { closeEdit(); ctl({ action: "remove", id: id }); }, !0); }
  }
  function onInput(e) {
    var a = e.target.getAttribute("data-a");
    if(e.target.classList.contains('fm-apple-url')&&addDraft){cancelLookup();addDraft.url=e.target.value;addDraft.meta=null;addDraft.busy=false;addDraft.status='';var match=q('.fm-match',sheet);match&&match.remove();var status=q('.fm-add-status',sheet);status&&(status.textContent='');var audio=q('[data-a="addaudio"]',sheet);audio&&(audio.disabled=!!addDraft.url.trim());var lookup=q('[data-a="applelookup"]',sheet);lookup&&(lookup.disabled=false,lookup.textContent='Match song');return;}
    if (a === "vol") { vol = +e.target.value; try { localStorage.setItem("mp-fm-vol", vol); } catch (_) {} applyVol(); }
    else if (a === "xf") { var v = q(".fm-xf-v", sheet); v && (v.textContent = e.target.value + " s"); }
    else if (e.target.classList.contains("fm-scrub")) { e.target._busy = 1; var c = calc(); if (c) { q(".fm-el", sheet).textContent = fmt(+e.target.value); q(".fm-rem", sheet).textContent = "-" + fmt(c.d - e.target.value); } }
  }
  function onChange(e) {
    var tg = e.target, a = tg.getAttribute("data-a");
    if (a === "xf") ctl({ action: "xf", sec: +tg.value });
    else if (tg.classList.contains("fm-scrub")) { tg._busy = 0; ctl({ action: "seek", pos: +tg.value }); }
  }

  /* ---------- edit sheet (per song) ---------- */
  function openEdit(id) {
    var t = byId(id);
    if (!t || !owner()) return;
    if (!sheet) { openSheet("queue"); setTimeout(function () { openEdit(id); }, 450); return; }
    closeEdit(!0);
    edit = document.createElement("div");
    edit.className = "fm-edit";
    edit.setAttribute("role", "dialog");
    edit.setAttribute("aria-label", "Edit song");
    edit._id = id;
    edit.addEventListener("click", onAct);
    edit.addEventListener("change", onChange);
    sheet.appendChild(edit);
    fillEdit();
    edGrow(1);
    RM.matches ? edit.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 150 }) : edit.animate([{ opacity: 0, transform: "translateY(24px)" }, { opacity: 1, transform: "none" }], { duration: 320, easing: "cubic-bezier(.2,.85,.25,1)" });
    var f = q('[name="title"]', edit);
    f && f.focus({ preventScroll: !0 });
  }
  /* the mounted + menu panel grows to its full height while the edit form is open, so the form isn't
     squeezed into whatever height the Queue tab had; animated like the tab-switch height change */
  function edGrow(on, instant) {
    if (!sheet || !sheet._mnt) return;
    var h0 = sheet.offsetHeight;
    sheet.classList.toggle("fm-editing", !!on);
    var h1 = sheet.offsetHeight;
    if (!instant && !RM.matches && Math.abs(h1 - h0) > 2 && sheet.animate) sheet.animate([{ height: h0 + "px" }, { height: h1 + "px" }], { duration: 260, easing: "cubic-bezier(.2,.8,.2,1)" });
  }
  function fld(n, label, v, attrs) { return '<label class="fm-f"><span>' + label + '</span><input name="' + n + '" value="' + esc(v || "") + '" ' + (attrs || "") + "></label>"; }
  function fillEdit() {
    if (!edit) return;
    var t = byId(edit._id);
    if (!t) return closeEdit();
    var keep = {};
    edit.querySelectorAll("[name]").forEach(function (i) { keep[i.name] = i.type === "checkbox" ? i.checked : i.value; });
    var v = function (k) { return k in keep ? keep[k] : t[k]; };
    edit.innerHTML = '<div class="chat-pbig-hd fm-ed-hd"><button type="button" class="chat-pbig-btn fm-back" data-a="edclose" aria-label="Back"><svg ' + SV + '><path d="M15 6C15 6 9.00001 10.4189 9 12C8.99999 13.5812 15 18 15 18"/></svg></button><b>Edit song</b><i class="fm-ed-sp" aria-hidden="true"></i></div>' +
      '<div class="fm-ed-body"><div class="fm-ed-art">' + art(t, "fm-ed-cover") + '<div class="fm-ed-artb"><b class="fm-ed-artt">Cover</b><div class="fm-ed-cb"><button type="button" class="fm-btn" data-a="cover">' + (t.art ? "Replace" : "Upload") + "</button>" +
      (t.art ? '<button type="button" class="fm-btn fm-ed-rm" data-a="coverdel">Remove</button>' : "") + '</div><small class="fm-hint">Square JPEG or PNG works best</small></div></div><div class="fm-ed-fs">' +
      fld("title", "Song name", v("title"), 'maxlength="120" autocomplete="off"') + fld("artist", "Artist", v("artist"), 'maxlength="120" autocomplete="off"') + fld("album", "Album", v("album"), 'maxlength="120" autocomplete="off"') +
      '<div class="fm-f2">' + fld("year", "Year", v("year"), 'inputmode="numeric" maxlength="4" pattern="[0-9]*"') + fld("genre", "Genre", v("genre"), 'maxlength="40" autocomplete="off"') + "</div>" +
      '<label class="fm-f"><span>Track notes</span><textarea name="notes" maxlength="280" rows="2" placeholder="Shown to listeners under the song">' + esc(v("notes") || "") + "</textarea></label>" +
      '<label class="fm-sw fm-ed-sw"><span class="fm-ed-swl"><span>Explicit <span class="fm-e" aria-hidden="true">E</span></span><small>Shows the E badge to listeners</small></span><input type="checkbox" name="explicit"' + (v("explicit") ? " checked" : "") + '><span class="fm-sw-k" aria-hidden="true"></span></label></div>' +
      '<div class="fm-row fm-ed-save"><button type="button" class="fm-btn fm-primary fm-wide" data-a="edsave">Save</button></div>' +
      '<div class="fm-row fm-ed-more" data-id="' + esc(t.id) + '"><button type="button" class="fm-btn" data-a="playnow">' + ico("play") + 'Play now</button><button type="button" class="fm-btn" data-a="playnext">' + ico("next1") + 'Play next</button><button type="button" class="fm-btn fm-danger" data-a="remove">Remove</button></div></div>';
  }
  function saveEdit() {
    var b = { action: "edit", id: edit._id };
    edit.querySelectorAll("[name]").forEach(function (i) { b[i.name] = i.type === "checkbox" ? i.checked : i.value; });
    ctl(b).then(function (r) { if (r && r.ok) { toast("Saved"); closeEdit(); } });
  }
  function closeEdit(instant) {
    if (!edit) return;
    var e2 = edit;
    edit = null;
    edGrow(0, instant);
    if (instant || RM.matches) return e2.remove();
    e2.animate([{ opacity: 1 }, { opacity: 0, transform: "translateY(16px)" }], { duration: 200 }).onfinish = function () { e2.remove(); };
    setTimeout(function () { dirty && renderSheet(); }, 220);
  }

  /* ---------- tags: ID3v2.3/2.4 (MP3) and MP4 atoms (M4A/AAC) ---------- */
  function txt(b, enc) {
    try {
      if (enc === 0) return new TextDecoder("latin1").decode(b);
      if (enc === 3) return new TextDecoder("utf-8").decode(b);
      if (enc === 1) return new TextDecoder(b[0] === 0xfe ? "utf-16be" : "utf-16le").decode(b[0] === 0xff || b[0] === 0xfe ? b.subarray(2) : b);
      if (enc === 2) return new TextDecoder("utf-16be").decode(b);
    } catch (e) {}
    return "";
  }
  function clean(s) { return String(s || "").replace(/\u0000+$/g, "").split("\u0000")[0].trim(); }
  function id3(u) {
    var o = {};
    if (u[0] !== 0x49 || u[1] !== 0x44 || u[2] !== 0x33) return o;
    var v = u[3], ss = function (p) { return (u[p] << 21) | (u[p + 1] << 14) | (u[p + 2] << 7) | u[p + 3]; }, end = 10 + ss(6), p = 10;
    if (v < 3) return o;
    if (u[5] & 0x40) p += v === 4 ? ss(10) : ((u[10] << 24) | (u[11] << 16) | (u[12] << 8) | u[13]) + 4;
    end = Math.min(end, u.length);
    while (p + 10 < end) {
      var id = String.fromCharCode(u[p], u[p + 1], u[p + 2], u[p + 3]), sz = v === 4 ? ss(p + 4) : ((u[p + 4] << 24) | (u[p + 5] << 16) | (u[p + 6] << 8) | u[p + 7]) >>> 0;
      if (!/^[A-Z0-9]{4}$/.test(id) || sz <= 0 || p + 10 + sz > end) break;
      var d = u.subarray(p + 10, p + 10 + sz), enc = d[0];
      if (id === "APIC") {
        var k = 1; while (k < d.length && d[k]) k++;
        var mime = new TextDecoder("latin1").decode(d.subarray(1, k)) || "image/jpeg", pt = d[k + 1]; k += 2;
        if (enc === 1 || enc === 2) { while (k + 1 < d.length && (d[k] || d[k + 1])) k += 2; k += 2; } else { while (k < d.length && d[k]) k++; k++; }
        if (!o.pic || pt === 3) o.pic = new Blob([d.subarray(k)], { type: /png/i.test(mime) ? "image/png" : "image/jpeg" });
      } else if (id === "TXXX") {
        var s = txt(d.subarray(1), enc).split("\u0000").filter(function (x) { return x !== ""; });
        if (s[0] && /ITUNESADVISORY|EXPLICIT/i.test(s[0]) && /^(1|4|explicit|yes|true)$/i.test((s[1] || "").trim())) o.explicit = !0;
      } else if (id.charAt(0) === "T") {
        var val = clean(txt(d.subarray(1), enc));
        if (id === "TIT2") o.title = val; else if (id === "TPE1") o.artist = val; else if (id === "TALB") o.album = val;
        else if (id === "TYER" || id === "TDRC" || id === "TORY") o.year = o.year || (val.match(/\d{4}/) || [""])[0];
        else if (id === "TCON") o.genre = val.replace(/^\(\d+\)/, "").trim() || "";
        else if (id === "TLEN") o.dur = (+val || 0) / 1e3;
      }
      p += 10 + sz;
    }
    return o;
  }
  function mp4(u) {
    var o = {}, dv = new DataView(u.buffer, u.byteOffset, u.byteLength);
    var name = function (p) { return String.fromCharCode(u[p], u[p + 1], u[p + 2], u[p + 3]); };
    function walk(s, e, path) {
      for (var p = s; p + 8 <= e;) {
        var sz = dv.getUint32(p), ty = name(p + 4), h = 8;
        if (sz === 1) { sz = dv.getUint32(p + 12) + dv.getUint32(p + 8) * 4294967296; h = 16; } else if (sz === 0) sz = e - p;
        if (sz < 8 || p + sz > e) break;
        var cs = p + h, ce = p + sz;
        if (ty === "moov" || ty === "udta" || ty === "ilst" || ty === "trak" || ty === "mdia") walk(cs, ce, path + "/" + ty);
        else if (ty === "meta") walk(cs + 4, ce, path + "/meta");
        else if (ty === "mvhd") { var ver = u[cs], ts = dv.getUint32(cs + (ver ? 20 : 12)), du = ver ? dv.getUint32(cs + 24) * 4294967296 + dv.getUint32(cs + 28) : dv.getUint32(cs + 16); if (ts) o.dur = du / ts; }
        else if (/\/ilst$/.test(path)) {
          var dp = cs; if (name(dp + 4) !== "data") { p += sz; continue; }
          var dsz = dv.getUint32(dp), kind = dv.getUint32(dp + 8) & 0xffffff, pl = u.subarray(dp + 16, dp + dsz);
          var str = function () { return clean(new TextDecoder("utf-8").decode(pl)); };
          if (ty === "\u00a9nam") o.title = str(); else if (ty === "\u00a9ART") o.artist = str(); else if (ty === "aART" && !o.artist) o.artist = str();
          else if (ty === "\u00a9alb") o.album = str(); else if (ty === "\u00a9day") o.year = (str().match(/\d{4}/) || [""])[0];
          else if (ty === "\u00a9gen") o.genre = str(); else if (ty === "rtng") o.explicit = pl[0] === 1 || pl[0] === 4;
          else if (ty === "covr" && !o.pic) o.pic = new Blob([pl], { type: kind === 14 ? "image/png" : "image/jpeg" });
        }
        p += sz;
      }
    }
    try { walk(0, u.length, ""); } catch (e) {}
    return o;
  }
  function tags(buf) { var u = new Uint8Array(buf); return u[0] === 0x49 && u[1] === 0x44 && u[2] === 0x33 ? id3(u) : name4(u, 4) === "ftyp" ? mp4(u) : {}; }
  function name4(u, p) { return String.fromCharCode(u[p], u[p + 1], u[p + 2], u[p + 3]); }
  // Decode once on the owner's phone: exact length + a 10 Hz loudness map the visualizer follows on iOS.
  function analyse(buf) {
    var C = window.AudioContext || window.webkitAudioContext;
    if (!C) return Promise.resolve(null);
    var ctx;
    try { ctx = new C(); } catch (e) { return Promise.resolve(null); }
    return new Promise(function (res) {
      var done = function (v) { try { ctx.close(); } catch (e) {} res(v); };
      try {
        var pr = ctx.decodeAudioData(buf, function (ab) { done(ab); }, function () { done(null); });
        pr && pr.catch && pr.catch(function () { done(null); });
      } catch (e) { done(null); }
    }).then(function (ab) {
      if (!ab) return null;
      var ch = ab.getChannelData(0), ch2 = ab.numberOfChannels > 1 ? ab.getChannelData(1) : null, win = Math.floor(ab.sampleRate / 10), n = Math.min(36000, Math.floor(ch.length / win)), rms = new Float32Array(n), mx = 1e-6;
      for (var i = 0; i < n; i++) { var s = 0; for (var j = i * win, e = j + win; j < e; j += 4) { var x = ch2 ? (ch[j] + ch2[j]) / 2 : ch[j]; s += x * x; } rms[i] = Math.sqrt(s / (win / 4)); if (rms[i] > mx) mx = rms[i]; }
      var w = new Uint8Array(n);
      for (var k = 0; k < n; k++) w[k] = Math.round(255 * Math.pow(rms[k] / mx, 0.8));
      return { dur: ab.duration, wave: w };
    });
  }
  function metaDur(f) {
    return new Promise(function (res) {
      var u = URL.createObjectURL(f), a = new Audio(), fin = function (v) { try { URL.revokeObjectURL(u); } catch (e) {} res(v); };
      a.preload = "metadata"; a.onloadedmetadata = function () { fin(isFinite(a.duration) ? a.duration : 0); }; a.onerror = function () { fin(0); };
      setTimeout(function () { fin(0); }, 8e3);
      a.src = u;
    });
  }
  function square(blob, size) {
    return new Promise(function (res) {
      var u = URL.createObjectURL(blob), img = new Image();
      img.onload = function () {
        try {
          var s = Math.min(img.naturalWidth, img.naturalHeight), cv = document.createElement("canvas");
          cv.width = cv.height = size || 600;
          cv.getContext("2d").drawImage(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) / 2, s, s, 0, 0, cv.width, cv.height);
          cv.toBlob(function (b) { URL.revokeObjectURL(u); res(b); }, "image/jpeg", 0.88);
        } catch (e) { URL.revokeObjectURL(u); res(null); }
      };
      img.onerror = function () { URL.revokeObjectURL(u); res(blob.size <= 3 * 1024 * 1024 && /jpeg|png|webp/.test(blob.type) ? blob : null); };
      img.src = u;
    });
  }
  function xhr(path, body, type, prog) {
    return new Promise(function (res) {
      var x = new XMLHttpRequest(), h = hdr();
      x.open("POST", API + path);
      x.timeout = 5 * 60e3;
      x.ontimeout = function () { res({ ok: !1, error: "Upload timed out. Check your connection" }); };
      for (var k in h) x.setRequestHeader(k, h[k]);
      x.setRequestHeader("Content-Type", type);
      x.upload && (x.upload.onprogress = function (e) { e.lengthComputable && prog && prog(e.loaded / e.total); });
      x.onload = function () { var j; try { j = JSON.parse(x.responseText); } catch (e) { j = { ok: !1, error: "HTTP " + x.status }; } res(j); };
      x.onerror = function () { res({ ok: !1, error: "Network error. Check your connection" }); };
      // ArrayBuffer bodies (not Blob): same bytes, and every engine reports them reliably
      (body && body.arrayBuffer && !(body instanceof ArrayBuffer) ? body.arrayBuffer() : Promise.resolve(body)).then(function (b) { x.send(b); }, function () { res({ ok: !1, error: "Could not read the file" }); });
    });
  }
  function coverUpload(id, file) {
    toast("Uploading cover…");
    return square(file, 600).then(function (b) {
      if (!b) { toast("That image could not be read"); return; }
      return xhr("/api/fm/art?id=" + encodeURIComponent(id), b, b.type || "image/jpeg").then(function (r) { if (r.ok) { set(r.fm); fillEdit(); toast("Cover updated"); } else toast(r.error || "Cover upload failed"); });
    });
  }
  /* File pickers live outside the sheet. iOS hides the page while the Files picker is open; the
     state refresh on return re-renders the sheet, and a picker inside it would be detached, so its
     change event never reached the sheet (dc, 2026-11-09: "adding tracks doesn't work"). */
  var pickFor = "";
  function picker(kind) {
    var id = "fm-pick-" + kind, i = document.getElementById(id);
    if (i) return i;
    i = document.createElement("input");
    i.type = "file"; i.id = id; i.tabIndex = -1; i.setAttribute("aria-hidden", "true");
    i.className = kind === "audio" ? "fm-pick fm-file" : "fm-pick fm-cover-in";
    // audio/* first: iOS Files greys out files that only match a bare extension list
    i.accept = kind === "audio" ? "audio/*,.mp3,.m4a,.aac,.mp4" : "image/*";
    if (kind === "audio") i.multiple = !0;
    i.addEventListener("change", function () {
      var fs = [].slice.call(i.files || []);
      i.value = "";
      if (kind === "audio") { if (fs.length) {var meta=pickMeta;pickMeta=null;cancelLookup();addDraft=null;tab = "queue";addFiles(meta?fs.slice(0,1):fs,meta); } }
      else if (fs[0] && pickFor) coverUpload(pickFor, fs[0]);
    });
    document.body.appendChild(i);
    return i;
  }
  function within(pr, ms, v) { return Promise.race([pr, new Promise(function (r) { setTimeout(function () { r(v); }, ms); })]); }
  var OKT = { "audio/mpeg": 1, "audio/mp3": 1, "audio/mpeg3": 1, "audio/x-mpeg": 1, "audio/x-mpeg-3": 1, "audio/x-mp3": 1, "audio/mp4": 1, "audio/x-m4a": 1, "audio/m4a": 1, "audio/aac": 1, "audio/x-aac": 1 }, EXT = { mp3: "audio/mpeg", m4a: "audio/mp4", aac: "audio/aac", mp4: "audio/mp4" };
  var upBusy = !1, batchN = 0;
  function addFiles(files, metadata) {
    [].slice.call(files || []).forEach(function (f) { ups.unshift({ f: f, meta: metadata?Object.assign({},metadata):null, name: f.name, st: "Waiting…", p: 0 }); });
    ups = ups.slice(0, 30);
    renderSheet();
    pump();
  }
  function upPaint() { if (sheet && tab === "queue" && !drag) { var box = q(".fm-ups", sheet); box ? (box.outerHTML = queueHTML().match(/<ul class="fm-ups">[\s\S]*?<\/ul>/)[0]) : renderSheet(); } }
  function pump() {
    if (upBusy) return;
    var u = ups.filter(function (x) { return x.f && !x.done && !x.err && !x.run; }).pop();
    if (!u) return;
    upBusy = !0; u.run = 1;
    var f = u.f, ext = String(f.name || "").split(".").pop().toLowerCase(), ft = String(f.type || "").toLowerCase(),
      // iOS Files often reports "" or audio/mpeg3 for MP3s: trust the extension, then send a type the Worker accepts
      type = EXT[ext] || (OKT[ft] ? (/mp4|m4a/.test(ft) ? "audio/mp4" : /aac/.test(ft) ? "audio/aac" : "audio/mpeg") : "");
    var fin = function (st, err) {
      u.st = st; u.err = !!err; u.done = !err; u.f = null; upBusy = !1; upPaint();
      if (err) toast((u.name || "Song") + ": " + st);
      else { batchN++; if (!ups.some(function (x) { return x.f && !x.done && !x.err; })) { toast(batchN > 1 ? batchN + " songs added to the queue" : u.name + " added to the queue"); batchN = 0; } }
      pump();
    };
    if (!type) return fin("MP3, M4A or AAC only (this file is " + (ext && ext !== String(f.name) ? "." + ext : f.type || "an unknown type") + ")", 1);
    if (f.size > 25 * 1024 * 1024) return fin("Over 25 MB", 1);
    u.st = "Reading tags…"; upPaint();
    var tg = {}, an = null, raw = null;
    var big = IOS && f.size > 12 * 1024 * 1024;
    within(f.arrayBuffer(), 30e3, null).then(function (buf) {
      if (!buf || !buf.byteLength) throw new Error("the file is empty or could not be read");
      raw = buf;
      try { tg = tags(buf) || {}; } catch (e) { tg = {}; }
      if (tg.dur) return tg.dur;
      u.st = "Measuring…"; upPaint();
      // <audio> metadata can stall on iOS: give it 6 s, then let the server default (180 s) stand
      return within(metaDur(f), 6e3, 0).then(function (d) {
        if (d || big) return d;
        // last resort before upload: decode (copy, since raw is still needed)
        return within(analyse(raw.slice(0)), 20e3, null).then(function (r) { an = r; return r && r.dur; });
      });
    }).then(function (dur) {
      var base = String(f.name || "Untitled").replace(/\.[^.]+$/, "").replace(/_/g, " ").trim() || "Untitled", sp = base.split(/\s+[-–—]\s+/);
      var meta = { title: tg.title || (sp.length > 1 ? sp.slice(1).join(" - ") : base), artist: tg.artist || (sp.length > 1 ? sp[0] : ""), album: tg.album || "", year: tg.year || "", genre: tg.genre || "", explicit: tg.explicit ? "1" : "", dur: Math.round((+dur || 0) * 1e3) / 1e3 };
      if(u.meta){['title','artist','album','year','genre'].forEach(function(k){meta[k]=u.meta[k]||'';});meta.explicit=u.meta.explicit?'1':'';if(!meta.dur)meta.dur=u.meta.dur||0;}
      var qs = Object.keys(meta).filter(function (k) { return meta[k] !== "" && meta[k] != null; }).map(function (k) { return k + "=" + encodeURIComponent(String(meta[k]).slice(0, 120)); }).join("&");
      u.name = meta.title + (meta.artist ? " · " + meta.artist : "");
      u.st = "Uploading 0%"; upPaint();
      return xhr("/api/fm/upload?" + qs, raw, type, function (p) { u.p = p * 0.92; u.st = "Uploading " + Math.round(p * 100) + "%"; var bar = sheet && sheet.querySelector(".fm-ups li:nth-child(" + (ups.indexOf(u) + 1) + ") .fm-upbar i"); bar ? (bar.style.transform = "scaleX(" + u.p.toFixed(3) + ")", bar.parentNode.previousSibling.lastChild.textContent = u.st) : 0; });
    }).then(function (r) {
      if (!r || !r.ok) return fin(upErr(r), 1);
      set(r.fm);
      var id = r.id, extra = [];
      if(u.meta&&u.meta.art){u.st='Adding matched artwork…';upPaint();extra.push(matchedCover(u.meta.art).then(function(blob){return blob&&square(blob,600);}).then(function(blob){return blob&&xhr('/api/fm/art?id='+encodeURIComponent(id),blob,blob.type||'image/jpeg');}).catch(function(){return null;}));}
      else if (tg.pic) { u.st = "Adding cover…"; upPaint(); extra.push(within(square(tg.pic, 600), 15e3, null).then(function (b) { return b && xhr("/api/fm/art?id=" + id, b, b.type || "image/jpeg"); })); }
      // loudness map for the iOS visualizer: decode after the upload, without copying; skipped for big files on iOS (memory)
      if (!an && !big) extra.push(within(analyse(raw), 25e3, null).then(function (a2) { an = a2; }));
      return Promise.all(extra).then(function (rs) {
        rs.forEach(function (x) { x && x.ok && x.fm && set(x.fm); });
        return an && an.wave && an.wave.length ? xhr("/api/fm/wave?id=" + id, an.wave, "application/octet-stream") : null;
      }).then(function (x) {
        x && x.ok && x.fm && set(x.fm);
        u.p = 1;
        fin("Added"+(u.meta?" · Apple Music metadata":"") + (tg.pic ? " with cover" : "") + (tg.title ? " · tags read" : ""));
      });
    }).catch(function (e) { fin("Could not add: " + ((e && e.message) || "unreadable file"), 1); });
  }
  function upErr(r) {
    var e = (r && r.error) || "Upload failed";
    return e === "owner only" ? "Not signed in as the station owner. Sign in again." : e;
  }

  /* ---------- render / paint / tick ---------- */
  var lastKey = "";
  function menuPill() {
    document.querySelectorAll(".chat-pmenu-row.chat-misery-fm em").forEach(function (em) { em.textContent = live() ? "LIVE" : ""; em.className = live() ? "chat-fm-pill" : ""; });
  }
  function render() {
    var c = calc();
    lastKey = c ? c.tr.id + "|" + c.paused + "|" + on : "";
    deco();
    chatBar();
    menuPill();
    if (morph) { var inn = q(".fm-m-in", morph); if (inn) inn.outerHTML = morphHTML(); }
    renderSheet();
    if (sheet) { var lc = q(".fm-lc", sheet); lc && (lc.innerHTML = lcText()); }
    if (live() && !tickT) tickT = setInterval(tick, 1e3);
    if (!live() && tickT && !sheet) { clearInterval(tickT); tickT = 0; }
  }
  function paint() {
    var c = calc();
    [morph, sheet].forEach(function (root) {
      if (!root || !c) return;
      var e1 = q(".fm-el", root), e2 = q(".fm-rem", root), sc = q(".fm-scrub", root), pb = q(".fm-pbar i", root);
      if (sc && !sc._busy) { sc.value = Math.floor(c.t); sc.style.setProperty("--p", (c.t / c.d * 100).toFixed(2) + "%"); }
      if (!sc || !sc._busy) { e1 && (e1.textContent = fmt(c.t)); e2 && (e2.textContent = "-" + fmt(c.d - c.t)); }
      if (pb) {
        var pv = c.t / c.d;
        if (pb._v != null && pv < pb._v - 0.002) { pb.style.transition = "none"; void pb.offsetWidth; } else pb.style.transition = "";
        pb._v = pv; pb.style.transform = "scaleX(" + pv.toFixed(4) + ")";
      }
    });
    if (sheet) { var lc = q(".fm-lc", sheet); lc && (lc.innerHTML = lcText()); }
    if (morph) { var ml = q(".fm-lc", morph); ml && (ml.innerHTML = ico("ear") + ((S && S.listeners) || 0)); }
    chatBar();
  }
  function tick() {
    tickN++;
    var c = calc(), k = c ? c.tr.id + "|" + c.paused + "|" + on : "";
    if (k !== lastKey) { render(); sync(); }
    else { paint(); deco(); }
    if (tickN % 5 === 0) sync();
    if (RM.matches && sheet) viz();
    if (c && !c.paused && !S.paused && (now() - S.startedAt) / 1e3 > durOf(c.tr) + 4 && tickN % 10 === 0) refresh();
  }
  window.addEventListener("resize", function () { hb && (q(".fm-ring", hb)._w = 0, hb._fmTy = 0); deco(); });
  window.addEventListener("hashchange", function () { setTimeout(deco, 60); setTimeout(deco, 400); });
  document.addEventListener("click", function () { setTimeout(deco, 80); }, !0);

  window.MPFM = {
    yieldBar: function () { closeMorph(true); },
    open: function () { openSheet("now"); },
    mount: mount,
    isLive: live,
    setMe: function (u) { me = u || null; meP = Promise.resolve(me); sheet && renderSheet(); },
    state: function () { return S; },
    _calc: calc
  };
  function init() { connect(); refresh(); }
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", init) : init();
})();
