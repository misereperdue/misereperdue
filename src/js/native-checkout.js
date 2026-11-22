/* Native checkout (dc t658u): our own payment step on Whop Payment Elements, inside the checkout sheet page.
   Whop's PCI-isolated fields collect the card; the Worker decides what is charged (plan, account, promo) and
   confirms the payment. Anything that fails to load hands back to the classic Whop embed (opts.fallback). */
(function () {
  "use strict";
  var SVG = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';
  // Hugeicons (free, MIT): Ticket01, CreditCard, Tick02, ArrowRight01
  var I_TICKET = '<svg ' + SVG + ' aria-hidden="true"><path d="M2.46433 9.34375C2.21579 9.34375 1.98899 9.14229 2.00041 8.87895C2.06733 7.33687 2.25481 6.33298 2.78008 5.53884C3.08228 5.08196 3.45765 4.68459 3.88923 4.36468C5.05575 3.5 6.70139 3.5 9.99266 3.5H14.0074C17.2986 3.5 18.9443 3.5 20.1108 4.36468C20.5424 4.68459 20.9177 5.08196 21.2199 5.53884C21.7452 6.33289 21.9327 7.33665 21.9996 8.87843C22.011 9.14208 21.7839 9.34375 21.5351 9.34375C20.1493 9.34375 19.0259 10.533 19.0259 12C19.0259 13.467 20.1493 14.6562 21.5351 14.6562C21.7839 14.6562 22.011 14.8579 21.9996 15.1216C21.9327 16.6634 21.7452 17.6671 21.2199 18.4612C20.9177 18.918 20.5424 19.3154 20.1108 19.6353C18.9443 20.5 17.2986 20.5 14.0074 20.5H9.99266C6.70139 20.5 5.05575 20.5 3.88923 19.6353C3.45765 19.3154 3.08228 18.918 2.78008 18.4612C2.25481 17.667 2.06733 16.6631 2.00041 15.1211C1.98899 14.8577 2.21579 14.6562 2.46433 14.6562C3.85012 14.6562 4.97352 13.467 4.97352 12C4.97352 10.533 3.85012 9.34375 2.46433 9.34375Z"/><path d="M9 3.5L9 20.5"/></svg>';
  var I_CARD = '<svg ' + SVG + ' aria-hidden="true"><path d="M10 4H14C17.7712 4 19.6569 4 20.8284 5.17157C22 6.34315 22 8.22876 22 12C22 15.7712 22 17.6569 20.8284 18.8284C19.6569 20 17.7712 20 14 20H10C6.22876 20 4.34315 20 3.17157 18.8284C2 17.6569 2 15.7712 2 12C2 8.22876 2 6.34315 3.17157 5.17157C4.34315 4 6.22876 4 10 4Z"/><path d="M2.5 9H21.5"/><path d="M14 15L18 15"/></svg>';
  var I_TICK = '<svg ' + SVG + ' aria-hidden="true"><path d="M5 14L8.5 17.5L19 6.5"/></svg>';
  var I_NEXT = '<svg ' + SVG + ' aria-hidden="true"><path d="M9.00005 6C9.00005 6 15 10.4189 15 12C15 13.5812 9 18 9 18"/></svg>';
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function num(m) { var n = m && Number(m.amount); return isFinite(n) ? n : NaN; }
  function money(n, cur) {
    var c = String(cur || "cad").toUpperCase(), sym = c === "CAD" ? "CA$" : c === "USD" ? "US$" : c + " ";
    return sym + (Math.round(Math.abs(n) * 100) / 100).toFixed(2);
  }
  function reduce() { try { return matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (_) { return false; } }
  // Odometer: digits roll to the new value; other characters swap in place.
  function odo(el, text) {
    var old = el.__odo || "";
    if (old === text) return;
    el.__odo = text;
    el.setAttribute("aria-label", text);
    var html = "";
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      if (/\d/.test(ch)) {
        var col = "";
        for (var d = 0; d <= 9; d++) col += "<i>" + d + "</i>";
        html += '<span class="nc-od" aria-hidden="true"><span class="nc-odc" data-d="' + ch + '">' + col + "</span></span>";
      } else html += '<span class="nc-ods" aria-hidden="true">' + esc(ch) + "</span>";
    }
    var prev = old ? old.replace(/\D/g, "") : "";
    el.innerHTML = html;
    var cols = el.querySelectorAll(".nc-odc"), k = 0;
    cols.forEach(function (c) {
      var from = prev[k] != null ? +prev[k] : +c.dataset.d;
      k++;
      c.style.transition = "none";
      c.style.transform = "translateY(" + -from + "em)";
    });
    void el.offsetWidth;
    cols.forEach(function (c, j) {
      c.style.transition = reduce() ? "none" : "transform " + (0.55 + j * 0.06) + "s cubic-bezier(.2,.8,.2,1)";
      c.style.transform = "translateY(" + -c.dataset.d + "em)";
    });
  }
  // Coupon burst: the ticket breaks into particles that sweep on a curve into the bar's coupon thumb.
  function burst(fromEl, toEl, done) {
    if (reduce() || !fromEl.animate) { done(); return; }
    var a = fromEl.getBoundingClientRect(), b = toEl.getBoundingClientRect(), n = 26, left = n;
    var tx = b.left + b.width / 2, ty = b.top + b.height / 2;
    for (var i = 0; i < n; i++) (function (i) {
      var p = document.createElement("i");
      p.className = "nc-pt";
      var sx = a.left + Math.random() * a.width, sy = a.top + Math.random() * a.height;
      var cx = (sx + tx) / 2 + (Math.random() - 0.5) * 160, cy = Math.min(sy, ty) - 60 - Math.random() * 120;
      var s = 3 + Math.random() * 4;
      p.style.cssText = "left:" + sx + "px;top:" + sy + "px;width:" + s + "px;height:" + s + "px";
      document.body.appendChild(p);
      var frames = [];
      for (var t = 0; t <= 1.0001; t += 0.125) {
        var x = (1 - t) * (1 - t) * sx + 2 * (1 - t) * t * cx + t * t * tx, y = (1 - t) * (1 - t) * sy + 2 * (1 - t) * t * cy + t * t * ty;
        frames.push({ transform: "translate(" + (x - sx) + "px," + (y - sy) + "px) scale(" + (1 - t * 0.6) + ")", opacity: t < 0.85 ? 1 : 0.2 });
      }
      var an = p.animate(frames, { duration: 620 + Math.random() * 260, delay: i * 14, easing: "cubic-bezier(.5,0,.2,1)", fill: "forwards" });
      an.onfinish = function () { p.remove(); if (--left === 0) done(); };
    })(i);
  }

  // Hugeicons (free, MIT): ArrowDown01
  var I_DOWN = '<svg ' + SVG + ' aria-hidden="true"><path d="M18 9.00005C18 9.00005 13.5811 15 12 15C10.4188 15 6 9 6 9"/></svg>';
  var COUNTRIES = ["CA", "US", "GB", "AU", "NZ", "IE", "FR", "DE", "ES", "IT", "NL", "BE", "CH", "AT", "SE", "NO", "DK", "FI", "PT", "PL", "CZ", "GR", "JP", "KR", "SG", "HK", "TW", "MX", "BR", "AR", "CL", "CO", "ZA", "AE", "IL", "IN", "PH", "TH", "MY"];
  function countryName(c) { try { return new Intl.DisplayNames(["en"], { type: "region" }).of(c) || c; } catch (_) { return c; } }
  function countryOptions(sel) { return COUNTRIES.map(function (c) { return '<option value="' + c + '"' + (c === sel ? " selected" : "") + ">" + esc(countryName(c)) + "</option>"; }).join(""); }
  function readLocal(k) { try { return JSON.parse(localStorage.getItem(k) || "null") || {}; } catch (_) { return {}; } }
  function writeLocal(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} }
  function emailOk(s) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s); }
  function row(label, inner, cls) { return '<label class="nc-li' + (cls ? " " + cls : "") + '"><span class="nc-lb">' + label + "</span>" + inner + "</label>"; }
  function input(id, attrs) { return '<input class="nc-in" id="' + id + '" ' + attrs + ">"; }
  function select(id, sel) { return '<span class="nc-sel"><select class="nc-in" id="' + id + '" autocomplete="country">' + countryOptions(sel) + "</select>" + I_DOWN + "</span>"; }

  /* Look A (dc t667u/t668u): iOS-style grouped glass lists. Ours: the order summary, coupon, contact (email, name),
     country/postal or the full shipping address, saved cards and the Buy stack. Whop's: only the PCI card number,
     expiry and CVC frames (styled bare into our rows) and its required branding line. Our email, name and address
     go to Whop in the confirmation token (billingDetails); the bag's address also goes to the server as `ship`. */
  function mount(o) {
    var root = o.el, product = o.product, cart = product === "cart";
    var state = { quote: null, base: null, promo: "", pendingPromo: "", method: "new", cardDone: false, busy: false, saved: [], wallet: null };
    var contact = readLocal("mp_pay_contact"), ship0 = readLocal("mp_pay_ship");
    var h1 = document.querySelector("h1"), sub = document.querySelector(".rc-sub"), art = document.querySelector(".rc-art");
    var title = (h1 && h1.textContent.trim()) || "Order", subText = (sub && sub.textContent.trim()) || "";
    var country0 = /^[A-Z]{2}$/.test(contact.country || "") ? contact.country : "CA";
    root.innerHTML =
      '<div class="nc nc-a">' +
      '<div class="nc-grp nc-sum" aria-label="Order summary">' +
      '<div class="nc-li nc-item">' + (art && art.getAttribute("src") ? '<img class="nc-art" alt="" src="' + esc(art.getAttribute("src")) + '">' : "") +
      '<span class="nc-it"><b>' + esc(title) + "</b>" + (subText && !cart ? "" : subText ? "<small>" + esc(subText) + "</small>" : "") + '</span><span class="nc-v nc-subv">\u2014</span></div>' +
      '<button type="button" class="nc-li nc-add">' + I_TICKET + '<span class="nc-lt">Coupon</span><span class="nc-v">Add' + I_NEXT + "</span></button>" +
      '<div class="nc-li nc-cbox" hidden><input class="nc-cin" type="text" inputmode="text" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="40" placeholder="Coupon code" aria-label="Coupon code"><button type="button" class="nc-chk">Check</button></div>' +
      '<div class="nc-li nc-tkrow" hidden><div class="nc-ticket"><div class="nc-tk-l"><small>Coupon</small><b class="nc-tk-code"></b></div><div class="nc-tk-r"><b class="nc-tk-off"></b><button type="button" class="nc-tk-apply">Apply</button></div></div></div>' +
      '<div class="nc-cl" aria-live="polite"><button type="button" class="nc-li nc-cline" aria-label="Remove coupon">' + I_TICKET + '<span class="nc-lt">Coupon \u00b7 <b class="nc-code"></b></span><span class="nc-v nc-disc"></span></button></div>' +
      '<div class="nc-li nc-totrow"><span class="nc-thumb" aria-hidden="true">' + I_TICKET + '</span><span class="nc-lt"><b>Total</b><small class="nc-saved">You save <span></span></small></span><span class="nc-tot"><s class="nc-old"></s><b class="nc-now"></b></span></div>' +
      "</div>" +
      '<p class="nc-cmsg" role="status"></p>' +
      '<div class="nc-cap">Contact</div><div class="nc-grp">' +
      row("Email", input("nc-email", 'type="email" inputmode="email" autocomplete="email" autocapitalize="off" spellcheck="false" maxlength="120" placeholder="you@example.com"')) +
      row("Name", input("nc-name", 'type="text" autocomplete="name" maxlength="80" placeholder="Name on card"')) +
      "</div>" +
      (cart ? '<div class="nc-cap">Shipping</div><div class="nc-grp">' +
        row("Address", input("nc-line1", 'type="text" autocomplete="address-line1" maxlength="120" placeholder="Street address"')) +
        row("Apt", input("nc-line2", 'type="text" autocomplete="address-line2" maxlength="120" placeholder="Optional"')) +
        row("City", input("nc-city", 'type="text" autocomplete="address-level2" maxlength="80" placeholder="City"')) +
        row("Province", input("nc-state", 'type="text" autocomplete="address-level1" maxlength="80" placeholder="Province or state"')) +
        row("Postal", input("nc-postal", 'type="text" autocomplete="postal-code" autocapitalize="characters" maxlength="20" placeholder="Postal code"')) +
        row("Country", select("nc-country", /^[A-Z]{2}$/.test(ship0.country || "") ? ship0.country : country0)) +
        "</div>" : "") +
      '<div class="nc-cap">Card</div><div class="nc-grp nc-cardgrp"><div class="nc-methods"></div><div class="nc-new">' +
      '<div class="nc-li nc-wrow"><span class="nc-lb">Number</span><div class="nc-mount nc-f" id="nc-number"></div></div>' +
      '<div class="nc-sp2"><div class="nc-li nc-wrow"><span class="nc-lb">Expiry</span><div class="nc-mount nc-f" id="nc-exp"></div></div><div class="nc-li nc-wrow"><span class="nc-lb nc-lb-s">CVC</span><div class="nc-mount nc-f" id="nc-cvc"></div></div></div>' +
      (cart ? "" : row("Country", select("nc-country", country0)) +
        row("Postal", input("nc-postal", 'type="text" autocomplete="postal-code" autocapitalize="characters" maxlength="20" placeholder="Postal code"'))) +
      (o.canSave ? '<label class="nc-li nc-savecard"><span class="nc-lt">Save card for next time</span><input type="checkbox" class="nc-savebox"></label>' : "") +
      "</div></div>" +
      '<p class="nc-err" role="alert"></p>' +
      '<div class="nc-foot"><div class="nc-wallet" hidden></div><button type="button" class="nc-go" disabled>' + esc(o.payLabel || "Pay") + "</button></div>" +
      '<div class="nc-mount nc-brand" id="nc-branding"></div>' +
      "</div>";
    var $ = function (s) { return root.querySelector(s); };
    var err = $(".nc-err"), go = $(".nc-go"), now = $(".nc-now");
    var f = { email: $("#nc-email"), name: $("#nc-name"), country: $("#nc-country"), postal: $("#nc-postal"), line1: $("#nc-line1"), line2: $("#nc-line2"), city: $("#nc-city"), state: $("#nc-state") };
    f.email.value = contact.email || ""; f.name.value = contact.name || "";
    if (cart) { f.line1.value = ship0.line1 || ""; f.line2.value = ship0.line2 || ""; f.city.value = ship0.city || ""; f.state.value = ship0.state || ""; f.postal.value = ship0.postal_code || ""; }
    else f.postal.value = contact.postal || "";
    function setErr(t) { err.textContent = t || ""; }
    function val(k) { return f[k] ? String(f[k].value || "").trim() : ""; }
    function details() {
      var d = { email: val("email"), name: val("name"), country: val("country"), postal_code: val("postal").toUpperCase() };
      if (cart) { d.line1 = val("line1"); d.line2 = val("line2"); d.city = val("city"); d.state = val("state"); }
      return d;
    }
    function missing() {
      var d = details();
      if (state.method === "new") {
        if (!emailOk(d.email)) return "email";
        if (!d.name) return "name";
      }
      if (cart && (!d.line1 || !d.city || !d.state)) return "address";
      if ((state.method === "new" || cart) && (!d.country || !d.postal_code)) return "postal";
      return "";
    }
    function money0() { var q = state.quote || state.base; return q ? money(num(q.total), q.total.currency) : ""; }
    function label() { var m = money0(); return (o.payLabel || "Pay") + (m ? " \u00b7 " + m : ""); }
    function totals() {
      var q = state.quote || state.base;
      if (!q) return;
      var cur = q.total.currency, sub = num(q.subtotal), disc = Math.abs(num(q.discount) || 0), tot = num(q.total);
      $(".nc-subv").textContent = money(sub, cur);
      odo(now, money(tot, cur));
      var on = !!state.promo && disc > 0;
      root.classList.toggle("has-coupon", on);
      if (on) {
        $(".nc-code").textContent = state.promo;
        $(".nc-disc").textContent = "\u2212" + money(disc, cur);
        $(".nc-old").textContent = money(sub, cur);
        $(".nc-saved span").textContent = money(disc, cur);
      }
      if (!state.busy) go.textContent = label();
      if (state.wallet) try { state.wallet.update({ amount: Math.round(tot * 100) }); } catch (_) {}
    }
    function ready() { go.disabled = state.busy || !!missing() || !(state.method !== "new" || state.cardDone); }
    Object.keys(f).forEach(function (k) { if (f[k]) { f[k].addEventListener("input", ready); f[k].addEventListener("change", ready); } });
    function quote(promo) {
      return o.request("/api/whop/elements/quote", { method: "POST", body: JSON.stringify({ checkoutConfigurationId: o.checkoutId, promo: promo || "" }) });
    }
    // Coupon: check the code with the server (Whop promo codes), show it as a ticket, then apply it to the order.
    var add = $(".nc-add"), cbox = $(".nc-cbox"), cin = $(".nc-cin"), tkrow = $(".nc-tkrow"), ticket = $(".nc-ticket"), cmsg = $(".nc-cmsg");
    add.onclick = function () { add.hidden = true; cbox.hidden = false; try { cin.focus({ preventScroll: true }); } catch (_) {} };
    function check() {
      var code = cin.value.trim();
      cmsg.textContent = "";
      if (!code) return;
      $(".nc-chk").disabled = true;
      quote(code).then(function (q) {
        var disc = Math.abs(num(q.discount) || 0);
        if (!(disc > 0)) throw new Error("That code doesn\u2019t change this order");
        state.pendingQuote = q; state.pendingPromo = q.promo || code;
        $(".nc-tk-code").textContent = state.pendingPromo.toUpperCase();
        $(".nc-tk-off").textContent = "\u2212" + money(disc, q.total.currency);
        cbox.hidden = true; tkrow.hidden = false;
      }).catch(function (e) { cmsg.textContent = e.message || "That code can\u2019t be used"; })
        .then(function () { $(".nc-chk").disabled = false; });
    }
    $(".nc-chk").onclick = check;
    cin.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); check(); } });
    $(".nc-tk-apply").onclick = function () {
      var q = state.pendingQuote;
      if (!q) return;
      window.parent !== window && o.haptic && o.haptic();
      root.classList.add("is-applying");
      burst(ticket, $(".nc-now"), function () { root.classList.remove("is-applying"); });
      ticket.classList.add("is-gone");
      setTimeout(function () {
        tkrow.hidden = true; ticket.classList.remove("is-gone");
        state.quote = q; state.promo = state.pendingPromo;
        totals();
        add.hidden = true;
      }, reduce() ? 0 : 420);
    };
    $(".nc-cline").addEventListener("click", function () {
      // Tap the coupon line to remove it.
      state.promo = ""; state.quote = state.base; totals();
      add.hidden = false; cin.value = "";
    });
    // Whop Payment Elements: only the card frames and the branding line.
    var W = o.whop, payments, cardFields;
    payments = W.payments.create({
      accountId: o.accountId, plan: o.planId, appearance: o.appearance(),
      onLoadingChange: function (loading) { if (!loading) loaded(); }
    });
    var settled = false, hang = setTimeout(function () { fail("timeout"); }, 9000);
    function loaded() {
      if (settled) return;
      settled = true; clearTimeout(hang);
      root.classList.add("is-ready");
      o.onReady && o.onReady();
    }
    function fail(why) {
      if (settled) return;
      settled = true; clearTimeout(hang);
      try { payments.destroy(); } catch (_) {}
      root.innerHTML = "";
      o.fallback(why);
    }
    try {
      payments.create("branding").mount("#nc-branding");
      cardFields = payments.create("cardFields", { onChange: function (ev) { state.cardDone = !!(ev && ev.complete); ready(); } });
      cardFields.create("cardNumber").mount("#nc-number");
      cardFields.create("cardExpiry").mount("#nc-exp");
      cardFields.create("cardCvc").mount("#nc-cvc");
    } catch (e) { fail("mount"); return { destroy: function () {} }; }
    var themeObs = new MutationObserver(function () { try { payments.update({ appearance: o.appearance() }); } catch (_) {} });
    themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    var save = $(".nc-savebox");
    if (save) save.onchange = function () { try { payments.update({ setupFutureUsage: save.checked ? "on_session" : undefined }); } catch (_) {} };
    // Saved cards (from this account's earlier native payments) as rows, plus a "New card" row.
    var methods = $(".nc-methods"), newBox = $(".nc-new");
    function drawMethods() {
      if (!state.saved.length) { methods.innerHTML = ""; newBox.hidden = false; return; }
      methods.innerHTML = state.saved.map(function (m) {
        var name = (m.brand ? m.brand.charAt(0).toUpperCase() + m.brand.slice(1) : "Card") + (m.last4 ? " \u2022\u2022\u2022\u2022 " + m.last4 : "");
        return '<button type="button" class="nc-li nc-m" role="radio" data-id="' + esc(m.id) + '" aria-checked="' + (state.method === m.id) + '"><span class="nc-mi">' + I_CARD + '</span><span class="nc-mt"><b>' + esc(name) + "</b>" +
          (m.exp ? "<small>Expires " + esc(m.exp) + "</small>" : "") + '</span><span class="nc-mk">' + I_TICK + "</span></button>";
      }).join("") + '<button type="button" class="nc-li nc-m" role="radio" data-id="new" aria-checked="' + (state.method === "new") + '"><span class="nc-mi">' + I_CARD + '</span><span class="nc-mt"><b>New card</b></span><span class="nc-mk">' + I_TICK + "</span></button>";
      newBox.hidden = state.method !== "new";
      methods.querySelectorAll(".nc-m").forEach(function (b) {
        b.onclick = function () { state.method = b.dataset.id; drawMethods(); ready(); };
      });
    }
    if (o.signedIn) o.request("/api/whop/elements/methods?account=" + encodeURIComponent(o.accountId)).then(function (r) {
      state.saved = (r.methods || []).slice(0, 3);
      if (state.saved.length) state.method = state.saved[0].id;
      drawMethods(); ready();
    }).catch(function () {});
    // Prices from the server (Whop quote); the display price is only a placeholder until it answers.
    if (o.displayTotal) state.base = { subtotal: { amount: String(o.displayTotal), currency: "cad" }, total: { amount: String(o.displayTotal), currency: "cad" }, discount: { amount: "0", currency: "cad" } };
    totals(); ready();
    quote("").then(function (q) { state.base = q; if (!state.promo) state.quote = q; totals(); setupWallet(); }).catch(function () { setupWallet(); });
    // Apple Pay / Google Pay behind our own button, stacked above Buy (needs Apple Pay ready on misereperdue.com in Whop).
    function setupWallet() {
      var q = state.quote || state.base;
      if (!q || !W.payments.paymentRequest) return;
      try {
        var pr = W.payments.paymentRequest.create({ accountId: o.accountId, currency: q.total.currency, amount: Math.round(num(q.total) * 100), requestPayerEmail: true, requestShipping: cart });
        pr.canMakePayment().then(function (av) {
          if (!av) return;
          var type = av.applePay ? "apple_pay" : av.googlePay ? "google_pay" : null;
          if (!type) return;
          state.wallet = pr;
          var box = $(".nc-wallet");
          var wart = av.wallets && av.wallets[type] && av.wallets[type].button, dk = document.documentElement.getAttribute("data-theme") === "dark";
          var img = wart && (dk ? wart.dark : wart.light), lbl = type === "apple_pay" ? "Apple Pay" : "Google Pay";
          box.innerHTML = '<button type="button" class="nc-wbtn" aria-label="Pay with ' + lbl + '">' +
            (img && /^https:\/\//.test(img.image || "") ? '<img alt="" src="' + esc(img.image) + '">' : (type === "apple_pay" ? '<span class="nc-apl" aria-hidden="true">\uf8ff</span>Pay' : lbl)) + "</button>";
          box.hidden = false;
          box.querySelector(".nc-wbtn").onclick = function () {
            if (state.busy) return;
            setErr("");
            // show() must run synchronously inside the tap.
            pr.show(type).then(function (res) { return submit({ confirmationToken: res.ctok, ship: res.shipping || null }); })
              .catch(function (e) { if (!e || e.code !== "payment_request_cancelled") setErr((e && e.message) || "Wallet payment didn\u2019t go through"); });
          };
        }).catch(function () {});
      } catch (_) {}
    }
    function busy(on) { state.busy = on; root.classList.toggle("is-busy", on); go.textContent = on ? "Processing\u2026" : label(); ready(); }
    function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
    function submit(extra) {
      busy(true);
      var body = { checkoutConfigurationId: o.checkoutId, promo: state.promo || "" };
      for (var k in extra) if (extra[k] != null) body[k] = extra[k];
      return o.request("/api/whop/elements/pay", { method: "POST", body: JSON.stringify(body) }).then(function (r) {
        var step = r.clientSecret && r.status !== "paid" && W.payments.handleNextAction
          ? W.payments.handleNextAction({ clientSecret: r.clientSecret, returnUrl: o.returnUrl }).catch(function () { return {}; }) : Promise.resolve({});
        return step.then(function (na) {
          if (na && na.redirected) return;
          return poll(r.paymentId, 0);
        });
      }).catch(function (e) { busy(false); setErr(e.message || "Payment didn\u2019t go through"); });
    }
    function poll(id, n) {
      return o.request("/api/whop/elements/status", { method: "POST", body: JSON.stringify({ checkoutConfigurationId: o.checkoutId, paymentId: id }) }).then(function (s) {
        if (s.paid) { root.classList.add("is-paid"); return o.onPaid(s); }
        if (s.failure || ["failed", "void", "canceled", "uncollectible"].indexOf(s.status) >= 0) throw new Error(s.failure || "Your payment was declined. Try another card.");
        if (n >= 14) { busy(false); return o.onPaid({ pending: true }); }
        return wait(1500).then(function () { return poll(id, n + 1); });
      });
    }
    var HINT = { email: "Add your email for the receipt", name: "Add the name on your card", address: "Add your shipping address", postal: "Add your country and postal code" };
    go.onclick = function () {
      if (state.busy) return;
      setErr("");
      var miss = missing();
      if (miss) { setErr(HINT[miss]); return; }
      var d = details();
      // Remember contact and address on this device only (never sent anywhere but the payment).
      writeLocal("mp_pay_contact", { email: d.email, name: d.name, country: cart ? contact.country || "" : d.country, postal: cart ? contact.postal || "" : d.postal_code });
      var ship = null;
      if (cart) {
        ship = { name: d.name, line1: d.line1, line2: d.line2, city: d.city, state: d.state, postal_code: d.postal_code, country: d.country };
        writeLocal("mp_pay_ship", ship);
      }
      if (state.method !== "new") { submit({ savedMethodId: state.method, ship: ship }); return; }
      var address = cart ? { country: d.country, line1: d.line1, city: d.city, postal_code: d.postal_code, state: d.state } : { country: d.country, postal_code: d.postal_code };
      if (cart && d.line2) address.line2 = d.line2;
      busy(true);
      payments.createConfirmationToken({ billingDetails: { email: d.email, name: d.name, address: address } }).then(function (t) {
        busy(false);
        return submit({ confirmationToken: t.confirmationToken, ship: ship });
      }).catch(function (e) { busy(false); if (!e || e.code !== "payment_request_cancelled") setErr((e && e.message) || "Check your card details"); });
    };
    return { destroy: function () { themeObs.disconnect(); clearTimeout(hang); try { payments.destroy(); } catch (_) {} root.innerHTML = ""; } };
  }
  window.MPNativeCheckout = { mount: mount };
})();
