import { requireAdmin } from "../../admin-auth.js";

const invalid = () => new Response("Não encontrado.", { status: 404, headers: { "Cache-Control": "no-store" } });

export async function onRequestGet(context) {
  const session = await requireAdmin(context);
  if (session.response) return session.response;
  if (!context.env.EVENT_POSTERS) return new Response("Armazenamento ainda não ligado.", { status: 503 });
  const key = new URL(context.request.url).searchParams.get("key") || "";
  if (!key.startsWith("feedback-posters/") || key.length > 240) return invalid();
  const object = await context.env.EVENT_POSTERS.get(key);
  if (!object) return invalid();
  return new Response(object.body, { headers: { "Content-Type": object.httpMetadata?.contentType || "application/octet-stream", "Cache-Control": "private, no-store" } });
}
