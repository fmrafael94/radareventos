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
    payload = await context.request.formData();
  } catch {
    return json({ message: "Pedido inválido." }, 400);
  }

  const value = name => payload.get(name);
  const field = (name, limit) => text(value(name), limit);

  const kind = field("kind", 20) === "correction" ? "correction" : "suggestion";
  const eventName = field("eventName", 180) || field("eventTitle", 180);
  const message = field("message", 2500);
  const email = field("email", 254).toLowerCase();
  const officialUrl = validUrl(field("officialUrl", 1000));
  const posterUrl = validUrl(field("posterUrl", 1000));
  const eventDate = field("eventDate", 10);
  const city = field("city", 100);

  if (!message || (!eventName && kind === "suggestion")) {
    return json({ message: "Indica o evento e a informação que devemos rever." }, 400);
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ message: "Confirma o endereço de email." }, 400);
  }

  const token = field("cf-turnstile-response", 2048);
  const remoteip = context.request.headers.get("CF-Connecting-IP") || "";
  let verified = false;
  try {
    verified = await validateTurnstile(token, context.env.TURNSTILE_SECRET_KEY, remoteip);
  } catch {
    return json({ message: "Não foi possível verificar a proteção anti-spam. Tenta novamente." }, 503);
  }
  if (!verified) return json({ message: "Confirma a verificação anti-spam e tenta novamente." }, 400);

  const posterFile = value("posterFile");
  let posterObjectKey = "";
  let posterFileName = "";
  if (posterFile && typeof posterFile !== "string" && posterFile.size > 0) {
    const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
    if (!allowedTypes.has(posterFile.type) || posterFile.size > 5 * 1024 * 1024) {
      return json({ message: "O cartaz deve ser JPG, PNG ou WebP e ter no máximo 5 MB." }, 400);
    }
    if (!context.env.EVENT_POSTERS) {
      return json({ message: "O envio de imagens será ativado quando a publicação for concluída. Usa, por agora, o link do cartaz." }, 503);
    }
    const extension = posterFile.type === "image/png" ? "png" : posterFile.type === "image/webp" ? "webp" : "jpg";
    posterObjectKey = `feedback-posters/${crypto.randomUUID()}.${extension}`;
    posterFileName = text(posterFile.name, 180);
    await context.env.EVENT_POSTERS.put(posterObjectKey, posterFile.stream(), {
      httpMetadata: { contentType: posterFile.type }
    });
  }

  const id = crypto.randomUUID();
  await context.env.EVENT_RADAR_DB.prepare(`
    INSERT INTO feedback (
      id, kind, event_id, event_name, event_date, city, official_url,
      poster_url, poster_object_key, poster_file_name,
      message, sender_name, sender_email, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', datetime('now'))
  `).bind(
    id,
    kind,
    field("eventId", 120) || null,
    eventName || null,
    eventDate || null,
    city || null,
    officialUrl || null,
    posterUrl || null,
    posterObjectKey || null,
    posterFileName || null,
    message,
    field("name", 80) || null,
    email || null
  ).run();

  return json({ ok: true, id });
}
