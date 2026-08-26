import { ingestAutomationReport } from "../../automation-review-store.js";

const json = (body, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

function authorised(request, env) {
  const token = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") || "";
  return Boolean(env.AUDIT_INGEST_TOKEN && token && token === env.AUDIT_INGEST_TOKEN);
}

export async function onRequestPost(context) {
  if (!authorised(context.request, context.env)) return json({ message: "Não autorizado." }, 401);
  if (!context.env.EVENT_RADAR_DB) return json({ message: "Base de dados ainda não ligada." }, 503);
  let payload;
  try { payload = await context.request.json(); } catch { return json({ message: "Relatório inválido." }, 400); }
  const kind = payload?.kind;
  try {
    const summary = await ingestAutomationReport(context.env.EVENT_RADAR_DB, kind, payload.report);
    return json({ ok: true, ...summary });
  } catch (error) {
    return json({ message: error.message || "Não foi possível guardar o relatório." }, 400);
  }
}
