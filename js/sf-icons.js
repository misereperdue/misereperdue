/* SF Symbols icon set for misereperdue.com
   Apple SF Symbols-style icons as inline SVG.
   Usage: SFIcon('message-fill', 'mark') returns SVG string. */

(function () {
  "use strict";

  // SF Symbol SVG paths (24x24 viewBox, matching Apple's designs)
  var ICONS = {
    // message.fill - Chat bubble, filled
    "message-fill": '<path d="M12 3C6.48 3 2 6.92 2 11.75c0 2.63 1.32 4.99 3.4 6.56-.14 1.18-.77 3.08-2.04 4.19-.28.25-.14.72.22.72.64 0 2.6-.8 4.06-1.78.93.26 1.93.4 2.96.4 5.52 0 10-3.92 10-8.75S17.52 3 12 3z"/>',

    // bag.fill - Shopping bag, filled
    "bag-fill": '<path d="M6 7V6a6 6 0 1 1 12 0v1h3a1 1 0 0 1 1 1v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a1 1 0 0 1 1-1h3zm2 0h8V6a4 4 0 1 0-8 0v1z"/>',

    // cart.fill - Shopping cart, filled
    "cart-fill": '<path d="M2.5 3.5a1 1 0 0 1 1-1h2.2a1 1 0 0 1 .98.8L7.5 7H20a1 1 0 0 1 .98 1.2l-1.8 8a1 1 0 0 1-.98.8H8.5a1 1 0 0 1-1-1V8H4a1 1 0 0 1-1-1v-.5a1 1 0 0 1-.5-.5zM9 20a1.5 1.5 0 1 0 0 .01V20zm7 0a1.5 1.5 0 1 0 0 .01V20z"/>',

    // square.and.pencil - Compose/post
    "square-and-pencil": '<path d="M14 4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-1v-2h1a.5.5 0 0 0 .5-.5V4a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 0-.5.5v1h-2V4zM4 6a2 2 0 0 1 2-2h2v2H6a.5.5 0 0 0-.5.5v11a.5.5 0 0 0 .5.5h11a.5.5 0 0 0 .5-.5v-2h2v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6z"/><path d="M18.5 13.5l-8 8-4 1 1-4 8-8a2.12 2.12 0 0 1 3 3z"/>',

    // plus
    "plus": '<path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" fill="none"/>',

    // arrow.up - Send
    "arrow-up": '<path d="M12 19V5M5 12l7-7 7 7" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',

    // star.fill
    "star-fill": '<path d="M12 2l2.9 6.26 6.6.56-5 4.36 1.5 6.45L12 16.9 5.99 19.63l1.5-6.45-5-4.36 6.6-.56L12 2z"/>',

    // checkmark
    "checkmark": '<path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',

    // xmark
    "xmark": '<path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" fill="none"/>',

    // chevron.left
    "chevron-left": '<path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
    // chevron.right
    "chevron-right": '<path d="M9 18l6-6-6-6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',

    // photo
    "photo": '<path d="M4 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5zm0 0v14"/><circle cx="9" cy="9" r="1.5"/><path d="M4 16l5-5 4 4 3-3 4 4"/>',

    // trash
    "trash": '<path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-9 0l1 12a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-12"/>',

    // heart.fill
    "heart-fill": '<path d="M12 21s-7.5-4.7-10-9.3C.6 8.6 2.3 5 5.7 5c2 0 3.4 1.1 4.3 2.4h4c.9-1.3 2.3-2.4 4.3-2.4 3.4 0 5.1 3.6 3.7 6.7C19.5 16.3 12 21 12 21z"/>',

    // person.fill
    "person-fill": '<path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-7 8a7 7 0 0 1 14 0v1H5v-1z"/>',

    // link
    "link": '<path d="M10 13a5 5 0 0 0 7.1.1l1.4-1.4a5 5 0 0 0-7.1-7.1l-.8.8"/><path d="M14 11a5 5 0 0 0-7.1-.1l-1.4 1.4a5 5 0 0 0 7.1 7.1l.8-.8" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
    // gear
    "gear": '<path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm9 4a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3 1a7 7 0 0 0-2-1.2L16.2 3h-4l-.4 2.5a7 7 0 0 0-2 1.2l-2.3-1-2 3.4 2 1.5a7 7 0 0 0 0 2.4l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 2 1.2l.4 2.5h4l.4-2.5a7 7 0 0 0 2-1.2l2.3 1 2-3.4-2-1.5c.06-.4.1-.8.1-1.2z"/>'
  };

  /**
   * Returns an SVG string for the given SF Symbol name.
   * @param {string} name - Icon name (e.g., 'message-fill')
   * @param {string} cls - CSS class to apply (default: 'sf-icon')
   * @returns {string} SVG markup
   */
  window.SFIcon = function (name, cls) {
    cls = cls || "sf-icon";
    var path = ICONS[name];
    if (!path) {
      console.warn("SFIcon: unknown icon '" + name + "'");
      return "";
    }
    // Filled icons use fill, stroke icons use stroke (defined in path)
    var isStroke = path.indexOf('stroke="currentColor"') !== -1;
    var attrs = isStroke
      ? 'viewBox="0 0 24 24" fill="none" aria-hidden="true"'
      : 'viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"';
    return '<svg class="' + cls + '" ' + attrs + '>' + path + "</svg>";
  };

  /**
   * Replaces all <svg> elements with data-sf attribute with SF Icons.
   * Usage: <span data-sf="message-fill"></span>
   */
  window.SFIcon.replaceAll = function () {
    document.querySelectorAll("[data-sf]").forEach(function (el) {
      var name = el.getAttribute("data-sf");
      var cls = el.getAttribute("data-sf-class") || "sf-icon";
      el.innerHTML = window.SFIcon(name, cls);
    });
  };

  // Auto-replace on DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", window.SFIcon.replaceAll);
  } else {
    window.SFIcon.replaceAll();
  }
})();
