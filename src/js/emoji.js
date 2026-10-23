/* Misère Perdue: consistent emoji on every device (per dc).
 *
 * On non-Apple devices every emoji in the page (chat, Globe posts and
 * replies, names, bios, badges, dashboard, shop, UI copy) is drawn from the
 * self-hosted image set in /emoji/<EMOJI_SET>/ (Twemoji, CC BY 4.0, see
 * docs/THIRD_PARTY.md), so Android, Windows and Linux all match.
 *
 * How: a MutationObserver finds text nodes that contain emoji and wraps
 * each emoji in <span class="mp-emo" data-k="<key>">😀</span>. The span
 * keeps the real character as its text (hidden behind the image), so
 * textContent, copy/paste, search and screen readers still get the real
 * emoji, and no HTML is ever parsed here (only text nodes are split), so
 * the renderers' escaping is untouched.
 *
 * Not replaced (they can't hold images): <input>, <textarea>, <select>,
 * contenteditable editors, <title>, SVG/canvas, system notifications.
 * Opt out of a subtree with data-no-emoji.
 *
 * Apple devices (iPhone, iPad, Mac) keep their native Apple emoji: this
 * script does nothing there (zero cost), whatever the set.
 * localStorage.mp_emoji = "force" | "off" overrides that for testing.
 *
 * Switch image sets: build one with tools/build-emoji.py, then change
 * EMOJI_SET / EXT below (or set <html data-emoji-set="...">). Nothing else.
 */
(function () {
  "use strict";
  var EMOJI_SET = "twemoji-17"; // jdecked/twemoji v17.0.3, SVG
  var set = document.documentElement.getAttribute("data-emoji-set") || EMOJI_SET;
  var EXT = set.indexOf("twemoji") === 0 ? ".svg" : ".webp";
  var BASE = "/emoji/" + set + "/";
  var mode = "";
  try { mode = localStorage.getItem("mp_emoji") || ""; } catch (e) {}
  var appleDevice = /iPhone|iPad|iPod|Macintosh|Mac OS X/.test(navigator.userAgent);
  var api = { active: false, set: set, base: BASE, ext: EXT, parse: function () {}, url: url, key: key };
  window.MPEmoji = api;
  if (mode === "off" || (appleDevice && mode !== "force")) return;

  var RE, EP, ONE;
  try {
    // Longest forms first: tag flags (England...), country flags, keycaps,
    // then pictographs with optional VS16 / skin tone joined by ZWJ.
    RE = new RegExp(
      "\\u{1F3F4}[\\u{E0020}-\\u{E007E}]+\\u{E007F}" +
      "|[\\u{1F1E6}-\\u{1F1FF}]{2}" +
      "|[#*0-9]\\uFE0F?\\u20E3" +
      "|\\p{Extended_Pictographic}(?:\\uFE0F|\\p{Emoji_Modifier})?(?:\\u200D\\p{Extended_Pictographic}(?:\\uFE0F|\\p{Emoji_Modifier})?)*" +
      "|\\p{Emoji_Presentation}",
      "gu"
    );
    EP = /\p{Emoji_Presentation}/u;
    ONE = /^[\s\S](?:\uFE0F)?$/u;
  } catch (e) {
    return; // very old browser: keep native emoji
  }
  // Cheap pre-check before running the full regex on a text node.
  var PRE = /[\u00A9\u00AE\u203C-\u3299\uD83C-\uDBFF]/;
  // Text-style symbols (©, ™, ↔, ▶, ✔, ♥...) stay text unless written with
  // VS16, like on iOS. These few are drawn as emoji on iPhone even without it.
  var ALWAYS = { "\u2764": 1, "\u2763": 1, "\u263A": 1, "\u2639": 1, "\u270C": 1, "\u261D": 1, "\u270D": 1, "\u2600": 1, "\u2601": 1, "\u2744": 1, "\u2708": 1 };
  var SKIP = "script,style,noscript,textarea,input,select,option,title,svg,canvas,[contenteditable],[data-no-emoji],.mp-emo";
  var state = {}; // key -> 1 loaded, 0 loading, -1 missing (stay native)

  function key(s) {
    var out = [];
    for (var i = 0; i < s.length; ) {
      var c = s.codePointAt(i);
      i += c > 0xffff ? 2 : 1;
      if (c !== 0xfe0f) out.push(c.toString(16));
    }
    return out.join("-");
  }
  function url(k) { return BASE + k + EXT; }
  function wanted(m) {
    if (m.length > 2 || !ONE.test(m)) {
      // Lone regional indicator / skin tone pieces are not emoji on their own.
      var c = m.codePointAt(0);
      if (m.length === 2 && ((c >= 0x1f1e6 && c <= 0x1f1ff) || (c >= 0x1f3fb && c <= 0x1f3ff))) return false;
      return true;
    }
    if (m.charCodeAt(m.length - 1) === 0xfe0f) return true; // explicit emoji style
    var cp = m.codePointAt(0);
    if (cp >= 0x1f1e6 && cp <= 0x1f1ff) return false;
    if (cp >= 0x1f3fb && cp <= 0x1f3ff) return false;
    return EP.test(m) || ALWAYS[m] === 1;
  }
  function unwrap(k) {
    var els = document.querySelectorAll('span.mp-emo[data-k="' + k + '"]');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (el.parentNode) el.parentNode.replaceChild(document.createTextNode(el.textContent), el);
    }
  }
  function probe(k) {
    if (k in state) return;
    state[k] = 0;
    var im = new Image();
    im.onload = function () { state[k] = 1; };
    im.onerror = function () { state[k] = -1; unwrap(k); };
    im.src = url(k);
  }
  function textNode(node) {
    var s = node.data;
    if (!s || !PRE.test(s)) return;
    var p = node.parentNode;
    if (!p || p.nodeType !== 1 || p.closest(SKIP)) return;
    RE.lastIndex = 0;
    var m, last = 0, frag = null;
    while ((m = RE.exec(s))) {
      var e = m[0];
      if (!wanted(e)) continue;
      var k = key(e);
      if (state[k] === -1) continue;
      if (!frag) frag = document.createDocumentFragment();
      if (m.index > last) frag.appendChild(document.createTextNode(s.slice(last, m.index)));
      var sp = document.createElement("span");
      sp.className = "mp-emo";
      sp.setAttribute("data-k", k);
      sp.style.backgroundImage = 'url("' + url(k) + '")';
      sp.textContent = e;
      frag.appendChild(sp);
      last = m.index + e.length;
      probe(k);
    }
    if (!frag) return;
    if (last < s.length) frag.appendChild(document.createTextNode(s.slice(last)));
    p.replaceChild(frag, node);
  }
  function scan(root) {
    if (!root) return;
    if (root.nodeType === 3) return textNode(root);
    if (root.nodeType !== 1 && root.nodeType !== 11) return;
    if (root.nodeType === 1 && root.closest(SKIP)) return;
    // Fast reject: no emoji-ish character anywhere in the subtree.
    if (!PRE.test(root.textContent || "")) return;
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) { return PRE.test(n.data) ? 1 : 3; },
    });
    var list = [], n;
    while ((n = w.nextNode())) list.push(n);
    for (var i = 0; i < list.length; i++) textNode(list[i]);
  }
  api.parse = scan;
  api.active = true;

  var css = document.createElement("style");
  css.textContent =
    ".mp-emo{display:inline-block;width:1.2em;height:1.2em;vertical-align:-.24em;margin:0 .04em;" +
    "background:no-repeat center/contain;overflow:hidden;white-space:nowrap;text-indent:1.4em;" +
    "color:transparent;text-shadow:none;font-style:normal;line-height:1.2em;-webkit-user-drag:none}" +
    ".mp-emo::selection{background:transparent}";
  document.head.appendChild(css);
  document.documentElement.classList.add("mp-emoji-img");

  var mo = new MutationObserver(function (recs) {
    for (var i = 0; i < recs.length; i++) {
      var r = recs[i];
      if (r.type === "characterData") { if (r.target.parentNode) textNode(r.target); continue; }
      var a = r.addedNodes;
      for (var j = 0; j < a.length; j++) if (a[j].isConnected) scan(a[j]);
    }
    mo.takeRecords(); // drop the records our own replacements just made
  });
  function start() {
    scan(document.body);
    mo.observe(document.body, { childList: true, subtree: true, characterData: true });
  }
  if (document.body) start();
  else document.addEventListener("DOMContentLoaded", start);
})();
