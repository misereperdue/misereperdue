(function () {
  var mq = window.matchMedia("(prefers-color-scheme: dark)");
  function apply() {
    var dark = mq.matches;
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  }
  /* A theme-color meta (even "transparent") makes iOS paint a flat status-bar band
     over the sky. Remove any that slipped in so black-translucent can show the rain. */
  var metas = document.querySelectorAll('meta[name="theme-color"]');
  for (var i = 0; i < metas.length; i++) metas[i].parentNode.removeChild(metas[i]);
  /* Standalone / PWA: dock sits just above the home indicator. Set early so the first paint is already low. */
  if (navigator.standalone || (window.matchMedia && (matchMedia("(display-mode: standalone)").matches || matchMedia("(display-mode: fullscreen)").matches))) {
    document.documentElement.classList.add("mp-standalone");
    /* Don't let the document canvas color become iOS's status-bar fill. */
    document.documentElement.style.background = "transparent";
  }
  apply();
  if (mq.addEventListener) mq.addEventListener("change", apply);
  else if (mq.addListener) mq.addListener(apply);
})();
