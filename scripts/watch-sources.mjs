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
  .update(text.replace(/\s+/g, " ").replace(/https?:\/\/[^\s"']+/g, "URL").slice(0, 65536))
  .digest("hex");

async function check(sourceRecord) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(sourceRecord.url, {
      redirect: "follow",
      signal: controller.signal,
      headers: { "user-agent": "Desvio-Source-Watch/1.0 (+https://odesvio.pt)", range: "bytes=0-4096" }
    });
    const body = response.ok ? await response.text() : "";
    const title = body.match(/<title[^>]*>([\s\S]{0,240}?)<\/title>/i)?.[1]?.replace(/\s+/g, " ").trim() || "";
    return { ...sourceRecord, status: response.status, ok: response.ok, finalUrl: response.url, fingerprint: response.ok ? fingerprint(body) : "", pageTitle: title };
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
await writeFile(path.join(reportDirectory, "source-watch.json"), `${JSON.stringify({ generatedAt: new Date().toISOString(), coverage: { checked: results.length, knownSources: allSources.length }, results }, null, 2)}\n`);
const attention = results.filter(result => !result.ok);
const lines = [
  "# Desvio — ronda diária de fontes",
  "",
  `- Fontes verificadas: ${results.length} de ${allSources.length}`,
  `- Fontes que precisam de atenção: ${attention.length}`,
  "",
  "> Esta ronda assinala fontes cuja página mudou desde a última verificação. Não cria nem publica eventos automaticamente.",
  ""
];
if (attention.length) {
  lines.push("## Fontes a rever", "", "| Fonte | Área | Resultado | Link |", "| --- | --- | --- | --- |");
  for (const item of attention) lines.push(`| ${item.name} | ${item.focus} | ${item.status || item.error || "sem resposta"} | ${item.url} |`);
} else lines.push("Todas as fontes deste lote responderam.");
const output = lines.join("\n");
if (process.env.GITHUB_STEP_SUMMARY) await writeFile(process.env.GITHUB_STEP_SUMMARY, `${output}\n`, { flag: "a" });
console.log(output);
