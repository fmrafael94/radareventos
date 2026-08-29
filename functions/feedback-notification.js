const escapeHtml = value => String(value || "").replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);

export async function sendFeedbackDecisionEmail(env, feedback, status) {
  const to = String(feedback.sender_email || "").trim().toLowerCase();
  const from = String(env.OUTBOUND_EMAIL_FROM || "").trim();
  const apiKey = String(env.RESEND_API_KEY || "").trim();
  if (!to || !from || !apiKey) return "not_configured";

  const accepted = status === "published";
  const recipient = escapeHtml(feedback.sender_name || "").trim() || "olá";
  const eventName = escapeHtml(feedback.event_name || "o teu pedido");
  const subject = accepted ? "O teu pedido foi aceite — Desvio" : "Atualização sobre o teu pedido — Desvio";
  const headline = accepted ? "O teu pedido foi aceite." : "O teu pedido foi analisado.";
  const message = accepted
    ? `A sugestão <strong>${eventName}</strong> foi aceite e será publicada na agenda assim que a informação estiver pronta.`
    : `Analisámos a sugestão <strong>${eventName}</strong>, mas não conseguimos publicá-la neste momento.`;
  const html = `<!doctype html><html lang="pt-PT"><body style="margin:0;padding:28px;background:#f5f5ee;color:#17241c;font-family:Arial,sans-serif"><main style="max-width:560px;margin:0 auto;padding:30px;border-radius:16px;background:#fffdf8"><p style="margin:0 0 20px;color:#4d7149;font-size:14px;font-weight:700;letter-spacing:.08em;text-transform:uppercase">Desvio</p><h1 style="margin:0 0 16px;font-size:28px;line-height:1.05">${headline}</h1><p style="margin:0 0 14px;font-size:16px;line-height:1.55">Olá, ${recipient}.</p><p style="margin:0;font-size:16px;line-height:1.55">${message}</p><p style="margin:24px 0 0;color:#617064;font-size:14px;line-height:1.5">Obrigado por melhorares a agenda connosco.</p></main></body></html>`;
  const text = accepted
    ? `Olá, ${feedback.sender_name || ""}. A sugestão ${feedback.event_name || ""} foi aceite e será publicada na agenda assim que a informação estiver pronta. Obrigado por melhorares a agenda connosco.`
    : `Olá, ${feedback.sender_name || ""}. Analisámos a sugestão ${feedback.event_name || ""}, mas não conseguimos publicá-la neste momento. Obrigado por melhorares a agenda connosco.`;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "User-Agent": "Desvio/1.0",
        "Idempotency-Key": `feedback-${feedback.id}-${status}`
      },
      body: JSON.stringify({ from, to: [to], subject, html, text })
    });
    return response.ok ? "sent" : "failed";
  } catch {
    return "failed";
  }
}
