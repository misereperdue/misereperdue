/* After Polar hosted checkout returns to /p/stars or /p/membership with ?polar=done. */
(function () {
  try {
    if (new URLSearchParams(location.search).get("polar") !== "done") return;
  } catch (_) { return; }
  var c = document.querySelector(".cta");
  if (!c) return;
  var a = c.querySelector("a");
  var href = (a && a.getAttribute("href")) || "/#shop";
  var kind = /\/p\/membership\/?$/.test(location.pathname) ? "VIP" : "Stars";
  c.innerHTML = "<p>You\u2019re all set. Your " + kind + " will appear on your account shortly.</p><a href=\"" + href + "\">Back to the shop on misereperdue.com \u2192</a>";
})();
