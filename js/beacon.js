
    // Analytics: track pageview via sendBeacon after load (no render blocking)
    window.addEventListener("load", function () {
      try {
        var payload = JSON.stringify({ type: "pageview", path: location.pathname });
        if (navigator.sendBeacon) navigator.sendBeacon("https://api.misereperdue.com/api/analytics", new Blob([payload], { type: "text/plain" }));
        else fetch("https://api.misereperdue.com/api/analytics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload
        }).catch(function() {});
      } catch (e) {}
    });
  

    // Haptic feedback (Android only - iOS Safari doesn't support web vibration)
    window.haptic = function(pattern) {
      try {
        if (navigator.vibrate) navigator.vibrate(pattern || 10);
      } catch (e) {}
    };
  