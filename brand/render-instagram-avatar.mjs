import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const sharp = require("sharp");

const here = path.dirname(fileURLToPath(import.meta.url));

await sharp(path.join(here, "desvio-instagram-avatar.svg"))
  .png()
  .toFile(path.join(here, "desvio-instagram-avatar.png"));

console.log("Rendered desvio-instagram-avatar.png");
