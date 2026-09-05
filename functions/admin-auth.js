const json = (body, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const sessionCookie = "desvio_admin_session";
const encoder = new TextEncoder();

const normaliseEmail = value => typeof value === "string" ? value.trim().toLowerCase().slice(0, 254) : "";
const decodePart = part => {
  const base64 = part.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - part.length % 4) % 4);
  return Uint8Array.from(atob(base64), char => char.charCodeAt(0));
};
const decodeJson = part => JSON.parse(new TextDecoder().decode(decodePart(part)));
const encodePart = value => btoa(String.fromCharCode(...encoder.encode(typeof value === "string" ? value : JSON.stringify(value))))
  .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
const cookieValue = (request, name) => request.headers.get("Cookie")?.split(";").map(part => part.trim()).find(part => part.startsWith(`${name}=`))?.slice(name.length + 1) || "";

async function equalValues(left, right) {
  const [a, b] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(String(left || ""))),
    crypto.subtle.digest("SHA-256", encoder.encode(String(right || "")))
  ]);
  if (typeof crypto.subtle.timingSafeEqual === "function") return crypto.subtle.timingSafeEqual(a, b);
  // Node's local test runtime may not expose Cloudflare's timingSafeEqual yet.
  const leftHash = new Uint8Array(a);
  const rightHash = new Uint8Array(b);
  let difference = 0;
  for (let index = 0; index < leftHash.length; index += 1) difference |= leftHash[index] ^ rightHash[index];
  return difference === 0;
}

async function sessionKey(secret) {
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

async function signSession(payload, secret) {
  const encoded = encodePart(payload);
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", await sessionKey(secret), encoder.encode(encoded)));
  return `${encoded}.${btoa(String.fromCharCode(...signature)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")}`;
}

async function localSessionIdentity(request, env) {
  const secret = String(env.ADMIN_SESSION_SECRET || "");
  const token = cookieValue(request, sessionCookie);
  if (!secret || !token.includes(".")) return "";
  const [encoded, signature] = token.split(".");
  try {
    const signatureBytes = decodePart(signature);
    const valid = await crypto.subtle.verify("HMAC", await sessionKey(secret), signatureBytes, encoder.encode(encoded));
    const payload = decodeJson(encoded);
    if (!valid || !payload || payload.exp <= Math.floor(Date.now() / 1000)) return "";
    const email = normaliseEmail(payload.email);
    return emailPattern.test(email) ? email : "";
  } catch {
    return "";
  }
}

export async function createAdminSession(env, email) {
  const secret = String(env.ADMIN_SESSION_SECRET || "");
  if (!secret) throw new Error("A sessão privada ainda não foi configurada.");
  const token = await signSession({ email: normaliseEmail(email), exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 }, secret);
  return `${sessionCookie}=${token}; Path=/; Max-Age=86400; HttpOnly; Secure; SameSite=Strict`;
}

export function clearAdminSession() {
  return `${sessionCookie}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`;
}

export async function loginWithAdminPassword(context, password) {
  const { env, request } = context;
  if (!env.EVENT_RADAR_DB) return { response: json({ message: "Base de dados ainda não ligada." }, 503) };
  const owner = normaliseEmail(env.ADMIN_OWNER_EMAIL);
  const expected = String(env.ADMIN_PASSWORD || "");
  if (!emailPattern.test(owner) || !expected) return { response: json({ message: "O acesso privado ainda não foi configurado." }, 503) };
  const address = request.headers.get("CF-Connecting-IP") || "sem-ip";
  const addressHash = new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(address)));
  const key = `admin:${[...addressHash].map(byte => byte.toString(16).padStart(2, "0")).join("")}`;
  await env.EVENT_RADAR_DB.prepare(`CREATE TABLE IF NOT EXISTS admin_login_attempts (key TEXT PRIMARY KEY, attempts INTEGER NOT NULL, window_started INTEGER NOT NULL)`).run();
  const now = Date.now();
  const previous = await env.EVENT_RADAR_DB.prepare("SELECT attempts, window_started FROM admin_login_attempts WHERE key = ?").bind(key).first();
  const attempts = previous && now - Number(previous.window_started) < 15 * 60 * 1000 ? Number(previous.attempts) : 0;
  if (attempts >= 5) return { response: json({ message: "Demasiadas tentativas. Tenta novamente dentro de alguns minutos." }, 429) };
  if (!(await equalValues(password, expected))) {
    await env.EVENT_RADAR_DB.prepare(`INSERT INTO admin_login_attempts (key, attempts, window_started) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET attempts = excluded.attempts, window_started = excluded.window_started`)
      .bind(key, attempts + 1, attempts ? previous.window_started : now).run();
    return { response: json({ message: "Password incorreta." }, 401) };
  }
  await env.EVENT_RADAR_DB.prepare("DELETE FROM admin_login_attempts WHERE key = ?").bind(key).run();
  const configured = await ensureAdminUserStore(env.EVENT_RADAR_DB, owner);
  if (!configured) return { response: json({ message: "O proprietário do painel ainda não foi configurado." }, 503) };
  return { email: owner, cookie: await createAdminSession(env, owner) };
}

export async function ensureAdminUserStore(db, ownerEmail) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS admin_users (
      email TEXT PRIMARY KEY COLLATE NOCASE,
      role TEXT NOT NULL DEFAULT 'editor' CHECK (role IN ('owner', 'editor')),
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `).run();
  const owner = normaliseEmail(ownerEmail);
  if (!emailPattern.test(owner)) return false;
  await db.prepare(`
    INSERT INTO admin_users (email, role, status) VALUES (?, 'owner', 'active')
    ON CONFLICT(email) DO UPDATE SET role = 'owner', status = 'active', updated_at = datetime('now')
  `).bind(owner).run();
  return true;
}

export async function requireAdmin(context, { ownerOnly = false } = {}) {
  if (!context.env.EVENT_RADAR_DB) return { response: json({ message: "Base de dados ainda não ligada." }, 503) };
  try {
    const configured = await ensureAdminUserStore(context.env.EVENT_RADAR_DB, context.env.ADMIN_OWNER_EMAIL);
    if (!configured) return { response: json({ message: "O proprietário do painel ainda não foi configurado." }, 503) };
    const email = await localSessionIdentity(context.request, context.env);
    if (!email) return { response: json({ message: "Inicia sessão para aceder ao painel." }, 401) };
    const user = await context.env.EVENT_RADAR_DB.prepare(`
      SELECT email, role FROM admin_users WHERE email = ? AND status = 'active'
    `).bind(email).first();
    if (!user || (ownerOnly && user.role !== "owner")) return { response: json({ message: "Este e-mail não tem permissão para esta ação." }, 403) };
    return { user };
  } catch (error) {
    return { response: json({ message: error instanceof Error ? error.message : "Acesso privado necessário." }, 403) };
  }
}

export const adminJson = json;
export { normaliseEmail, emailPattern };
