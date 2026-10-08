const PRODUCTS = {
  jersey: { id: "jersey", name: "Home jersey", price: 140, image: "images/jersey.jpg",
    images: ["images/jersey.jpg"], details: "Heavyweight cotton jersey. Boxy cut, ribbed collar. The first Misery cut.", sizes: ["S", "M", "L", "XL"], available: true },
  tee: { id: "tee", name: "Heavy tee", price: 68, image: "images/tee.jpg",
    images: ["images/tee.jpg"], details: "Heavyweight tee. Dense cotton, structured drape.", sizes: ["S", "M", "L", "XL"], available: true },
  cap: { id: "cap", name: "Cap", price: 48, image: "images/cap.jpg",
    images: ["images/cap.jpg"], details: "Six-panel cap. Embroidered mark.", sizes: ["S", "M", "L", "XL"], available: true },
  book: { id: "book", name: "Book preorder", price: 32, image: "images/book.jpg",
    images: ["images/book.jpg"], details: "Forthcoming, Spring 2027. Clothbound, black.", sizes: null, available: true }
};
const money = n => `$${n} CAD`;
function readCart() {
  try { return JSON.parse(localStorage.getItem("mp_cart") || "[]"); } catch { return []; }
}
function writeCart(items) { localStorage.setItem("mp_cart", JSON.stringify(items)); }
function cartCount() {
  return readCart().reduce((n, i) => n + (i.qty || 0), 0);
}
function cartTotal() {
  return readCart().reduce((n, i) => n + (i.price || 0) * (i.qty || 0), 0);
}
function addItem(id, size) {
  const p = PRODUCTS[id];
  if (!p) return;
  const cart = readCart();
  const key = id + ":" + (size || "one");
  const hit = cart.find(i => i.key === key);
  if (hit) hit.qty += 1;
  else cart.push({ key, id, name: p.name, price: p.price, image: p.image, size: size || "one", qty: 1 });
  writeCart(cart);
}
function removeItem(key) {
  writeCart(readCart().filter(i => i.key !== key));
}
function setQty(key, qty) {
  const cart = readCart();
  const hit = cart.find(i => i.key === key);
  if (!hit) return;
  hit.qty = Math.max(0, qty);
  writeCart(cart.filter(i => i.qty > 0));
}
window.MP = { PRODUCTS, money, readCart, writeCart, cartCount, cartTotal, addItem, removeItem, setQty };
