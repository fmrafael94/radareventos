const form = document.querySelector("#login-form");
const password = document.querySelector("#password");
const message = document.querySelector("#message");

form.addEventListener("submit", async event => {
  event.preventDefault();
  const button = form.querySelector("button");
  button.disabled = true;
  message.textContent = "";
  try {
    const response = await fetch("/api/admin/login", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ password: password.value })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.message || "Não foi possível iniciar sessão.");
    window.location.replace("/painel");
  } catch (error) {
    message.textContent = error.message || "Não foi possível iniciar sessão.";
    password.select();
  } finally {
    button.disabled = false;
  }
});
