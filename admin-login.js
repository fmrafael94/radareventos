const codeForm = document.querySelector("#code-form");
const passwordForm = document.querySelector("#password-form");
const requestCode = document.querySelector("#request-code");
const verifyCode = document.querySelector("#verify-code");
const codeField = document.querySelector("#code-field");
const code = document.querySelector("#code");
const email = document.querySelector("#email");
const password = document.querySelector("#password");
const message = document.querySelector("#message");

const responseJson = async response => response.json().catch(() => ({}));
const setMessage = value => { message.textContent = value; };
const login = () => window.location.replace("/painel");

requestCode.addEventListener("click", async () => {
  requestCode.disabled = true;
  setMessage("");
  try {
    if (!email.reportValidity()) return;
    const response = await fetch("/api/admin/request-code", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ email: email.value }) });
    const result = await responseJson(response);
    if (!response.ok) throw new Error(result.message || "Não foi possível enviar o código.");
    codeField.hidden = false;
    verifyCode.hidden = false;
    code.required = true;
    code.focus();
    setMessage("Código enviado. Confirma o email e o spam.");
  } catch (error) {
    setMessage(error.message || "Não foi possível enviar o código.");
  } finally {
    requestCode.disabled = false;
  }
});

codeForm.addEventListener("submit", async event => {
  event.preventDefault();
  verifyCode.disabled = true;
  setMessage("");
  try {
    const response = await fetch("/api/admin/verify-code", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ email: email.value, code: code.value }) });
    const result = await responseJson(response);
    if (!response.ok) throw new Error(result.message || "Não foi possível entrar.");
    login();
  } catch (error) {
    setMessage(error.message || "Não foi possível entrar.");
    code.select();
  } finally {
    verifyCode.disabled = false;
  }
});

passwordForm.addEventListener("submit", async event => {
  event.preventDefault();
  const button = passwordForm.querySelector("button");
  button.disabled = true;
  setMessage("");
  try {
    const response = await fetch("/api/admin/login", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ password: password.value }) });
    const result = await responseJson(response);
    if (!response.ok) throw new Error(result.message || "Não foi possível iniciar sessão.");
    login();
  } catch (error) {
    setMessage(error.message || "Não foi possível iniciar sessão.");
    password.select();
  } finally {
    button.disabled = false;
  }
});
