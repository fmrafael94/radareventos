import { ingestAutomationReport } from "../../automation-review-store.js";

const json = (body, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

async function authorised(request, env) {
  const token = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") || "";
  if (!env.AUDIT_INGEST_TOKEN || !token) return false;
  const encoder = new TextEncoder();
  const [received, expected] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(token)),
    crypto.subtle.digest("SHA-256", encoder.encode(env.AUDIT_INGEST_TOKEN))
  ]);
  return crypto.subtle.timingSafeEqual(received, expected);
}

export async function onRequestPost(context) {
  if (!(await authorised(context.request, context.env))) return json({ message: "Não autorizado." }, 401);
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
