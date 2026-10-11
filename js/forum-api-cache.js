// Forum API response cache + normalizer
// Prevents race-condition re-renders by ensuring consistent data
(function() {
  var cache = {};
  var CACHE_TTL = 10000; // 10 seconds
  
  // Normalize threads: round timestamps to nearest minute so the
  // forum's "same data" check doesn't fail on millisecond differences
  function normalizeThreads(data) {
    try {
      if (data && data.threads && Array.isArray(data.threads)) {
        data.threads.forEach(function(t) {
          // Round updatedAt/lastActivity to minute precision
          if (t.updatedAt) {
            var d = new Date(t.updatedAt);
            d.setSeconds(0, 0);
            t.updatedAt = d.toISOString();
          }
          if (t.lastActivity) {
            var d2 = new Date(t.lastActivity);
            d2.setSeconds(0, 0);
            t.lastActivity = d2.toISOString();
          }
        });

      }
    } catch (e) {}
    return data;
  }
  
  var origFetch = window.fetch;
  window.fetch = function(url, opts) {
    var urlStr = String(url || "");
    var isGet = !opts || !opts.method || opts.method === "GET";
    var isForumThreads = urlStr.indexOf("/api/forum/threads") !== -1;
    
    if (isGet && isForumThreads) {
      var now = Date.now();
      var entry = cache[urlStr];
      if (entry && (now - entry.time) < CACHE_TTL) {
        return Promise.resolve(entry.response.clone());
      }
      return origFetch.apply(this, arguments).then(function(resp) {
        if (resp.ok) {
          // Clone, normalize, and cache
          return resp.clone().json().then(function(data) {
            var normalized = normalizeThreads(data);
            var normalizedResp = new Response(JSON.stringify(normalized), {
              status: resp.status,
              statusText: resp.statusText,
              headers: resp.headers
            });
            cache[urlStr] = { response: normalizedResp.clone(), time: now };
            return normalizedResp;
          }).catch(function() {
            return resp;
          });
        }
        return resp;
      });
    }
    return origFetch.apply(this, arguments);
  };
})();
