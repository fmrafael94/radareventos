#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const socialRoot = path.join(root, "social");

function files(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? files(full) : [full];
  });
}

function pngSize(file) {
  const header = fs.readFileSync(file).subarray(0, 24);
  if (header.length < 24 || header.toString("ascii", 1, 4) !== "PNG") return null;
  return { width: header.readUInt32BE(16), height: header.readUInt32BE(20) };
}

const candidates = files(socialRoot).filter(file => {
  if (path.extname(file).toLowerCase() !== ".png") return false;
  const relative = path.relative(socialRoot, file);
  if (relative.includes(`${path.sep}mascots${path.sep}`) || relative.includes(`${path.sep}screenshots${path.sep}`)) return false;
  if (/contact-sheet|covers/i.test(path.basename(file))) return false;
  return relative.includes(`${path.sep}stories${path.sep}`) || /^odesvio-/i.test(path.basename(file));
});

const rows = candidates.map(file => {
  const relative = path.relative(root, file);
  const size = pngSize(file);
  const story = relative.includes(`${path.sep}stories${path.sep}`);
  const expected = story ? { width: 1080, height: 1920 } : { width: 1080, height: 1350 };
  return { file: relative, ...size, expected, valid: Boolean(size && size.width === expected.width && size.height === expected.height) };
});
const invalid = rows.filter(row => !row.valid);
const report = { generatedAt: new Date().toISOString(), checked: rows.length, invalid: invalid.length, rows, failures: invalid };

fs.mkdirSync(path.join(root, "reports"), { recursive: true });
fs.writeFileSync(path.join(root, "reports", "social-asset-audit.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ checked: report.checked, invalid: report.invalid, failures: invalid }, null, 2));
if (invalid.length) process.exitCode = 1;
