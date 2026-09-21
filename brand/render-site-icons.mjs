import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const sharp = require("sharp");

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "..");
const source = path.join(here, "logo-icon.png");

for (const [size, file] of [
  [32, "favicon-32.png"],
  [180, "apple-touch-icon-180.png"],
  [192, "icon-192.png"],
]) {
  await sharp(source).resize(size, size).png().toFile(path.join(repo, "icons", file));
}

console.log("Rendered site icons from brand/logo-icon.png");
