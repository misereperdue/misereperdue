/* Activity and FM use the Globe menu's measured sliding glass selection.
   Existing Globe, dashboard and account sliders keep their own selection logic. */
(function () {
  'use strict';
  var selector = '.mp-activity-tabs,.fm-tabs', mounted = new Map();
  function mount(bar) {
    if (mounted.has(bar)) return;
    var thumb = document.createElement('span'), frame = 0, seated = false;
    thumb.className = 'mp-menu-tab-ind';
    thumb.setAttribute('aria-hidden', 'true');
    bar.classList.add('mp-sliding-tabs');
    bar.prepend(thumb);
    function place(instant) {
      var buttons = Array.from(bar.children).filter(function (b) { return b.tagName === 'BUTTON'; });
      var active = buttons.find(function (b) { return b.classList.contains('is-on') || b.getAttribute('aria-selected') === 'true'; }) || buttons[0];
      if (!active || !active.offsetWidth) return;
      // offset* stays correct while the containing menu morphs or scales.
      if (instant) thumb.classList.remove('is-seated');
      thumb.style.width = active.offsetWidth + 'px';
      thumb.style.height = active.offsetHeight + 'px';
      thumb.style.transform = 'translateX(' + (active.offsetLeft - 3) + 'px)';
      if (!seated || instant) {
        void thumb.offsetWidth;
        thumb.classList.add('is-seated');
        seated = true;
      }
    }
    function schedule() {
      if (!frame) frame = requestAnimationFrame(function () { frame = 0; place(false); });
    }
    var changes = new MutationObserver(schedule);
    changes.observe(bar, {subtree:true, childList:true, attributes:true, attributeFilter:['class','aria-selected']});
    var resize = new ResizeObserver(function () { place(true); });
    resize.observe(bar);
    mounted.set(bar, function () { changes.disconnect(); resize.disconnect(); cancelAnimationFrame(frame); });
    place(true);
  }
  function scan(root) {
    if (root.matches && root.matches(selector)) mount(root);
    if (root.querySelectorAll) root.querySelectorAll(selector).forEach(mount);
  }
  new MutationObserver(function (records) {
    mounted.forEach(function (dispose, bar) { if (!bar.isConnected) { dispose(); mounted.delete(bar); } });
    records.forEach(function (record) { record.addedNodes.forEach(function (node) { if (node.nodeType === 1) scan(node); }); });
  }).observe(document.body, {childList:true, subtree:true});
  scan(document);
})();
