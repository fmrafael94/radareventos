import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const here = path.dirname(new URL(import.meta.url).pathname);

const browser = await chromium.launch({
  headless: true,
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
await page.goto("https://festivalsemibreve.com/en/homepage/", { waitUntil: "networkidle" });
await page.evaluate(() => document.querySelector("#cmplz-cookiebanner-container")?.remove());
await page.addStyleTag({ content: "::-webkit-scrollbar{display:none!important} body{overflow:hidden!important}" });
await page.screenshot({ path: path.join(here, "posters/semibreve-official-site.png") });
await browser.close();
