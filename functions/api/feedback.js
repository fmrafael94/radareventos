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

  const requestedKind = field("kind", 20);
  const kind = requestedKind === "correction" ? "correction" : requestedKind === "promoter" ? "promoter" : "suggestion";
  const eventName = field("eventName", 180) || field("eventTitle", 180);
  const submittedMessage = field("message", 2500);
  const email = field("email", 254).toLowerCase();
  const officialUrl = validUrl(field("officialUrl", 1000));
  const posterUrl = validUrl(field("posterUrl", 1000));
  const eventDate = field("eventDate", 10);
  const city = field("city", 100);
  const promoterLocation = field("promoterLocation", 100);
  const genres = field("genres", 180);
  const instagramUrl = validUrl(field("instagramUrl", 1000));
  const agendaUrl = validUrl(field("agendaUrl", 1000));

  const posterFile = value("posterFile");
  const hasPosterFile = posterFile && typeof posterFile !== "string" && posterFile.size > 0;
  const senderName = field("name", 80);
  const hasContribution = Boolean(submittedMessage || eventName || officialUrl || posterUrl || hasPosterFile);
  if (!hasContribution) {
    return json({ message: "Escreve uma nota, deixa um link ou envia um cartaz para revisão." }, 400);
  }
  if (value("privacyAcknowledged") !== "on") {
    return json({ message: "Confirma que leste a Política de Privacidade." }, 400);
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ message: "Confirma o endereço de email." }, 400);
  }
  if (kind === "suggestion") {
    if (!senderName || !email || !eventName || !eventDate || !city || !officialUrl || !submittedMessage) {
      return json({ message: "Preenche todos os campos obrigatórios para sugerir um evento." }, 400);
    }
    if (!posterUrl && !hasPosterFile) {
      return json({ message: "Inclui o link do cartaz ou envia uma imagem oficial." }, 400);
    }
  }
  if (kind === "promoter") {
    if (!senderName || !email || !eventName || !promoterLocation || !genres || !officialUrl || !instagramUrl || !agendaUrl || !submittedMessage) {
      return json({ message: "Preenche todos os campos para adicionar uma página ao Desvio." }, 400);
    }
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

  let posterObjectKey = "";
  let posterFileName = "";
  if (posterFile && typeof posterFile !== "string" && posterFile.size > 0) {
    const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
    if (!allowedTypes.has(posterFile.type) || posterFile.size > 2 * 1024 * 1024) {
      return json({ message: "O cartaz deve ser JPG, PNG ou WebP e ter no máximo 2 MB." }, 400);
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

  const message = kind === "promoter"
    ? `Área: ${promoterLocation}\nGéneros: ${genres}\nInstagram: ${instagramUrl}\nAgenda: ${agendaUrl}\n\n${submittedMessage}`
    : submittedMessage || (hasPosterFile
    ? "Cartaz oficial enviado para revisão."
    : posterUrl
      ? "Link de cartaz enviado para revisão."
      : officialUrl
        ? "Link oficial enviado para revisão."
        : "Sugestão enviada para revisão.");
  const id = crypto.randomUUID();
  await context.env.EVENT_RADAR_DB.prepare(`
    INSERT INTO feedback (
      id, kind, event_id, event_name, event_date, city, official_url,
      poster_url, poster_object_key, poster_file_name,
      message, sender_name, sender_email, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', datetime('now'))
  `).bind(
    id,
    kind === "promoter" ? "suggestion" : kind,
    kind === "promoter" ? "promoter-page" : field("eventId", 120) || null,
    eventName || null,
    eventDate || null,
    (kind === "promoter" ? promoterLocation : city) || null,
    officialUrl || null,
    posterUrl || null,
    posterObjectKey || null,
    posterFileName || null,
    message,
    senderName || null,
    email || null
  ).run();

  return json({ ok: true, id });
}
