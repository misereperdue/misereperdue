(function () {
  var mq = window.matchMedia("(prefers-color-scheme: dark)");
  function apply() {
    var dark = mq.matches;
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    // index.html ships one theme-color per prefers-color-scheme (correct before JS
    // runs); keep any un-media'd one in sync for pages that use a single tag.
    var metas = document.querySelectorAll('meta[name="theme-color"]:not([media])');
    for (var i = 0; i < metas.length; i++) metas[i].setAttribute("content", "transparent");
  }
  /* Standalone / PWA: dock sits just above the home indicator. Set early so the first paint is already low. */
  if (navigator.standalone || (window.matchMedia && (matchMedia("(display-mode: standalone)").matches || matchMedia("(display-mode: fullscreen)").matches))) {
    document.documentElement.classList.add("mp-standalone");
  }
  apply();
  if (mq.addEventListener) mq.addEventListener("change", apply);
  else if (mq.addListener) mq.addListener(apply);
})();
