const json = (body, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
let keyCache = { expiresAt: 0, keys: [] };
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

function equalValues(left, right) {
  const a = encoder.encode(String(left || ""));
  const b = encoder.encode(String(right || ""));
  let difference = a.length ^ b.length;
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) difference |= (a[index] || 0) ^ (b[index] || 0);
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
  const key = `admin:${address}`;
  await env.EVENT_RADAR_DB.prepare(`CREATE TABLE IF NOT EXISTS admin_login_attempts (key TEXT PRIMARY KEY, attempts INTEGER NOT NULL, window_started INTEGER NOT NULL)`).run();
  const now = Date.now();
  const previous = await env.EVENT_RADAR_DB.prepare("SELECT attempts, window_started FROM admin_login_attempts WHERE key = ?").bind(key).first();
  const attempts = previous && now - Number(previous.window_started) < 15 * 60 * 1000 ? Number(previous.attempts) : 0;
  if (attempts >= 5) return { response: json({ message: "Demasiadas tentativas. Tenta novamente dentro de alguns minutos." }, 429) };
  if (!equalValues(password, expected)) {
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

async function accessKey(teamDomain, kid) {
  if (keyCache.expiresAt < Date.now()) {
    const response = await fetch(`${teamDomain}/cdn-cgi/access/certs`);
    if (!response.ok) throw new Error("Não foi possível obter as chaves do Cloudflare Access.");
    const data = await response.json();
    keyCache = { keys: Array.isArray(data.keys) ? data.keys : [], expiresAt: Date.now() + 60 * 60 * 1000 };
  }
  const jwk = keyCache.keys.find(key => key.kid === kid);
  if (!jwk) throw new Error("A chave de acesso não é reconhecida.");
  return crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
}

async function verifiedAccessIdentity(request, env) {
  const token = request.headers.get("Cf-Access-Jwt-Assertion");
  const teamDomain = String(env.TEAM_DOMAIN || "").replace(/\/$/, "");
  const expectedAudiences = String(env.POLICY_AUD || "").split(",").map(value => value.trim()).filter(Boolean);
  if (!teamDomain || !expectedAudiences.length) throw new Error("O login privado ainda não foi configurado.");
  if (!token) throw new Error("Inicia sessão para aceder ao painel.");
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("A sessão de acesso é inválida.");
  const header = decodeJson(parts[0]);
  const payload = decodeJson(parts[1]);
  if (header.alg !== "RS256" || !header.kid) throw new Error("A sessão de acesso usa um formato inválido.");
  const key = await accessKey(teamDomain, header.kid);
  const signed = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
  const verified = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, decodePart(parts[2]), signed);
  const now = Math.floor(Date.now() / 1000);
  const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!verified || payload.iss !== teamDomain || !audiences.some(value => expectedAudiences.includes(value)) || payload.type !== "app" || !Number.isFinite(payload.exp) || payload.exp <= now || (payload.nbf && payload.nbf > now + 60)) {
    throw new Error("A sessão de acesso expirou ou não é válida para este painel.");
  }
  const email = normaliseEmail(payload.email);
  if (!emailPattern.test(email)) throw new Error("A sessão não inclui um e-mail válido.");
  return email;
}

export async function requireAdmin(context, { ownerOnly = false } = {}) {
  if (!context.env.EVENT_RADAR_DB) return { response: json({ message: "Base de dados ainda não ligada." }, 503) };
  try {
    const configured = await ensureAdminUserStore(context.env.EVENT_RADAR_DB, context.env.ADMIN_OWNER_EMAIL);
    if (!configured) return { response: json({ message: "O proprietário do painel ainda não foi configurado." }, 503) };
    const email = await localSessionIdentity(context.request, context.env) || await verifiedAccessIdentity(context.request, context.env);
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
