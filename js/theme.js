(function () {
  var mq = window.matchMedia("(prefers-color-scheme: dark)");
  function apply() {
    var dark = mq.matches;
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", dark ? "#070f29" : "#ffffff");
  }
  apply();
  if (mq.addEventListener) mq.addEventListener("change", apply);
  else if (mq.addListener) mq.addListener(apply);

  function scrolled() {
    document.body.classList.toggle("is-scrolled", window.scrollY > 40);
  }
  window.addEventListener("scroll", scrolled, { passive: true });
  scrolled();
})();
