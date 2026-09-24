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
    return entry.isFile() && entry.name.endsWith("caption.txt") ? [full] : [];
  });
}

const files = captions(socialRoot).sort();
const rows = files.flatMap(file => fs.readFileSync(file, "utf8").split(/\r?\n/).flatMap((line, index) => {
  if (!eventLine.test(line)) return [];
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
const report = {
  generatedAt: new Date().toISOString(),
  captions: files.length,
  eventLines: rows.length,
  linesWithoutAnyHandle: missing.length,
  linesMissingKnownHandles: missingKnown.length,
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
  missing: report.missing,
  missingKnown: report.missingKnown,
}, null, 2));

if (missing.length || missingKnown.length) process.exitCode = 1;
