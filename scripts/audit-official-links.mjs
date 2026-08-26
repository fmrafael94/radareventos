#!/usr/bin/env node

/*
 * GitHub Actions link audit for Desvio.
 *
 * This intentionally does not change events.js, availability or poster data.
 * A page being reachable is not proof that tickets are available. Any result
 * needs an editor's review against the official page before it is published.
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";

const root = path.resolve(import.meta.dirname, "..");
const argument = name => process.argv.find(value => value.startsWith(`--${name}=`))?.split("=")[1];
const mode = argument("mode") || "two-hour";
const requestedLimit = Number(argument("limit"));
const now = new Date();

function readBrowserData(source, variable) {
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { timeout: 1_500 });
  return sandbox.window[variable];
}

function usableUrl(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

async function probe(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    let response = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
      headers: { "user-agent": "Desvio-Link-Audit/1.0 (+https://odesvio.pt)" }
    });
    // Some official sites reject HEAD but accept an ordinary page request.
    if ([403, 405, 429].includes(response.status)) {
      response = await fetch(url, {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
        headers: {
          "user-agent": "Desvio-Link-Audit/1.0 (+https://odesvio.pt)",
          range: "bytes=0-1024"
        }
      });
    }
    return { status: response.status, finalUrl: response.url, ok: response.ok };
  } catch (error) {
    return { status: null, finalUrl: null, ok: false, error: error.name === "AbortError" ? "timeout" : error.message };
  } finally {
    clearTimeout(timeout);
  }
}

const eventsSource = await readFile(path.join(root, "events.js"), "utf8");
const events = readBrowserData(eventsSource, "EVENTS") || [];
const targets = [];
for (const event of events) {
  for (const [kind, value] of [["Página oficial", event.sourceUrl], ["Bilheteira", event.ticketUrl]]) {
    const url = usableUrl(value);
    if (url) targets.push({ id: event.id, title: event.title, kind, url });
  }
}

// Every two-hour run checks every known direct event page and ticket page.
// A small concurrency cap avoids hammering any one site while keeping the
// complete audit practical on GitHub Actions.
const unique = [...new Map(targets.map(target => [`${target.kind}:${target.url}`, target])).values()]
  .sort((a, b) => a.url.localeCompare(b.url));
const selected = requestedLimit ? unique.slice(0, requestedLimit) : unique;

const results = [];
let cursor = 0;
const worker = async () => {
  while (cursor < selected.length) {
    const target = selected[cursor++];
    results.push({ ...target, ...(await probe(target.url)) });
    await new Promise(resolve => setTimeout(resolve, 350));
  }
};
await Promise.all(Array.from({ length: Math.min(5, selected.length) }, worker));

const failures = results.filter(result => !result.ok);
const report = {
  generatedAt: now.toISOString(),
  mode,
  coverage: { checked: results.length, knownTargets: unique.length },
  results
};
const reportDirectory = path.join(root, "reports");
await mkdir(reportDirectory, { recursive: true });
await writeFile(path.join(reportDirectory, "official-link-audit.json"), `${JSON.stringify(report, null, 2)}\n`);

const summary = [
  "# Desvio — verificação de links oficiais",
  "",
  `- Execução: ${report.generatedAt}`,
  `- Links diretos verificados: ${report.coverage.checked} de ${report.coverage.knownTargets}`,
  `- Com atenção necessária: ${failures.length}`,
  "",
  "> Esta verificação só confirma se uma página responde. Não altera eventos, preços, cartazes ou disponibilidade; todas essas decisões continuam a exigir revisão humana e uma fonte oficial.",
  ""
];
if (failures.length) {
  summary.push("## Links a rever", "", "| Evento | Tipo | Resultado | Link |", "| --- | --- | --- | --- |");
  for (const result of failures) summary.push(`| ${result.title} | ${result.kind} | ${result.status || result.error || "sem resposta"} | ${result.url} |`);
} else {
  summary.push("Nenhum link deste lote ficou inacessível.");
}
const text = summary.join("\n");
if (process.env.GITHUB_STEP_SUMMARY) await writeFile(process.env.GITHUB_STEP_SUMMARY, `${text}\n`, { flag: "a" });
console.log(text);
