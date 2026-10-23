(function () {
  var mq = window.matchMedia("(prefers-color-scheme: dark)");
  function apply() {
    var dark = mq.matches;
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    // index.html ships one theme-color per prefers-color-scheme (correct before JS
    // runs); keep any un-media'd one in sync for pages that use a single tag.
    var metas = document.querySelectorAll('meta[name="theme-color"]:not([media])');
    for (var i = 0; i < metas.length; i++) metas[i].setAttribute("content", dark ? "#070f29" : "#ffffff");
  }
  apply();
  if (mq.addEventListener) mq.addEventListener("change", apply);
  else if (mq.addListener) mq.addListener(apply);
})();
