import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const sharp = require("sharp");
const here = path.dirname(new URL(import.meta.url).pathname);

const palette = {
  ink: "#182226",
  cream: "#f7f5f0",
  gold: "#b7a45a",
  coral: "#e35e44",
  soft: "#cbd0cd",
};

const styles = `<style>
  .display { font-family: Arial, Helvetica, sans-serif; font-weight: 800; letter-spacing: -5px; }
  .body { font-family: Arial, Helvetica, sans-serif; font-weight: 600; }
  .mono { font-family: Menlo, Monaco, monospace; font-weight: 700; letter-spacing: 2.5px; }
</style>`;

const proposals = [
  {
    slug: "2026-09-25_27",
    range: "25 A 27 SETEMBRO",
    line1: "O fim de semana",
    line2: "já se ouve.",
    note: "Cinco motivos para sair de casa.",
    mascot: "microfone.png",
    bg: palette.ink,
    fg: palette.cream,
    accent: palette.gold,
    noteColor: palette.soft,
    imageX: 365,
    imageY: 570,
    imageW: 700,
    rotate: -4,
    titleY: 380,
  },
  {
    slug: "2026-10-02_04",
    range: "2 A 4 OUTUBRO",
    line1: "Três dias.",
    line2: "Muitas escolhas.",
    note: "Escolhe o teu próximo desvio.",
    mascot: "bilhete.png",
    bg: palette.cream,
    fg: palette.ink,
    accent: palette.coral,
    noteColor: "#536064",
    imageX: 425,
    imageY: 570,
    imageW: 650,
    rotate: -3,
    titleY: 365,
  },
  {
    slug: "2026-10-09_11",
    range: "9 A 11 OUTUBRO",
    line1: "Este fim de semana",
    line2: "pede palco.",
    note: "Do Porto a Lisboa, há música a acontecer.",
    mascot: "cassete.png",
    bg: palette.gold,
    fg: palette.ink,
    accent: palette.coral,
    noteColor: "#334044",
    imageX: 420,
    imageY: 570,
    imageW: 660,
    rotate: -8,
    titleY: 355,
  },
];

function logo(fg, accent) {
  return `<g transform="translate(76 70)">
    <circle cx="27" cy="27" r="26" fill="none" stroke="${accent}" stroke-width="4"/>
    <circle cx="27" cy="27" r="15" fill="none" stroke="${accent}" stroke-width="4"/>
    <circle cx="27" cy="27" r="4" fill="${palette.coral}"/>
    <path d="M27 27 L50 9" fill="none" stroke="${accent}" stroke-width="5" stroke-linecap="round"/>
    <text x="72" y="38" fill="${fg}" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="800" letter-spacing="-1.5">O DESVIO</text>
  </g>`;
}

for (const proposal of proposals) {
  const image = fs.readFileSync(path.join(here, "mascots", proposal.mascot)).toString("base64");
  const cx = proposal.imageX + proposal.imageW / 2;
  const cy = proposal.imageY + proposal.imageW / 2;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350">
    ${styles}
    <rect width="1080" height="1350" fill="${proposal.bg}"/>
    ${logo(proposal.fg, proposal.bg === palette.gold ? palette.ink : palette.gold)}
    <text class="mono" x="76" y="225" fill="${proposal.accent}" font-size="22">DESTAQUES DO FIM DE SEMANA</text>
    <text class="display" x="76" y="${proposal.titleY}" fill="${proposal.fg}" font-size="92">
      <tspan x="76">${proposal.line1}</tspan>
      <tspan x="76" dy="92">${proposal.line2}</tspan>
    </text>
    <path d="M76 545 C230 520 340 540 440 510" fill="none" stroke="${proposal.accent}" stroke-width="8" stroke-linecap="round"/>
    <text class="body" x="78" y="610" fill="${proposal.noteColor}" font-size="29">${proposal.note}</text>
    <image href="data:image/png;base64,${image}" x="${proposal.imageX}" y="${proposal.imageY}" width="${proposal.imageW}" height="${proposal.imageW}" preserveAspectRatio="xMidYMid meet" transform="rotate(${proposal.rotate} ${cx} ${cy})"/>
    <rect x="76" y="1192" width="928" height="2" fill="${proposal.fg}" opacity=".2"/>
    <text class="mono" x="76" y="1266" fill="${proposal.fg}" font-size="24">${proposal.range}</text>
    <text class="mono" x="870" y="1266" fill="${proposal.fg}" font-size="20">01 / 07</text>
  </svg>`;
  const svgPath = path.join(here, `${proposal.slug}.svg`);
  const pngPath = path.join(here, `${proposal.slug}.png`);
  fs.writeFileSync(svgPath, svg);
  await sharp(Buffer.from(svg)).png().toFile(pngPath);
}

const contactSheet = await Promise.all(proposals.map(async (proposal, index) => ({
  input: await sharp(path.join(here, `${proposal.slug}.png`)).resize(360, 450, { fit: "fill" }).png().toBuffer(),
  left: index * 360,
  top: 0,
})));

await sharp({ create: { width: 1080, height: 450, channels: 4, background: palette.ink } })
  .composite(contactSheet)
  .png()
  .toFile(path.join(here, "weekend-proposals-contact-sheet.png"));

console.log("Rendered three weekend cover proposals.");
