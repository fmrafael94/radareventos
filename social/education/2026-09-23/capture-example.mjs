import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const here = path.dirname(new URL(import.meta.url).pathname);
const out = path.join(here, "screenshots");
fs.mkdirSync(out, { recursive:true });

const browser = await chromium.launch({
  headless:true,
  executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
const page = await browser.newPage({ viewport:{ width:1440, height:1100 }, deviceScaleFactor:2 });

await page.goto("https://odesvio.pt/evento/reign-fury-hardcore-fest-2026", { waitUntil:"networkidle" });
await page.locator(".event-page-shell.is-ready").waitFor({ state:"visible" });
await page.locator(".event-overview").screenshot({ path:path.join(out, "reign-overview.png") });
await page.locator(".event-poster-panel").screenshot({ path:path.join(out, "reign-poster.png") });
await page.locator(".event-information").screenshot({ path:path.join(out, "reign-information.png") });
await page.locator(".event-actions").screenshot({ path:path.join(out, "reign-actions.png") });
await page.locator(".share-panel").screenshot({ path:path.join(out, "reign-share.png") });
await page.locator("footer").screenshot({ path:path.join(out, "reign-footer.png") });
await page.locator('footer a[href*="corrigir"]').screenshot({ path:path.join(out, "reign-correct.png") });

await page.goto("https://odesvio.pt/", { waitUntil:"domcontentloaded" });
await page.locator(".submit-link").waitFor({ state:"visible" });
await page.locator("#hero-feature").waitFor({ state:"visible" });
await page.locator(".site-header").screenshot({ path:path.join(out, "homepage-header.png") });
await page.locator(".submit-link").screenshot({ path:path.join(out, "homepage-submit.png") });
await page.locator("#hero-feature").screenshot({ path:path.join(out, "homepage-reign-feature.png") });

await browser.close();
console.log(`Captured real O Desvio UI examples in ${out}`);
