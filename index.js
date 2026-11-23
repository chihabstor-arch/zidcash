const json = (data, status = 200, extra = {}) => new Response(JSON.stringify(data), {
  status, headers: { "Content-Type": "application/json; charset=utf-8", ...extra }
});
const cors = (request, env) => {
  const origin = env.CORS_ORIGIN || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Vary": "Origin"
  };
};
const fail = (message, status = 400, headers = {}) => json({ error: message }, status, headers);
const readBody = async (request) => {
  try { return await request.json(); } catch { return null; }
};
const randomToken = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
};
async function passwordHash(password, saltHex) {
  const salt = saltHex ? Uint8Array.from(saltHex.match(/.{2}/g), x => parseInt(x, 16)) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 210000, hash: "SHA-256" }, key, 256);
  const hash = Array.from(new Uint8Array(bits), b => b.toString(16).padStart(2, "0")).join("");
  return { salt: Array.from(salt, b => b.toString(16).padStart(2, "0")).join(""), hash };
}
async function currentUser(request, env) {
  const token = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  return await env.DB.prepare(`SELECT u.id,u.name,u.email,u.phone,u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?`)
    .bind(await sha256(token), Math.floor(Date.now()/1000)).first();
}
async function sha256(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
}
async function createSession(env, userId) {
  const token = randomToken(), tokenHash = await sha256(token);
  await env.DB.prepare("INSERT INTO sessions (user_id,token_hash,expires_at) VALUES (?,?,?)")
    .bind(userId, tokenHash, Math.floor(Date.now()/1000) + 60*60*24*30).run();
  return token;
}
export default {
  async fetch(request, env) {
    const headers = cors(request, env);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
    const url = new URL(request.url), path = url.pathname;
    try {
      if (path === "/api/health" && request.method === "GET") {
        await env.DB.prepare("SELECT 1").first();
        return json({ ok: true, service: "ZidCash API", database: "connected" }, 200, headers);
      }
      if (path === "/api/products" && request.method === "GET") {
        const rows = await env.DB.prepare("SELECT id,name,description,price,currency,image_url,created_at FROM products WHERE status='active' ORDER BY created_at DESC LIMIT 100").all();
        return json({ products: rows.results || [] }, 200, headers);
      }
      if (path === "/api/auth/register" && request.method === "POST") {
        const body = await readBody(request);
        if (!body || !body.name?.trim() || !body.email?.trim() || !body.phone?.trim() || !body.password || !["marketer","customer"].includes(body.role))
          return fail("يرجى إدخال الاسم والبريد والهاتف وكلمة المرور ونوع الحساب.", 400, headers);
        if (body.password.length < 8) return fail("كلمة المرور يجب أن تكون 8 أحرف على الأقل.", 400, headers);
        const email = body.email.trim().toLowerCase();
        const exists = await env.DB.prepare("SELECT id FROM users WHERE email=?").bind(email).first();
        if (exists) return fail("هذا البريد مسجل مسبقاً.", 409, headers);
        const {salt,hash} = await passwordHash(body.password);
        const id = crypto.randomUUID();
        await env.DB.prepare("INSERT INTO users (id,name,email,phone,role,password_hash,password_salt) VALUES (?,?,?,?,?,?,?)")
          .bind(id, body.name.trim(), email, body.phone.trim(), body.role, hash, salt).run();
        const token = await createSession(env, id);
        return json({ token, user: { id, name: body.name.trim(), email, phone: body.phone.trim(), role: body.role } }, 201, headers);
      }
      if (path === "/api/auth/login" && request.method === "POST") {
        const body = await readBody(request);
        if (!body?.email || !body?.password) return fail("أدخل البريد الإلكتروني وكلمة المرور.", 400, headers);
        const user = await env.DB.prepare("SELECT * FROM users WHERE email=?").bind(body.email.trim().toLowerCase()).first();
        if (!user) return fail("بيانات الدخول غير صحيحة.", 401, headers);
        const check = await passwordHash(body.password, user.password_salt);
        if (check.hash !== user.password_hash) return fail("بيانات الدخول غير صحيحة.", 401, headers);
        const token = await createSession(env, user.id);
        return json({ token, user: { id:user.id,name:user.name,email:user.email,phone:user.phone,role:user.role } }, 200, headers);
      }
      if (path === "/api/auth/me" && request.method === "GET") {
        const user = await currentUser(request, env);
        return user ? json({ user }, 200, headers) : fail("يلزم تسجيل الدخول.", 401, headers);
      }
      return fail("المسار غير موجود.", 404, headers);
    } catch (error) {
      return json({ error: "حدث خطأ داخلي في الخادم.", detail: env.ENVIRONMENT === "development" ? String(error) : undefined }, 500, headers);
    }
  }
};
