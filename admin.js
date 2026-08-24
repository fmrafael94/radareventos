const reports = document.querySelector("#reports");
const adminStatus = document.querySelector("#admin-status");
const filters = document.querySelector("#status-filters");
let activeStatus = "new";

const escapeHtml = value => String(value || "").replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
const dateTime = value => value ? new Intl.DateTimeFormat("pt-PT", { dateStyle: "medium", timeStyle: "short" }).format(new Date(`${value.replace(" ", "T")}Z`)) : "—";
const displayUrl = value => value ? `<a href="${escapeHtml(value)}" target="_blank" rel="noopener">Abrir fonte ↗</a>` : "<span>Sem link enviado</span>";

function reportCard(item) {
  const title = item.event_name || "Evento sem nome";
  const poster = item.poster_object_key
    ? `<a class="submitted-poster" href="/api/admin/poster?key=${encodeURIComponent(item.poster_object_key)}" target="_blank" rel="noopener"><img src="/api/admin/poster?key=${encodeURIComponent(item.poster_object_key)}" alt="Cartaz enviado para ${escapeHtml(title)}" /></a>`
    : item.poster_url
      ? `<a class="submitted-poster" href="${escapeHtml(item.poster_url)}" target="_blank" rel="noopener"><img src="${escapeHtml(item.poster_url)}" alt="Cartaz indicado para ${escapeHtml(title)}" /></a>`
      : "";
  return `<article class="report" data-id="${escapeHtml(item.id)}">
    <div class="report-meta"><span class="kind">${item.kind === "correction" ? "Correção" : "Sugestão"}</span><time>${dateTime(item.created_at)}</time></div>
    <div class="report-heading"><div><h2>${escapeHtml(title)}</h2><p>${escapeHtml([item.event_date, item.city].filter(Boolean).join(" · ") || "Data ou local por confirmar")}</p></div>${poster}</div>
    <p class="message">${escapeHtml(item.message)}</p>
    <dl>
      <div><dt>Fonte oficial</dt><dd>${displayUrl(item.official_url)}</dd></div>
      <div><dt>Contacto</dt><dd>${escapeHtml(item.sender_name || "Anónimo")}${item.sender_email ? ` · <a href="mailto:${escapeHtml(item.sender_email)}">${escapeHtml(item.sender_email)}</a>` : ""}</dd></div>
      ${item.poster_file_name ? `<div><dt>Ficheiro enviado</dt><dd>${escapeHtml(item.poster_file_name)}</dd></div>` : ""}
    </dl>
    <label class="staff-note"><span>Nota privada</span><textarea maxlength="1500" placeholder="O que verificaste ou o que falta confirmar?">${escapeHtml(item.staff_note || "")}</textarea></label>
    <div class="report-actions">
      <button type="button" data-next-status="reviewing">Em análise</button>
      <button type="button" data-next-status="published">Marcar publicado</button>
      <button type="button" data-next-status="rejected" class="reject">Rejeitar</button>
      <button type="button" data-next-status="closed" class="secondary">Fechar</button>
    </div>
  </article>`;
}

async function loadReports() {
  adminStatus.textContent = "A carregar pedidos…";
  reports.innerHTML = "";
  try {
    const response = await fetch(`/api/admin/feedback?status=${encodeURIComponent(activeStatus)}`, { headers: { Accept: "application/json" } });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.message || "Não foi possível carregar os pedidos.");
    reports.innerHTML = result.items.length ? result.items.map(reportCard).join("") : document.querySelector("#empty-state").innerHTML;
    adminStatus.textContent = result.items.length ? `${result.items.length} pedido${result.items.length === 1 ? "" : "s"}.` : "";
  } catch (error) {
    adminStatus.textContent = error.message || "Não foi possível carregar os pedidos.";
  }
}

filters.addEventListener("click", event => {
  const button = event.target.closest("[data-status]");
  if (!button) return;
  activeStatus = button.dataset.status;
  filters.querySelectorAll("button").forEach(item => item.setAttribute("aria-pressed", String(item === button)));
  loadReports();
});

reports.addEventListener("click", async event => {
  const button = event.target.closest("[data-next-status]");
  if (!button) return;
  const card = button.closest(".report");
  const buttons = card.querySelectorAll("button");
  buttons.forEach(item => { item.disabled = true; });
  try {
    const response = await fetch("/api/admin/feedback", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ id: card.dataset.id, status: button.dataset.nextStatus, staffNote: card.querySelector("textarea").value })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.message || "Não foi possível atualizar o pedido.");
    adminStatus.textContent = "Pedido atualizado.";
    loadReports();
  } catch (error) {
    adminStatus.textContent = error.message || "Não foi possível atualizar o pedido.";
    buttons.forEach(item => { item.disabled = false; });
  }
});

document.querySelector("#refresh").addEventListener("click", loadReports);
loadReports();
