const json = (body, status = 200) => Response.json(body, {
  status,
  headers: { "Cache-Control": "no-store" }
});

const text = (value, limit) => typeof value === "string" ? value.trim().slice(0, limit) : "";
const validUrl = value => {
  if (!value) return "";
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
};

async function validateTurnstile(token, secret, remoteip) {
  if (!token || !secret) return false;
  const data = new FormData();
  data.append("secret", secret);
  data.append("response", token);
  if (remoteip) data.append("remoteip", remoteip);
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: data
  });
  const result = await response.json();
  return result.success === true;
}

export async function onRequestPost(context) {
  if (!context.env.EVENT_RADAR_DB || !context.env.TURNSTILE_SECRET_KEY) {
    return json({ message: "O formulário será ativado quando a publicação for concluída." }, 503);
  }

  let payload;
  try {
    payload = await context.request.json();
  } catch {
    return json({ message: "Pedido inválido." }, 400);
  }

  const kind = payload.kind === "correction" ? "correction" : "suggestion";
  const eventName = text(payload.eventName || payload.eventTitle, 180);
  const message = text(payload.message, 2500);
  const email = text(payload.email, 254).toLowerCase();
  const officialUrl = validUrl(text(payload.officialUrl, 1000));
  const eventDate = text(payload.eventDate, 10);
  const city = text(payload.city, 100);

  if (!message || (!eventName && kind === "suggestion")) {
    return json({ message: "Indica o evento e a informação que devemos rever." }, 400);
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ message: "Confirma o endereço de email." }, 400);
  }

  const token = text(payload["cf-turnstile-response"], 2048);
  const remoteip = context.request.headers.get("CF-Connecting-IP") || "";
  let verified = false;
  try {
    verified = await validateTurnstile(token, context.env.TURNSTILE_SECRET_KEY, remoteip);
  } catch {
    return json({ message: "Não foi possível verificar a proteção anti-spam. Tenta novamente." }, 503);
  }
  if (!verified) return json({ message: "Confirma a verificação anti-spam e tenta novamente." }, 400);

  const id = crypto.randomUUID();
  await context.env.EVENT_RADAR_DB.prepare(`
    INSERT INTO feedback (
      id, kind, event_id, event_name, event_date, city, official_url,
      message, sender_name, sender_email, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', datetime('now'))
  `).bind(
    id,
    kind,
    text(payload.eventId, 120) || null,
    eventName || null,
    eventDate || null,
    city || null,
    officialUrl || null,
    message,
    text(payload.name, 80) || null,
    email || null
  ).run();

  return json({ ok: true, id });
}
