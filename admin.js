const reports = document.querySelector("#reports");
const adminStatus = document.querySelector("#admin-status");
const viewFilters = document.querySelector("#review-views");
const communityFilters = document.querySelector("#status-filters");
const automationFilters = document.querySelector("#automation-status-filters");
const filterContext = document.querySelector("#filter-context");
let activeView = "community";
let activeCommunityStatus = "new";
let activeAutomationStatus = "new";

const escapeHtml = value => String(value || "").replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
const dateTime = value => value ? new Intl.DateTimeFormat("pt-PT", { dateStyle: "medium", timeStyle: "short" }).format(new Date(`${value.replace(" ", "T")}Z`)) : "—";
const displayUrl = value => value ? `<a href="${escapeHtml(value)}" target="_blank" rel="noopener">Abrir fonte ↗</a>` : "<span>Sem link enviado</span>";

function userRow(user) {
  const owner = user.role === "owner";
  const active = user.status === "active";
  return `<div class="admin-user" data-email="${escapeHtml(user.email)}">
    <div><b>${escapeHtml(user.email)}</b><small>${owner ? "Proprietário" : active ? "Autorizado" : "Acesso suspenso"}</small></div>
    ${owner ? "" : `<button type="button" class="secondary" data-user-status="${active ? "disabled" : "active"}">${active ? "Suspender" : "Reativar"}</button>`}
  </div>`;
}

function reportCard(item) {
  const title = item.event_name || "Evento sem nome";
  const promoterPage = item.event_id === "promoter-page";
  const moderation = item.image_moderation_status && item.image_moderation_status !== "not_applicable"
    ? `<div><dt>Verificação da imagem</dt><dd>${escapeHtml(item.image_moderation_status === "approved" ? "Aprovada automaticamente" : item.image_moderation_status === "review" ? "Retida para revisão" : "Rejeitada automaticamente")}${item.image_moderation_reason ? ` · ${escapeHtml(item.image_moderation_reason)}` : ""}</dd></div>`
    : "";
  const poster = item.poster_object_key
    ? `<a class="submitted-poster" href="/api/admin/poster?key=${encodeURIComponent(item.poster_object_key)}" target="_blank" rel="noopener"><img src="/api/admin/poster?key=${encodeURIComponent(item.poster_object_key)}" alt="Cartaz enviado para ${escapeHtml(title)}" /></a>`
    : item.poster_url
      ? `<a class="submitted-poster" href="${escapeHtml(item.poster_url)}" target="_blank" rel="noopener"><img src="${escapeHtml(item.poster_url)}" alt="Cartaz indicado para ${escapeHtml(title)}" /></a>`
      : "";
  return `<article class="report" data-id="${escapeHtml(item.id)}">
    <div class="report-meta"><span class="kind">${promoterPage ? "Página de promotora" : item.kind === "correction" ? "Correção" : "Sugestão"}</span><time>${dateTime(item.created_at)}</time></div>
    <div class="report-heading"><div><h2>${escapeHtml(title)}</h2><p>${escapeHtml([item.event_date, item.city].filter(Boolean).join(" · ") || "Data ou local por confirmar")}</p></div>${poster}</div>
    <p class="message">${escapeHtml(item.message)}</p>
    <dl>
      <div><dt>Fonte oficial</dt><dd>${displayUrl(item.official_url)}</dd></div>
      <div><dt>Contacto</dt><dd>${escapeHtml(item.sender_name || "Anónimo")}${item.sender_email ? ` · <a href="mailto:${escapeHtml(item.sender_email)}">${escapeHtml(item.sender_email)}</a>` : ""}</dd></div>
      ${item.poster_file_name ? `<div><dt>Ficheiro enviado</dt><dd>${escapeHtml(item.poster_file_name)}</dd></div>` : ""}
      ${moderation}
    </dl>
    ${item.kind === "suggestion" && !promoterPage ? `<fieldset class="event-review-fields"><legend>Dados para publicação</legend><label><span>Título</span><input name="eventName" maxlength="180" value="${escapeHtml(item.event_name || "")}" /></label><label><span>Data</span><input name="eventDate" type="date" value="${escapeHtml(item.event_date || "")}" /></label><label><span>Último dia (se aplicável)</span><input name="eventEndDate" type="date" /></label><label><span>Cidade / concelho</span><input name="city" maxlength="100" value="${escapeHtml(item.city || "")}" /></label><label><span>Local</span><input name="venue" maxlength="180" placeholder="Sala, recinto ou morada" /></label><label><span>Bilheteira / entrada</span><input name="tickets" maxlength="220" placeholder="Ex.: Entrada livre · 15 € · Bilheteira por confirmar" /></label><label><span>Link de bilheteira (se existir)</span><input name="ticketUrl" type="url" maxlength="1000" placeholder="https://" /></label><label><span>Link direto do cartaz</span><input name="posterUrl" type="url" maxlength="1000" placeholder="https://" value="${escapeHtml(item.poster_url || "")}" /></label><label class="official-source"><span>Página oficial direta</span><input name="officialUrl" type="url" maxlength="1000" placeholder="https://" value="${escapeHtml(item.official_url || "")}" /></label></fieldset>` : ""}
    <label class="staff-note"><span>Nota privada</span><textarea maxlength="1500" placeholder="O que verificaste ou o que falta confirmar?">${escapeHtml(item.staff_note || "")}</textarea></label>
    <div class="report-actions">
      <button type="button" data-next-status="reviewing">Em análise</button>
      <button type="button" data-next-status="published">${promoterPage ? "Aprovar página" : item.kind === "suggestion" ? "Publicar após confirmar" : "Concluir correção"}</button>
      <button type="button" data-next-status="rejected" class="reject">Rejeitar</button>
      <button type="button" data-next-status="closed" class="secondary">Fechar</button>
    </div>
  </article>`;
}

function automationCard(item) {
  const isLink = item.category === "link";
  const result = item.result ? `<span class="automation-result">Resultado automático: ${escapeHtml(item.result)}</span>` : "";
  return `<article class="report automation-report" data-id="${escapeHtml(item.id)}">
    <div class="report-meta"><span class="kind">${isLink ? "Link para confirmar" : "Fonte a explorar"}</span><time>Visto: ${dateTime(item.last_seen_at)}</time></div>
    <div class="report-heading"><div><h2>${escapeHtml(item.title)}</h2><p>${escapeHtml(item.detail || "Requer confirmação manual.")}</p></div></div>
    <dl><div><dt>${isLink ? "Página ou bilheteira" : "Fonte"}</dt><dd><a href="${escapeHtml(item.url)}" target="_blank" rel="noopener">Abrir e confirmar ↗</a></dd></div><div><dt>Sinal</dt><dd>${result || "Sem resultado"}</dd></div></dl>
    <p class="automation-note">Este sinal foi criado por uma ronda automática. Confirma a página diretamente antes de alterar ou publicar qualquer evento.</p>
    <details class="automation-editor"><summary>Editar proposta</summary>
      <p>Esta proposta fica guardada aqui até decidires. Só deves aceitar depois de confirmares uma fonte oficial.</p>
      <label><span>${isLink ? "Evento" : "Nome da fonte"}</span><input name="proposalTitle" maxlength="240" value="${escapeHtml(item.proposal_title || item.title)}" /></label>
      <label><span>${isLink ? "Link confirmado / substituto" : "Página a consultar"}</span><input name="proposalUrl" type="url" maxlength="1600" value="${escapeHtml(item.proposal_url || item.url)}" /></label>
      <label><span>Nota da revisão</span><textarea name="editorNote" maxlength="1500" placeholder="O que confirmaste? Que alteração deve ser feita?">${escapeHtml(item.editor_note || "")}</textarea></label>
    </details>
    <div class="report-actions">
      <button type="button" data-automation-status="reviewing">Guardar / em análise</button>
      <button type="button" data-automation-status="resolved"${isLink ? " data-apply-to-agenda=\"true\"" : ""}>${isLink ? "Aceitar e aplicar à agenda" : "Aceitar após confirmar"}</button>
      <button type="button" data-automation-status="ignored" class="secondary">Recusar</button>
    </div>
  </article>`;
}

async function loadReports() {
  adminStatus.textContent = "A carregar pedidos…";
  reports.innerHTML = "";
  try {
    const response = await fetch(`/api/admin/feedback?status=${encodeURIComponent(activeCommunityStatus)}`, { headers: { Accept: "application/json" }, credentials: "same-origin" });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.message || "Não foi possível carregar os pedidos.");
    if (!Array.isArray(result.items)) {
      throw new Error("A área de revisão ainda está a ser configurada. Até ligares o domínio próprio e o acesso privado, revê os pedidos pela base de dados D1.");
    }
    reports.innerHTML = result.items.length ? result.items.map(reportCard).join("") : document.querySelector("#empty-state").innerHTML;
    adminStatus.textContent = result.items.length ? `${result.items.length} pedido${result.items.length === 1 ? "" : "s"}.` : "";
  } catch (error) {
    adminStatus.textContent = error.message || "Não foi possível carregar os pedidos.";
  }
}

async function loadAutomationReviews() {
  adminStatus.textContent = "A carregar revisão automática…";
  reports.innerHTML = "";
  try {
    const response = await fetch(`/api/admin/automation-reviews?status=${encodeURIComponent(activeAutomationStatus)}`, { headers: { Accept: "application/json" }, credentials: "same-origin" });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.message || "Não foi possível carregar a revisão automática.");
    if (!Array.isArray(result.items)) throw new Error("A revisão automática ainda não está configurada.");
    reports.innerHTML = result.items.length ? result.items.map(automationCard).join("") : "<p class=\"empty-state\">Não há sinais neste estado.</p>";
    adminStatus.textContent = result.items.length ? `${result.items.length} sinal${result.items.length === 1 ? "" : "s"} para rever.` : "";
  } catch (error) {
    adminStatus.textContent = error.message || "Não foi possível carregar a revisão automática.";
  }
}

function loadActiveView() {
  return activeView === "automation" ? loadAutomationReviews() : loadReports();
}

function updateReviewControls() {
  const automated = activeView === "automation";
  communityFilters.hidden = automated;
  automationFilters.hidden = !automated;
  filterContext.textContent = automated
    ? "Resultados das rondas — confirma sempre na fonte oficial"
    : "Pedidos enviados por utilizadores";
}

communityFilters.addEventListener("click", event => {
  const button = event.target.closest("[data-status]");
  if (!button) return;
  activeCommunityStatus = button.dataset.status;
  communityFilters.querySelectorAll("button").forEach(item => item.setAttribute("aria-pressed", String(item === button)));
  loadReports();
});

automationFilters.addEventListener("click", event => {
  const button = event.target.closest("[data-status]");
  if (!button) return;
  activeAutomationStatus = button.dataset.status;
  automationFilters.querySelectorAll("button").forEach(item => item.setAttribute("aria-pressed", String(item === button)));
  loadAutomationReviews();
});

viewFilters.addEventListener("click", event => {
  const button = event.target.closest("[data-view]");
  if (!button) return;
  activeView = button.dataset.view;
  viewFilters.querySelectorAll("button").forEach(item => item.setAttribute("aria-pressed", String(item === button)));
  updateReviewControls();
  loadActiveView();
});

reports.addEventListener("click", async event => {
  const automationButton = event.target.closest("[data-automation-status]");
  if (automationButton) {
    const card = automationButton.closest(".report");
    const buttons = card.querySelectorAll("button");
    buttons.forEach(item => { item.disabled = true; });
    try {
      const response = await fetch("/api/admin/automation-reviews", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Accept: "application/json" }, credentials: "same-origin",
        body: JSON.stringify({
          id: card.dataset.id,
          status: automationButton.dataset.automationStatus,
          applyToAgenda: automationButton.dataset.applyToAgenda === "true",
          proposalTitle: card.querySelector('[name="proposalTitle"]')?.value,
          proposalUrl: card.querySelector('[name="proposalUrl"]')?.value,
          editorNote: card.querySelector('[name="editorNote"]')?.value
        })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || "Não foi possível atualizar o sinal.");
      adminStatus.textContent = "Sinal atualizado.";
      loadAutomationReviews();
    } catch (error) {
      adminStatus.textContent = error.message || "Não foi possível atualizar o sinal.";
      buttons.forEach(item => { item.disabled = false; });
    }
    return;
  }
  const button = event.target.closest("[data-next-status]");
  if (!button) return;
  const card = button.closest(".report");
  const buttons = card.querySelectorAll("button");
  buttons.forEach(item => { item.disabled = true; });
  try {
    const response = await fetch("/api/admin/feedback", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Accept: "application/json" }, credentials: "same-origin",
      body: JSON.stringify({
        id: card.dataset.id,
        status: button.dataset.nextStatus,
        staffNote: card.querySelector("textarea").value,
        eventName: card.querySelector('[name="eventName"]')?.value,
        eventDate: card.querySelector('[name="eventDate"]')?.value,
        eventEndDate: card.querySelector('[name="eventEndDate"]')?.value,
        city: card.querySelector('[name="city"]')?.value,
        venue: card.querySelector('[name="venue"]')?.value,
        tickets: card.querySelector('[name="tickets"]')?.value,
        ticketUrl: card.querySelector('[name="ticketUrl"]')?.value,
        posterUrl: card.querySelector('[name="posterUrl"]')?.value,
        officialUrl: card.querySelector('[name="officialUrl"]')?.value
      })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.message || "Não foi possível atualizar o pedido.");
    adminStatus.textContent = result.notification === "sent"
      ? "Pedido atualizado e e-mail enviado."
      : result.notification === "not_configured"
        ? "Pedido atualizado. Configura o envio de e-mail para avisar a pessoa."
        : result.notification === "failed"
          ? "Pedido atualizado, mas o e-mail não foi enviado."
          : "Pedido atualizado.";
    loadReports();
  } catch (error) {
    adminStatus.textContent = error.message || "Não foi possível atualizar o pedido.";
    buttons.forEach(item => { item.disabled = false; });
  }
});

document.querySelector("#refresh").addEventListener("click", loadActiveView);
document.querySelector("#logout").addEventListener("click", async () => {
  await fetch("/api/admin/logout", { method: "POST", credentials: "same-origin" }).catch(() => {});
  window.location.replace("/");
});
updateReviewControls();
loadActiveView();
