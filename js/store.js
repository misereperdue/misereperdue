const PRODUCTS = {
  jersey: { id: "jersey", name: "Home jersey", price: 140, image: "images/jersey.jpg" },
  tee: { id: "tee", name: "Heavy tee", price: 68, image: "images/tee.jpg" },
  cap: { id: "cap", name: "Cap", price: 48, image: "images/cap.jpg" },
  book: { id: "book", name: "Book preorder", price: 32, image: "images/book.jpg" }
};
const money = n => `$${n} CAD`;
function readCart() {
  try { return JSON.parse(localStorage.getItem("mp_cart") || "[]"); } catch { return []; }
}
function writeCart(items) { localStorage.setItem("mp_cart", JSON.stringify(items)); }
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
window.MP = { PRODUCTS, money, readCart, writeCart, addItem };
