/* VIP preview only — isolated from the production shop.
 * The signed-in user's identity and pricing are set exclusively by the Worker.
 * Never set or override checkout metadata in the browser.
 */
(function() {
  "use strict";
  const button = document.getElementById("begin");
  const status = document.getElementById("message");
  const mount = document.getElementById("checkout");
  if (!button || !status || !mount) return;
  if (new URLSearchParams(location.search).has("complete")) {
    status.textContent = "You're back from Whop. VIP access is confirmed through a signed webhook, not this page. Check your profile for the updated status.";
  }
  button.addEventListener("click", async function() {
    const token = localStorage.getItem("chat_token");
    if (!token) {
      status.textContent = "Sign in to MISÈRE PERDUE before starting VIP checkout.";
      return;
    }
    button.disabled = true;
    status.textContent = "Preparing secure checkout…";
    try {
      const response = await fetch("https://api.misereperdue.com/api/whop/vip/checkout", {
        method: "POST",
        headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" },
        body: JSON.stringify({ product: "vip" })
      });
      const body = await response.json();
      if (!response.ok || !body.ok) throw new Error(body.error || "Checkout unavailable");
      if (!/^ch_[A-Za-z0-9]+$/.test(String(body.checkoutConfigurationId || ""))) throw new Error("Unexpected checkout response");
      if (typeof window.WhopElements !== "function") throw new Error("Whop payment form could not load");
      const checkout = window.WhopElements(body.sandbox ? { environment: "sandbox" } : {}).checkout.create({
        checkoutConfiguration: body.checkoutConfigurationId,
        returnUrl: "https://misereperdue.com/whop-vip-preview.html?complete=1"
      });
      mount.hidden = false;
      checkout.create("checkout").mount("#checkout");
      button.hidden = true;
      status.textContent = "Complete your VIP purchase securely below.";
    } catch (error) {
      status.textContent = error && error.message || "Unable to load checkout.";
      button.disabled = false;
    }
  });
})();
