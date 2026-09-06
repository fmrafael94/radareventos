const reports = document.querySelector("#reports");
const adminStatus = document.querySelector("#admin-status");
const viewFilters = document.querySelector("#review-views");
const communityFilters = document.querySelector("#status-filters");
const automationFilters = document.querySelector("#automation-status-filters");
const filterContext = document.querySelector("#filter-context");
const automationBulkActions = document.querySelector("#automation-bulk-actions");
const bulkResolve = document.querySelector("#bulk-resolve");
const bulkApply = document.querySelector("#bulk-apply");
const communityBulkActions = document.querySelector("#community-bulk-actions");
const bulkPublishReady = document.querySelector("#bulk-publish-ready");
let activeView = "community";
let activeCommunityStatus = "new";
let activeAutomationStatus = "new";

const escapeHtml = value => String(value || "").replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
const dateTime = value => value ? new Intl.DateTimeFormat("pt-PT", { dateStyle: "medium", timeStyle: "short" }).format(new Date(`${value.replace(" ", "T")}Z`)) : "—";
const displayUrl = value => value ? `<a href="${escapeHtml(value)}" target="_blank" rel="noopener">Abrir fonte ↗</a>` : "<span>Sem link enviado</span>";
const requireCurrentSession = response => {
  if (response.status !== 401) return response;
  window.location.replace("/painel");
  throw new Error("A sessão terminou. A voltar ao início de sessão…");
};

const checklistMarkup = publication => {
  const entries = Array.isArray(publication?.items) ? publication.items : [];
  const duplicate = Array.isArray(publication?.duplicate) && publication.duplicate.length;
  return `<section class="publication-checklist" data-publication-checklist data-known-duplicate="${duplicate ? "true" : "false"}" aria-label="Checklist de publicação"><p>Checklist de publicação</p><ul>${entries.map(item => `<li class="${item.present ? "present" : "missing"}" data-check="${escapeHtml(item.id)}"><span aria-hidden="true">${item.present ? "✓" : "–"}</span>${escapeHtml(item.label)}<b>${item.present ? "Existe" : "Em falta"}</b></li>`).join("")}</ul>${duplicate ? `<small class="duplicate-warning">Possível duplicado: ${escapeHtml(publication.duplicate[0].title)}. Confirma antes de publicar.</small>` : `<small>Duplicados são verificados novamente antes de publicar.</small>`}</section>`;
};

function syncPublicationChecklist(card) {
  const checklist = card.querySelector("[data-publication-checklist]");
  if (!checklist) return true;
  const required = {
    title: card.querySelector('[name="eventName"]')?.value.trim(),
    date: card.querySelector('[name="eventDate"]')?.value.trim(),
    city: card.querySelector('[name="city"]')?.value.trim(),
    venue: card.querySelector('[name="venue"]')?.value.trim(),
    poster: card.querySelector('[name="posterUrl"]')?.value.trim(),
    ticketing: card.querySelector('[name="tickets"]')?.value.trim(),
    source: card.querySelector('[name="officialUrl"]')?.value.trim()
  };
  let complete = !Object.values(required).some(value => !value);
  Object.entries(required).forEach(([key, value]) => {
    const row = checklist.querySelector(`[data-check="${key}"]`);
    if (!row) return;
    row.classList.toggle("present", Boolean(value));
    row.classList.toggle("missing", !value);
    row.querySelector("span").textContent = value ? "✓" : "–";
    row.querySelector("b").textContent = value ? "Existe" : "Em falta";
  });
  if (checklist.dataset.knownDuplicate === "true") complete = false;
  const publish = card.querySelector('[data-next-status="published"]');
  if (publish) {
    publish.disabled = !complete;
    publish.title = complete ? "" : "Completa todos os pontos obrigatórios antes de publicar.";
  }
  return complete;
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
  const review = item.review_data || {};
  const values = (key, fallback = "") => escapeHtml(review[key] || fallback);
  const checklist = item.kind === "suggestion" && !promoterPage ? checklistMarkup(item.publication) : "";
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
    ${item.kind === "suggestion" && !promoterPage ? `${checklist}<fieldset class="event-review-fields"><legend>Dados para publicação</legend><label><span>Título</span><input name="eventName" maxlength="180" value="${values("eventName", item.event_name || "")}" /></label><label><span>Data</span><input name="eventDate" type="date" value="${values("eventDate", item.event_date || "")}" /></label><label><span>Último dia (se aplicável)</span><input name="eventEndDate" type="date" value="${values("eventEndDate")}" /></label><label><span>Cidade / concelho</span><input name="city" maxlength="100" value="${values("city", item.city || "")}" /></label><label><span>Local</span><input name="venue" maxlength="180" placeholder="Sala, recinto ou morada" value="${values("venue")}" /></label><label><span>Bilheteira / entrada</span><input name="tickets" maxlength="220" placeholder="Ex.: Entrada livre · 15 € · Bilheteira por confirmar" value="${values("tickets")}" /></label><label><span>Link de bilheteira (se existir)</span><input name="ticketUrl" type="url" maxlength="1000" placeholder="https://" value="${values("ticketUrl")}" /></label><label><span>Link direto do cartaz</span><input name="posterUrl" type="url" maxlength="1000" placeholder="https://" value="${values("posterUrl", item.poster_url || "")}" /></label><label class="official-source"><span>Página oficial direta</span><input name="officialUrl" type="url" maxlength="1000" placeholder="https://" value="${values("officialUrl", item.official_url || "")}" /></label></fieldset>` : ""}
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
  const snapshot = item.event_snapshot ? `<p class="automation-event-context">Evento na agenda: <b>${escapeHtml(item.event_snapshot.title)}</b> · ${escapeHtml(item.event_snapshot.date)} · ${escapeHtml(item.event_snapshot.venue || item.event_snapshot.city || "local a confirmar")}</p>` : "";
  const checklist = item.publication ? checklistMarkup(item.publication) : "";
  return `<article class="report automation-report" data-id="${escapeHtml(item.id)}">
    <div class="report-meta"><span class="kind">${isLink ? "Link para confirmar" : "Fonte a explorar"}</span><time>Visto: ${dateTime(item.last_seen_at)}</time></div>
    <div class="report-heading"><div><h2>${escapeHtml(item.title)}</h2><p>${escapeHtml(item.detail || "Requer confirmação manual.")}</p></div></div>
    <dl><div><dt>${isLink ? "Página ou bilheteira" : "Fonte"}</dt><dd><a href="${escapeHtml(item.url)}" target="_blank" rel="noopener">Abrir e confirmar ↗</a></dd></div><div><dt>Sinal</dt><dd>${result || "Sem resultado"}</dd></div></dl>
    ${snapshot}${checklist}<p class="automation-note">Este sinal foi criado por uma ronda automática. A checklist mostra o estado atual do evento; confirma a página diretamente antes de alterar a agenda.</p>
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
    requireCurrentSession(response);
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.message || "Não foi possível carregar os pedidos.");
    if (!Array.isArray(result.items)) {
      throw new Error("A área de revisão ainda está a ser configurada. Até ligares o domínio próprio e o acesso privado, revê os pedidos pela base de dados D1.");
    }
    reports.innerHTML = result.items.length ? result.items.map(reportCard).join("") : document.querySelector("#empty-state").innerHTML;
    reports.querySelectorAll(".report").forEach(syncPublicationChecklist);
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
    requireCurrentSession(response);
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.message || "Não foi possível carregar a revisão automática.");
    if (!Array.isArray(result.items)) throw new Error("A revisão automática ainda não está configurada.");
    reports.innerHTML = result.items.length ? result.items.map(automationCard).join("") : "<p class=\"empty-state\">Não há sinais neste estado.</p>";
    const count = result.items.length;
    const statusLabel = activeAutomationStatus === "resolved"
      ? count === 1 ? "aceite" : "aceites"
      : activeAutomationStatus === "ignored"
        ? count === 1 ? "ignorado" : "ignorados"
        : "para rever";
    adminStatus.textContent = count ? `${count} sinal${count === 1 ? "" : "s"} ${statusLabel}.` : "";
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
  const acceptedAutomation = activeAutomationStatus === "resolved";
  automationBulkActions.hidden = !automated || !["new", "reviewing", "resolved"].includes(activeAutomationStatus);
  bulkResolve.hidden = acceptedAutomation;
  bulkApply.textContent = acceptedAutomation ? "Aplicar todos os aceites à agenda" : "Aceitar e aplicar confirmados";
  communityBulkActions.hidden = automated || !["new", "reviewing"].includes(activeCommunityStatus);
  filterContext.textContent = automated
    ? "Resultados das rondas — confirma sempre na fonte oficial"
    : "Pedidos enviados por utilizadores";
}

communityFilters.addEventListener("click", event => {
  const button = event.target.closest("[data-status]");
  if (!button) return;
  activeCommunityStatus = button.dataset.status;
  communityFilters.querySelectorAll("button").forEach(item => item.setAttribute("aria-pressed", String(item === button)));
  updateReviewControls();
  loadReports();
});

automationFilters.addEventListener("click", event => {
  const button = event.target.closest("[data-status]");
  if (!button) return;
  activeAutomationStatus = button.dataset.status;
  automationFilters.querySelectorAll("button").forEach(item => item.setAttribute("aria-pressed", String(item === button)));
  updateReviewControls();
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
    if (["resolved", "ignored"].includes(automationButton.dataset.automationStatus) && !window.confirm("Confirmar esta decisão?")) return;
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
      requireCurrentSession(response);
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
  if (["published", "rejected", "closed"].includes(button.dataset.nextStatus) && !window.confirm("Confirmar esta decisão?")) return;
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
    requireCurrentSession(response);
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

reports.addEventListener("input", event => {
  if (event.target.closest(".event-review-fields")) syncPublicationChecklist(event.target.closest(".report"));
});

document.querySelector("#refresh").addEventListener("click", loadActiveView);
async function bulkReview(action) {
  const applying = action === "apply-confirmed";
  const confirmation = applying
    ? "Aplicar todas as ligações já confirmadas à agenda? Só entram as que têm URL confirmado guardado; as restantes mantêm-se na fila."
    : "Marcar todos os sinais visíveis como revistos? Isto não altera a agenda.";
  if (!window.confirm(confirmation)) return;
  [bulkResolve, bulkApply].forEach(button => { button.disabled = true; });
  adminStatus.textContent = "A atualizar a ronda…";
  try {
    const response = await fetch("/api/admin/automation-reviews/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ action, status: activeAutomationStatus })
    });
    requireCurrentSession(response);
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.message || "Não foi possível atualizar a ronda.");
    const appliedLabel = result.applied === 1 ? "ligação aplicada" : "ligações aplicadas";
    const resolvedLabel = result.resolved === 1 ? "sinal marcado como revisto" : "sinais marcados como revistos";
    adminStatus.textContent = applying
      ? `${result.applied || 0} ${appliedLabel}${result.skipped ? ` · ${result.skipped} mantida${result.skipped === 1 ? "" : "s"} para revisão` : ""}.`
      : `${result.resolved || 0} ${resolvedLabel}.`;
    loadAutomationReviews();
  } catch (error) {
    adminStatus.textContent = error.message || "Não foi possível atualizar a ronda.";
  } finally {
    [bulkResolve, bulkApply].forEach(button => { button.disabled = false; });
  }
}
bulkResolve.addEventListener("click", () => bulkReview("resolve"));
bulkApply.addEventListener("click", () => bulkReview("apply-confirmed"));
async function publishReadyCommunity() {
  if (!window.confirm("Publicar todos os eventos prontos? Só entram os que têm todos os pontos do checklist guardados e não duplicam a agenda. Os restantes ficam para revisão.")) return;
  bulkPublishReady.disabled = true;
  adminStatus.textContent = "A validar e publicar os eventos prontos…";
  try {
    const response = await fetch("/api/admin/feedback/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ action: "publish-ready", status: activeCommunityStatus })
    });
    requireCurrentSession(response);
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.message || "Não foi possível publicar os eventos.");
    adminStatus.textContent = `${result.published || 0} publicado${result.published === 1 ? "" : "s"} · ${result.incomplete || 0} incompleto${result.incomplete === 1 ? "" : "s"} · ${result.duplicates || 0} duplicado${result.duplicates === 1 ? "" : "s"} mantido${(result.incomplete || result.duplicates) === 1 ? "" : "s"} para revisão.`;
    loadReports();
  } catch (error) {
    adminStatus.textContent = error.message || "Não foi possível publicar os eventos.";
  } finally {
    bulkPublishReady.disabled = false;
  }
}
bulkPublishReady.addEventListener("click", publishReadyCommunity);
document.querySelector("#logout").addEventListener("click", async () => {
  await fetch("/api/admin/logout", { method: "POST", credentials: "same-origin" }).catch(() => {});
  window.location.replace("/painel");
});
updateReviewControls();
loadActiveView();
