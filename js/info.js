// /info: floating Back pill (same as product pages).
(function () {
  var b = document.getElementById("info-back");
  if (!b) return;
  b.addEventListener("click", function () {
    var same = false;
    try {
      same = document.referrer && new URL(document.referrer).origin === location.origin;
    } catch (e) {}
    if (same && history.length > 1) history.back();
    else location.href = "/";
  });
  /* Fade on scroll, same idea as the product-page head under the sky/header. */
  function onScroll() {
    var y = window.scrollY || document.documentElement.scrollTop || 0;
    var a = Math.max(0, Math.min(1, 1 - y / 80));
    b.style.opacity = a >= 1 ? "" : a.toFixed(3);
    b.style.pointerEvents = a < 0.5 ? "none" : "";
  }
  addEventListener("scroll", onScroll, { passive: true });
})();
