const json = (body, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const sessionCookie = "desvio_admin_session";
const encoder = new TextEncoder();
const sessionLifetime = 60 * 60 * 24 * 30;
const codeLifetime = 10 * 60 * 1000;

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

async function digestValue(value) {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(String(value || ""))));
  return [...digest].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

function createOneTimeCode() {
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return String(100000 + (bytes[0] % 900000));
}

async function ensureAdminCodeStore(db) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS admin_login_codes (
      email TEXT PRIMARY KEY COLLATE NOCASE,
      code_hash TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      sent_at INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `).run();
}

async function sendAdminCode(env, email, code) {
  const from = String(env.OUTBOUND_EMAIL_FROM || "").trim();
  const apiKey = String(env.RESEND_API_KEY || "").trim();
  if (!from || !apiKey) return false;
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "User-Agent": "Desvio/1.0",
        "Idempotency-Key": `admin-login-${await digestValue(`${email}|${code}`)}`
      },
      body: JSON.stringify({
        from,
        to: [email],
        subject: "O teu código de acesso — Desvio",
        text: `O teu código de acesso ao painel do Desvio é ${code}. Expira em 10 minutos. Se não foste tu, ignora este email.`,
        html: `<!doctype html><html lang="pt-PT"><body style="margin:0;padding:28px;background:#f5f5ee;color:#17241c;font-family:Arial,sans-serif"><main style="max-width:560px;margin:0 auto;padding:30px;border-radius:16px;background:#fffdf8"><p style="margin:0 0 20px;color:#4d7149;font-size:14px;font-weight:700;letter-spacing:.08em;text-transform:uppercase">Desvio · área privada</p><h1 style="margin:0 0 16px;font-size:28px;line-height:1.05">O teu código de acesso</h1><p style="margin:0 0 20px;font-size:16px;line-height:1.55">Usa este código único para entrar no painel. Expira em 10 minutos.</p><p style="margin:0;padding:18px;border-radius:12px;background:#e8f0dc;color:#193f2d;font-size:30px;font-weight:700;letter-spacing:.18em;text-align:center">${code}</p><p style="margin:24px 0 0;color:#617064;font-size:14px;line-height:1.5">Se não pediste este código, podes ignorar este email.</p></main></body></html>`
      })
    });
    return response.ok;
  } catch {
    return false;
  }
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
  const token = await signSession({ email: normaliseEmail(email), exp: Math.floor(Date.now() / 1000) + sessionLifetime }, secret);
  return `${sessionCookie}=${token}; Path=/; Max-Age=${sessionLifetime}; HttpOnly; Secure; SameSite=Strict`;
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

export async function requestAdminEmailCode(context, requestedEmail) {
  const { env, request } = context;
  if (!env.EVENT_RADAR_DB) return { response: json({ message: "Base de dados ainda não ligada." }, 503) };
  const owner = normaliseEmail(env.ADMIN_OWNER_EMAIL);
  const email = normaliseEmail(requestedEmail);
  if (!emailPattern.test(owner)) return { response: json({ message: "O proprietário do painel ainda não foi configurado." }, 503) };
  if (!emailPattern.test(email)) return { response: json({ message: "Indica o email de administração." }, 400) };
  if (!(await equalValues(email, owner))) return { response: json({ message: "Este email não tem acesso ao painel." }, 403) };
  if (!String(env.ADMIN_SESSION_SECRET || "").trim()) return { response: json({ message: "A sessão privada ainda não foi configurada." }, 503) };
  if (!String(env.RESEND_API_KEY || "").trim() || !String(env.OUTBOUND_EMAIL_FROM || "").trim()) {
    return { response: json({ message: "O acesso por email ainda não foi configurado." }, 503) };
  }
  await ensureAdminUserStore(env.EVENT_RADAR_DB, owner);
  await ensureAdminCodeStore(env.EVENT_RADAR_DB);
  const address = request.headers.get("CF-Connecting-IP") || "sem-ip";
  const key = `admin-code:${await digestValue(address)}`;
  const now = Date.now();
  const previous = await env.EVENT_RADAR_DB.prepare("SELECT attempts, window_started FROM admin_login_attempts WHERE key = ?").bind(key).first();
  const attempts = previous && now - Number(previous.window_started) < 15 * 60 * 1000 ? Number(previous.attempts) : 0;
  if (attempts >= 5) return { response: json({ message: "Demasiados pedidos. Tenta novamente dentro de alguns minutos." }, 429) };
  const existing = await env.EVENT_RADAR_DB.prepare("SELECT sent_at FROM admin_login_codes WHERE email = ?").bind(email).first();
  if (existing && now - Number(existing.sent_at) < 60 * 1000) return { response: json({ message: "Aguarda um minuto antes de pedir outro código." }, 429) };
  const code = createOneTimeCode();
  if (!(await sendAdminCode(env, email, code))) return { response: json({ message: "Não foi possível enviar o código. Tenta novamente." }, 502) };
  await env.EVENT_RADAR_DB.prepare(`
    INSERT INTO admin_login_codes (email, code_hash, expires_at, attempts, sent_at, updated_at)
    VALUES (?, ?, ?, 0, ?, datetime('now'))
    ON CONFLICT(email) DO UPDATE SET code_hash = excluded.code_hash, expires_at = excluded.expires_at, attempts = 0, sent_at = excluded.sent_at, updated_at = datetime('now')
  `).bind(email, await digestValue(`${email}|${code}|${env.ADMIN_SESSION_SECRET}`), now + codeLifetime, now).run();
  await env.EVENT_RADAR_DB.prepare(`INSERT INTO admin_login_attempts (key, attempts, window_started) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET attempts = excluded.attempts, window_started = excluded.window_started`)
    .bind(key, attempts + 1, attempts ? previous.window_started : now).run();
  return { expiresIn: Math.floor(codeLifetime / 1000) };
}

export async function loginWithAdminEmailCode(context, requestedEmail, suppliedCode) {
  const { env } = context;
  if (!env.EVENT_RADAR_DB) return { response: json({ message: "Base de dados ainda não ligada." }, 503) };
  const owner = normaliseEmail(env.ADMIN_OWNER_EMAIL);
  const email = normaliseEmail(requestedEmail);
  const code = String(suppliedCode || "").replace(/\s/g, "");
  if (!emailPattern.test(owner) || !emailPattern.test(email) || !/^\d{6}$/.test(code)) return { response: json({ message: "Indica o email de administração e o código de seis dígitos." }, 400) };
  if (!(await equalValues(email, owner))) return { response: json({ message: "Este email não tem acesso ao painel." }, 403) };
  await ensureAdminCodeStore(env.EVENT_RADAR_DB);
  const record = await env.EVENT_RADAR_DB.prepare("SELECT code_hash, expires_at, attempts FROM admin_login_codes WHERE email = ?").bind(email).first();
  if (!record || Date.now() > Number(record.expires_at)) {
    if (record) await env.EVENT_RADAR_DB.prepare("DELETE FROM admin_login_codes WHERE email = ?").bind(email).run();
    return { response: json({ message: "O código expirou. Pede um novo código." }, 401) };
  }
  if (Number(record.attempts) >= 5) return { response: json({ message: "Demasiadas tentativas. Pede um novo código." }, 429) };
  const expected = await digestValue(`${email}|${code}|${env.ADMIN_SESSION_SECRET}`);
  if (!(await equalValues(expected, record.code_hash))) {
    await env.EVENT_RADAR_DB.prepare("UPDATE admin_login_codes SET attempts = attempts + 1, updated_at = datetime('now') WHERE email = ?").bind(email).run();
    return { response: json({ message: "Código incorreto." }, 401) };
  }
  await env.EVENT_RADAR_DB.prepare("DELETE FROM admin_login_codes WHERE email = ?").bind(email).run();
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
