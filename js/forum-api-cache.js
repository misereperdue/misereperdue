// Forum API response cache - prevents race conditions from concurrent refreshThreads() calls
// If /api/forum/threads is requested twice within 5s, the second gets the cached response
(function() {
  var cache = {};
  var CACHE_TTL = 5000; // 5 seconds
  
  var origFetch = window.fetch;
  window.fetch = function(url, opts) {
    var urlStr = String(url || "");
    var isGet = !opts || !opts.method || opts.method === "GET";
    var isForumThreads = urlStr.indexOf("/api/forum/threads") !== -1;
    
    if (isGet && isForumThreads) {
      var now = Date.now();
      var entry = cache[urlStr];
      if (entry && (now - entry.time) < CACHE_TTL) {
        // Return cached response (clone it so it can be read twice)
        return Promise.resolve(entry.response.clone());
      }
      // Fetch and cache
      return origFetch.apply(this, arguments).then(function(resp) {
        // Only cache successful responses
        if (resp.ok) {
          cache[urlStr] = { response: resp.clone(), time: now };
        }
        return resp;
      });
    }
    return origFetch.apply(this, arguments);
  };
})();
