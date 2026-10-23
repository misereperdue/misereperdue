// Offline screen (served by sw.js when a navigation fails with no cached copy).
// Retry reloads the page the user was trying to open; coming back online does it too.
(function () {
  var b = document.getElementById("retry");
  function go() { location.reload(); }
  if (b) b.addEventListener("click", function (e) { e.preventDefault(); go(); });
  window.addEventListener("online", go);
})();
