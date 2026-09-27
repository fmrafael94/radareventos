#!/usr/bin/env node

/*
 * Daily source watch for Desvio.
 * It is a lead queue only: it checks the known source pages and records which
 * sources need an editor to inspect. It never extracts/publishes an event.
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { createHash } from "node:crypto";

const root = path.resolve(import.meta.dirname, "..");
const source = await readFile(path.join(root, "sources.js"), "utf8");
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(source, sandbox, { timeout: 1_500 });
const groups = sandbox.window.SOURCE_GROUPS || [];
const allSources = groups.flatMap(group => group.sources.map(([name, focus, url]) => ({ group: group.title, name, focus, url })));
const requestedLimit = Number(process.argv.find(value => value.startsWith("--limit="))?.split("=")[1]);
const selected = requestedLimit ? allSources.slice(0, requestedLimit) : allSources;

const fingerprint = text => createHash("sha256")
  .update(text.replace(/\s+/g, " ").slice(0, 65_536))
  .digest("hex");

const responseFingerprint = response => fingerprint([
  response.url,
  response.status,
  response.headers.get("etag") || "",
  response.headers.get("last-modified") || "",
  response.headers.get("content-length") || ""
].join("|"));

async function check(sourceRecord) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    // This health-check only needs HTTP metadata. Reading whole pages with a
    // byte-range request caused an undici stream assertion on some origins in
    // GitHub-hosted runners. HEAD also avoids downloading third-party content
    // every day. A small GET fallback covers servers that do not implement it.
    let response = await fetch(sourceRecord.url, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
      headers: { "user-agent": "Desvio-Source-Watch/1.0 (+https://odesvio.pt)", accept: "text/html,application/xhtml+xml" }
    });
    if (response.status === 405 || response.status === 501) {
      response = await fetch(sourceRecord.url, {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
        headers: { "user-agent": "Desvio-Source-Watch/1.0 (+https://odesvio.pt)", accept: "text/html,application/xhtml+xml" }
      });
      // Do not parse a body here: this is a metadata check, and sources can
      // serve malformed/compressed bodies that should never crash the round.
      await response.body?.cancel().catch(() => {});
    }
    return {
      ...sourceRecord,
      status: response.status,
      ok: response.ok,
      finalUrl: response.url,
      fingerprint: response.ok ? responseFingerprint(response) : "",
      pageTitle: ""
    };
  } catch (error) {
    return { ...sourceRecord, status: null, ok: false, error: error.name === "AbortError" ? "timeout" : error.message };
  } finally {
    clearTimeout(timeout);
  }
}

const results = [];
let cursor = 0;
const worker = async () => {
  while (cursor < selected.length) {
    const record = selected[cursor++];
    results.push(await check(record));
    await new Promise(resolve => setTimeout(resolve, 700));
  }
};
await Promise.all(Array.from({ length: Math.min(4, selected.length) }, worker));
const reportDirectory = path.join(root, "reports");
await mkdir(reportDirectory, { recursive: true });
const reportPath = path.join(reportDirectory, "source-watch.json");
let previous = {};
try {
  const saved = JSON.parse(await readFile(reportPath, "utf8"));
  previous = Object.fromEntries((saved.results || []).map(item => [item.url, item]));
} catch { /* First run has no baseline. */ }
const enriched = results.map(result => {
  const earlier = previous[result.url];
  const changed = Boolean(result.ok && result.fingerprint && earlier?.fingerprint && earlier.fingerprint !== result.fingerprint);
  const blocked = [401, 403, 429].includes(result.status) || ["timeout", "fetch failed"].includes(result.error);
  const missing = [404, 410].includes(result.status);
  return { ...result, changed, blocked, missing };
});
const changed = enriched.filter(result => result.changed);
const missing = enriched.filter(result => result.missing);
const blocked = enriched.filter(result => result.blocked);
const report = {
  generatedAt: new Date().toISOString(),
  coverage: { checked: enriched.length, knownSources: allSources.length },
  summary: { healthy: enriched.filter(result => result.ok).length, changed: changed.length, missing: missing.length, blocked: blocked.length },
  results: enriched
};
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
const lines = [
  "# Desvio — ronda diária de fontes",
  "",
  `- Fontes verificadas: ${enriched.length} de ${allSources.length}`,
  `- Alterações reais a rever: ${changed.length}`,
  `- Páginas removidas: ${missing.length}`,
  `- Bloqueios técnicos sem alerta editorial: ${blocked.length}`,
  "",
  "> 403, 429, timeouts e bloqueios anti-bot ficam no relatório técnico, mas não são tratados como cancelamentos nem como falhas editoriais.",
  ""
];
const attention = [...changed, ...missing];
if (attention.length) {
  lines.push("## Fontes a rever editorialmente", "", "| Fonte | Área | Resultado | Link |", "| --- | --- | --- | --- |");
  for (const item of attention) lines.push(`| ${item.name} | ${item.focus} | ${item.changed ? "metadados alterados" : item.status || "removida"} | ${item.url} |`);
} else lines.push("Nenhuma fonte apresentou uma alteração editorial acionável.");
const output = lines.join("\n");
if (process.env.GITHUB_STEP_SUMMARY) await writeFile(process.env.GITHUB_STEP_SUMMARY, `${output}\n`, { flag: "a" });
console.log(output);
