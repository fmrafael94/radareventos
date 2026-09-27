#!/usr/bin/env node

/*
 * Finds event lines in Instagram captions that do not contain any verified
 * account mention. This is a safety net, not a substitute for the editorial
 * check: every artist, promoter/organiser and venue still has to be searched
 * individually and omitted when no official account can be confirmed.
 */
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const socialRoot = path.join(root, "social");
const registryPath = path.join(socialRoot, "instagram-handles.json");
const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
const monthPattern = "JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ";
const eventLine = new RegExp(`^\\s*\\d{1,2}(?:[–-]\\d{1,2})?\\s+(?:${monthPattern})\\b`, "i");
const handlePattern = /@[a-z0-9._]+/gi;

function captions(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return captions(full);
    return entry.isFile() && /^caption(?:-[a-z0-9-]+)?\.txt$/i.test(entry.name) ? [full] : [];
  });
}

const files = captions(socialRoot).sort();
const rows = files.flatMap(file => fs.readFileSync(file, "utf8").split(/\r?\n/).flatMap((line, index) => {
  // A date-only line in a giveaway (for example "17 OUT · 20:00") is not an
  // event listing. Require at least date, act/title and venue/source columns.
  if (!eventLine.test(line) || (line.match(/·/g) || []).length < 2) return [];
  const handles = [...new Set(line.match(handlePattern) || [])];
  const lower = line.toLocaleLowerCase("pt-PT");
  const expected = registry.filter(entry =>
    entry.aliases.some(alias => lower.includes(alias.toLocaleLowerCase("pt-PT")))
  );
  const missingExpected = expected.filter(entry =>
    !handles.some(handle => handle.toLocaleLowerCase("pt-PT") === entry.handle.toLocaleLowerCase("pt-PT"))
  );
  return [{
    file: path.relative(root, file),
    line: index + 1,
    text: line.trim(),
    handles,
    hasHandle: handles.length > 0,
    expectedHandles: expected.map(entry => entry.handle),
    missingExpectedHandles: missingExpected.map(entry => entry.handle),
  }];
}));

const missing = rows.filter(row => !row.hasHandle);
const missingKnown = rows.filter(row => row.missingExpectedHandles.length > 0);
const knownHandles = new Set(registry.map(entry => String(entry.handle || "").toLocaleLowerCase("pt-PT")));
const unknownHandles = [...new Set(rows.flatMap(row => row.handles)
  .filter(handle => !knownHandles.has(handle.toLocaleLowerCase("pt-PT"))))].sort();
const invalidRegistry = registry.filter(entry =>
  !entry.entity || !Array.isArray(entry.aliases) || !entry.aliases.length ||
  !/^@[a-z0-9._]+$/i.test(entry.handle || "") ||
  !/^https:\/\/www\.instagram\.com\/[a-z0-9._]+\/$/i.test(entry.profile || "") ||
  !Array.isArray(entry.roles) || !entry.roles.length ||
  !/^\d{4}-\d{2}-\d{2}$/.test(entry.verifiedAt || "")
);
const report = {
  generatedAt: new Date().toISOString(),
  captions: files.length,
  eventLines: rows.length,
  linesWithoutAnyHandle: missing.length,
  linesMissingKnownHandles: missingKnown.length,
  unknownHandles,
  invalidRegistry,
  missing,
  missingKnown,
  rows,
};

fs.mkdirSync(path.join(root, "reports"), { recursive: true });
fs.writeFileSync(path.join(root, "reports", "social-handle-audit.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
  captions: report.captions,
  eventLines: report.eventLines,
  linesWithoutAnyHandle: report.linesWithoutAnyHandle,
  linesMissingKnownHandles: report.linesMissingKnownHandles,
  unknownHandles: report.unknownHandles,
  invalidRegistry: report.invalidRegistry,
  missing: report.missing,
  missingKnown: report.missingKnown,
}, null, 2));

if (missing.length || missingKnown.length || invalidRegistry.length) process.exitCode = 1;
