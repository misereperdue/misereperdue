// Offline screen (served by sw.js when the app opens with no connection).
// Retry turns into a spinner and reloads; coming back online does it too.
(function () {
  var b = document.getElementById("retry");
  var busy = false;
  function go() {
    if (busy) return;
    busy = true;
    if (b) { b.classList.add("busy"); b.setAttribute("aria-label", "Retrying"); }
    // let the spinner show for a beat before the reload replaces the page
    setTimeout(function () { location.reload(); }, 450);
    // still offline: the reload lands back here; if it somehow doesn't, reset
    setTimeout(function () { busy = false; if (b) { b.classList.remove("busy"); b.removeAttribute("aria-label"); } }, 6000);
  }
  if (b) b.addEventListener("click", function (e) { e.preventDefault(); go(); });
  window.addEventListener("online", go);
})();
