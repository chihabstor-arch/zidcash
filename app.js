// ضع رابط Worker المنشور هنا بعد النشر. مثال: https://zidcash-api.<account>.workers.dev
const API_BASE = "";
const $ = (id) => document.getElementById(id);
let authMode = "login";
let authToken = localStorage.getItem("zidcash_token") || "";

async function api(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "حدث خطأ في الاتصال");
  return data;
}
async function loadProducts() {
  const list = $("product-list"), status = $("api-status");
  try {
    const result = await api("/api/products");
    list.innerHTML = "";
    if (!result.products?.length) list.innerHTML = '<div class="empty-state">لا توجد منتجات منشورة حالياً. ستظهر المنتجات هنا بعد إضافتها إلى قاعدة البيانات.</div>';
    result.products?.forEach(p => {
      const card = document.createElement("article"); card.className = "product-card";
      const title = document.createElement("h3"); title.textContent = p.name;
      const desc = document.createElement("p"); desc.textContent = p.description || "اكتشف تفاصيل هذا المنتج.";
      const price = document.createElement("div"); price.className = "price"; price.textContent = p.price != null ? `${p.price} ${p.currency || "دج"}` : "السعر عند الطلب";
      card.append(title, desc, price); list.append(card);
    });
    status.textContent = "تم الاتصال بالخادم بنجاح.";
  } catch (err) {
    list.innerHTML = '<div class="empty-state">تعذر تحميل المنتجات. تأكد من إعداد رابط API ونشر Worker.</div>';
    status.textContent = err.message;
  }
}
function openAuth(mode = "login") {
  authMode = mode; $("auth-dialog").showModal();
  document.querySelectorAll("[data-tab]").forEach(b => b.classList.toggle("active", b.dataset.tab === mode));
  $("name").parentElement.hidden = mode === "login";
  $("phone").parentElement.hidden = mode === "login";
  $("auth-message").textContent = "";
}
document.querySelectorAll("[data-tab]").forEach(b => b.addEventListener("click", () => openAuth(b.dataset.tab)));
$("open-auth").addEventListener("click", () => openAuth());
$("hero-register").addEventListener("click", () => openAuth("register"));
$("refresh-products").addEventListener("click", loadProducts);
$("auth-form").addEventListener("submit", async (event) => {
  event.preventDefault(); const message = $("auth-message"); message.className = "form-message"; message.textContent = "جارٍ التنفيذ...";
  const payload = { email: $("email").value.trim(), password: $("password").value, role: $("role").value };
  if (authMode === "register") Object.assign(payload, { name: $("name").value.trim(), phone: $("phone").value.trim() });
  try {
    const result = await api(`/api/auth/${authMode === "register" ? "register" : "login"}`, { method: "POST", body: JSON.stringify(payload) });
    authToken = result.token; localStorage.setItem("zidcash_token", authToken);
    message.textContent = "تم تسجيل الدخول بنجاح."; $("auth-dialog").close();
  } catch (err) { message.classList.add("error"); message.textContent = err.message; }
});
loadProducts();
