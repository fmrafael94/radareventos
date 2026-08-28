import { adminJson as json, emailPattern, ensureAdminUserStore, normaliseEmail, requireAdmin } from "../../admin-auth.js";

const readBody = async request => {
  try { return await request.json(); } catch { return null; }
};

export async function onRequestGet(context) {
  const session = await requireAdmin(context, { ownerOnly: true });
  if (session.response) return session.response;
  const { results } = await context.env.EVENT_RADAR_DB.prepare(`
    SELECT email, role, status, created_at, updated_at FROM admin_users ORDER BY role DESC, email ASC
  `).all();
  return json({ currentUser: session.user, items: results || [] });
}

export async function onRequestPost(context) {
  const session = await requireAdmin(context, { ownerOnly: true });
  if (session.response) return session.response;
  const body = await readBody(context.request);
  const email = normaliseEmail(body?.email);
  if (!emailPattern.test(email)) return json({ message: "Indica um e-mail válido." }, 400);
  await ensureAdminUserStore(context.env.EVENT_RADAR_DB, context.env.ADMIN_OWNER_EMAIL);
  await context.env.EVENT_RADAR_DB.prepare(`
    INSERT INTO admin_users (email, role, status) VALUES (?, 'editor', 'active')
    ON CONFLICT(email) DO UPDATE SET status = 'active', updated_at = datetime('now')
  `).bind(email).run();
  return json({ ok: true, message: "E-mail autorizado." }, 201);
}

export async function onRequestPatch(context) {
  const session = await requireAdmin(context, { ownerOnly: true });
  if (session.response) return session.response;
  const body = await readBody(context.request);
  const email = normaliseEmail(body?.email);
  const status = body?.status === "active" ? "active" : body?.status === "disabled" ? "disabled" : "";
  if (!emailPattern.test(email) || !status) return json({ message: "Pedido inválido." }, 400);
  if (email === normaliseEmail(context.env.ADMIN_OWNER_EMAIL)) return json({ message: "O e-mail do proprietário não pode ser desativado aqui." }, 400);
  const result = await context.env.EVENT_RADAR_DB.prepare(`
    UPDATE admin_users SET status = ?, updated_at = datetime('now') WHERE email = ?
  `).bind(status, email).run();
  if (!result.meta.changes) return json({ message: "E-mail não encontrado." }, 404);
  return json({ ok: true });
}
