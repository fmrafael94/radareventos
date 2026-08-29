const form = document.querySelector("#submission-tracker");
const result = document.querySelector("#tracking-result");
const escapeHtml = value => String(value || "").replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);

form.addEventListener("submit", async event => {
  event.preventDefault();
  const values = new FormData(form);
  const params = new URLSearchParams({ reference: values.get("reference"), email: values.get("email") });
  result.hidden = false;
  result.textContent = "A procurar o pedido…";
  try {
    const response = await fetch(`/api/submission-status?${params}`);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.message || "Não foi possível consultar o pedido.");
    result.innerHTML = `<p class="kicker">Estado</p><h2>${escapeHtml(payload.item.status)}</h2><p>${escapeHtml(payload.item.title)}. Recebido em ${escapeHtml(new Intl.DateTimeFormat("pt-PT", { dateStyle: "medium" }).format(new Date(`${payload.item.submittedAt.replace(" ", "T")}Z`)))}.</p>`;
  } catch (error) {
    result.textContent = error.message || "Não foi possível consultar o pedido.";
  }
});
