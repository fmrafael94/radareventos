import { withinRequestLimit } from "../request-rate-limit.js";

const json = (body, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
const email = value => typeof value === "string" ? value.trim().toLowerCase().slice(0, 254) : "";
const reference = value => typeof value === "string" ? value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12) : "";

export async function onRequestGet(context) {
  if (!context.env.EVENT_RADAR_DB) return json({ message: "O acompanhamento ainda não está disponível." }, 503);
  const url = new URL(context.request.url);
  const submittedEmail = email(url.searchParams.get("email"));
  const submittedReference = reference(url.searchParams.get("reference"));
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(submittedEmail) || !/^[A-Z0-9]{12}$/.test(submittedReference)) {
    return json({ message: "Indica a referência completa e o e-mail usado no envio." }, 400);
  }
  try {
    const allowed = await withinRequestLimit(context.env.EVENT_RADAR_DB, context.request, {
      scope: "submission-status",
      limit: 12,
      windowMs: 15 * 60 * 1000
    });
    if (!allowed) return json({ message: "Foram feitas demasiadas tentativas. Tenta novamente dentro de alguns minutos." }, 429);
    const item = await context.env.EVENT_RADAR_DB.prepare(`
      SELECT status, event_name, kind, created_at
      FROM feedback
      WHERE tracking_code = ? AND sender_email = ?
      LIMIT 1
    `).bind(submittedReference, submittedEmail).first();
    if (!item) return json({ message: "Não encontrámos um pedido com estes dados." }, 404);
    const labels = { new: "Recebido", reviewing: "Em revisão", published: "Publicado", rejected: "Não publicado", closed: "Fechado" };
    return json({
      item: {
        status: labels[item.status] || "Em revisão",
        title: item.event_name || "Pedido ao Desvio",
        submittedAt: item.created_at,
        kind: item.kind
      }
    });
  } catch {
    return json({ message: "O acompanhamento está a ser atualizado. Tenta novamente daqui a pouco." }, 503);
  }
}
