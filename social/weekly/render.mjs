import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const sharp = require("sharp");
const here = path.dirname(new URL(import.meta.url).pathname);
const socialRoot = path.resolve(here, "..");
const mascotRoot = path.join(socialRoot, "weekly-mascots");

const c = {
  ink: "#182226",
  cream: "#f7f5f0",
  gold: "#b7a45a",
  goldDark: "#8a7734",
  coral: "#e35e44",
  mutedDark: "#cbd0cd",
  mutedLight: "#536064",
};

const styles = `<style>
  .display { font-family: Arial, Helvetica, sans-serif; font-weight: 800; letter-spacing: -5px; }
  .body { font-family: Arial, Helvetica, sans-serif; font-weight: 500; }
  .mono { font-family: Menlo, Monaco, monospace; font-weight: 700; letter-spacing: 2.5px; }
</style>`;

const logo = (dark = true, mark = c.gold) => `
  <g transform="translate(76 72)">
    <g transform="scale(.48)" fill="none" stroke="${mark}" stroke-linecap="round">
      <path d="M93 31a45 45 0 1 0 13 31" stroke-width="7"/>
      <path d="M87 42a33 33 0 1 0 9 23" stroke-width="6"/>
      <path d="M81 52a21 21 0 1 0 6 15" stroke-width="5"/>
      <path d="M94 20v25c0 10-6 15-15 19" stroke-width="10"/>
    </g>
    <circle cx="30.7" cy="32.6" r="6.2" fill="${mark}"/>
    <circle cx="30.7" cy="32.6" r="2.2" fill="${c.coral}"/>
    <text x="72" y="42" fill="${dark ? c.cream : c.ink}" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="800" letter-spacing="-1.4">O DESVIO</text>
  </g>`;

const imageData = new Map();
function mascot(kind, pose, x, y, width, rotate = 0, flip = false) {
  const key = `${kind}/${String(pose).padStart(2, "0")}`;
  if (!imageData.has(key)) {
    const file = path.join(mascotRoot, kind, `pose-${String(pose).padStart(2, "0")}.png`);
    imageData.set(key, fs.readFileSync(file).toString("base64"));
  }
  if (flip) {
    return `<g transform="translate(${x + width} ${y}) scale(-1 1)"><image href="data:image/png;base64,${imageData.get(key)}" x="0" y="0" width="${width}" height="${width}" preserveAspectRatio="xMidYMid meet"/></g>`;
  }
  const cx = x + width / 2;
  const cy = y + width / 2;
  return `<image href="data:image/png;base64,${imageData.get(key)}" x="${x}" y="${y}" width="${width}" height="${width}" preserveAspectRatio="xMidYMid meet" transform="rotate(${rotate} ${cx} ${cy})"/>`;
}

function footer(dark, number, total) {
  return `
    <text class="mono" x="76" y="1268" fill="${dark ? c.cream : c.ink}" font-size="24">ODESVIO.PT</text>
    <text class="mono" x="940" y="1268" fill="${dark ? c.gold : c.goldDark}" font-size="20">${String(number).padStart(2, "0")} / ${String(total).padStart(2, "0")}</text>`;
}

function titleBlock(lines, { dark, x = 76, y = 370, fontSize = 96, lineHeight = 92 } = {}) {
  return `<text class="display" x="${x}" y="${y}" fill="${dark ? c.cream : c.ink}" font-size="${fontSize}">${lines.map((line, index) => `<tspan x="${x}"${index ? ` dy="${lineHeight}"` : ""}>${line}</tspan>`).join("")}</text>`;
}

function eventSlide(week, slide, number, total) {
  const dark = slide.background === c.ink;
  const textX = slide.textX || 76;
  const titleBottom = slide.titleY + (slide.title.length - 1) * slide.lineHeight;
  const metaY = slide.metaY || titleBottom + 96;
  return {
    file: `${week.prefix}-${String(number).padStart(2, "0")}.png`,
    body: `
      <rect width="1080" height="1350" fill="${slide.background}"/>
      ${logo(dark, slide.background === c.gold ? c.ink : c.gold)}
      <text class="mono" x="76" y="226" fill="${dark ? c.gold : c.goldDark}" font-size="23">${slide.eyebrow}</text>
      ${titleBlock(slide.title, { dark, x: textX, y: slide.titleY, fontSize: slide.fontSize, lineHeight: slide.lineHeight })}
      <text class="body" x="${textX + 2}" y="${metaY}" fill="${dark ? c.mutedDark : c.mutedLight}" font-size="31">${slide.venue}</text>
      <text class="mono" x="${textX + 2}" y="${metaY + 70}" fill="${dark ? c.coral : c.ink}" font-size="20">${slide.genres}</text>
      ${mascot(week.mascot, slide.pose, slide.x, slide.y, slide.size, slide.rotate || 0, slide.flip || false)}
      ${footer(dark, number, total)}
    `,
  };
}

function tourSlide(week, slide, number, total) {
  return {
    file: `${week.prefix}-${String(number).padStart(2, "0")}.png`,
    body: `
      <rect width="1080" height="1350" fill="${c.cream}"/>
      ${logo(false)}
      <text class="mono" x="76" y="226" fill="${c.goldDark}" font-size="23">IBERIA TOUR · PORTUGAL</text>
      <text class="display" x="470" y="350" fill="${c.ink}" font-size="91">Fatal Move</text>
      <text class="body" x="474" y="415" fill="${c.mutedLight}" font-size="30">Duas noites. Duas cidades.</text>
      <line x1="590" y1="535" x2="590" y2="825" stroke="${c.gold}" stroke-width="3" stroke-dasharray="9 12"/>
      <circle cx="590" cy="535" r="11" fill="${c.coral}"/><circle cx="590" cy="825" r="11" fill="${c.coral}"/>
      <text class="mono" x="630" y="546" fill="${c.goldDark}" font-size="23">9 OUT · LISBOA</text>
      <text class="body" x="630" y="600" fill="${c.ink}" font-size="29" font-weight="700">Village Underground</text>
      <text class="body" x="630" y="641" fill="${c.mutedLight}" font-size="24">20h00 · c/ Outta Spite + NoPath</text>
      <text class="mono" x="630" y="836" fill="${c.goldDark}" font-size="23">10 OUT · PORTO</text>
      <text class="body" x="630" y="890" fill="${c.ink}" font-size="29" font-weight="700">Carpe Diem · Santo Tirso</text>
      <text class="body" x="630" y="932" fill="${c.mutedLight}" font-size="22">22h00 · c/ Fear The Lord</text>
      <text class="body" x="630" y="968" fill="${c.mutedLight}" font-size="22">+ Lost Grave</text>
      <text class="mono" x="630" y="1038" fill="${c.ink}" font-size="20">HARDCORE · IBERIA TOUR</text>
      ${mascot(week.mascot, slide.pose, 48, 610, 510, -2, true)}
      ${footer(false, number, total)}
    `,
  };
}

const weeks = [
  {
    dir: "2026-09-28_2026-10-04",
    prefix: "odesvio-agenda-28set-04out",
    mascot: "vinyl",
    range: "28 SETEMBRO A 4 OUTUBRO",
    coverNote: "Seis destaques. Muitas mais escolhas na agenda.",
    slides: [
      { background: c.cream, eyebrow: "28 SET · PORTO", title: ["Placebo"], titleY: 390, fontSize: 108, lineHeight: 96, venue: "Super Bock Arena · 20h00", genres: "ROCK · ALTERNATIVO", pose: 1, x: 410, y: 505, size: 635, rotate: 1 },
      { background: c.gold, eyebrow: "30 SET · LISBOA", title: ["Blood Red", "Shoes"], textX: 560, titleY: 360, fontSize: 80, lineHeight: 78, venue: "República da Música · 20h00", genres: "ROCK · ALTERNATIVO", pose: 7, x: 16, y: 500, size: 675, rotate: -2, flip: true },
      { background: c.ink, eyebrow: "1 A 4 OUT · BARREIRO", title: ["OUT.FEST"], titleY: 390, fontSize: 104, lineHeight: 92, venue: "Vários espaços · programa online", genres: "EXPERIMENTAL · ELETRÓNICA · JAZZ", pose: 4, x: 410, y: 490, size: 650, rotate: 2 },
      { background: c.cream, eyebrow: "2 A 4 OUT · FARO", title: ["Faro", "Alternativo"], textX: 520, titleY: 350, fontSize: 76, lineHeight: 76, venue: "Passeio Ribeirinho · portas 20h30", genres: "METAL · ROCK · HARDCORE · PUNK", pose: 6, x: 20, y: 500, size: 660, rotate: -2, flip: true },
      { background: c.gold, eyebrow: "3 OUT · PAREDES", title: ["MXGPU"], titleY: 390, fontSize: 112, lineHeight: 96, venue: "Centro Cultural de Paredes · 21h30", genres: "ELETRÓNICA · DANCE", pose: 2, x: 425, y: 515, size: 625, rotate: 1 },
      { background: c.ink, eyebrow: "4 OUT · LISBOA", title: ["Evanescence"], textX: 475, titleY: 390, fontSize: 70, lineHeight: 78, venue: "MEO Arena · 20h00", genres: "ROCK · METAL", pose: 5, x: 24, y: 500, size: 650, rotate: -1, flip: true },
    ],
  },
  {
    dir: "2026-10-05_2026-10-11",
    prefix: "odesvio-agenda-05out-11out",
    mascot: "guitar",
    range: "5 A 11 OUTUBRO",
    coverNote: "Seis destaques. Muitas mais escolhas na agenda.",
    slides: [
      { background: c.cream, eyebrow: "7 OUT · PORTO", title: ["Grant-Lee", "Phillips"], titleY: 350, fontSize: 92, lineHeight: 88, venue: "Casa da Música · 21h30", genres: "FOLK · ROCK", pose: 2, x: 405, y: 500, size: 650, rotate: 1 },
      { background: c.gold, eyebrow: "8 OUT · FARO", title: ["Rui Massena"], textX: 515, titleY: 390, fontSize: 76, lineHeight: 80, venue: "Teatro das Figuras · 21h30", genres: "PIANO · NEOCLÁSSICA", pose: 3, x: 15, y: 500, size: 670, rotate: -2 },
      { background: c.ink, eyebrow: "9 OUT · BRAGA", title: ["Midori", "Hirano"], titleY: 350, fontSize: 96, lineHeight: 90, venue: "gnration · 21h30", genres: "ELETRÓNICA · AMBIENT", pose: 4, x: 395, y: 505, size: 660, rotate: 2 },
      { kind: "tour", background: c.cream, eyebrow: "9–10 OUT · LISBOA + PORTO", title: ["Fatal Move", "Portugal tour"], pose: 5 },
      { background: c.gold, eyebrow: "10 OUT · LISBOA", title: ["Dire Straits", "Legacy"], titleY: 350, fontSize: 86, lineHeight: 84, venue: "Sagres Campo Pequeno", genres: "ROCK · CLASSIC ROCK", pose: 8, x: 400, y: 500, size: 660, rotate: 1 },
      { background: c.ink, eyebrow: "10 OUT · VISEU", title: ["Luís Lapa"], textX: 560, titleY: 390, fontSize: 82, lineHeight: 86, venue: "Teatro Viriato · 21h30", genres: "CANÇÃO DE AUTOR · MÚSICA PORTUGUESA", pose: 6, x: 20, y: 505, size: 660, rotate: -1, flip: true },
    ],
  },
];

function coverSlide(week, total) {
  return {
    file: `${week.prefix}-01.png`,
    body: `
      <rect width="1080" height="1350" fill="${c.ink}"/>
      ${logo(true)}
      <text class="mono" x="76" y="226" fill="${c.gold}" font-size="23">${week.range}</text>
      ${titleBlock(["A semana", "toca assim."], { dark: true, y: 390, fontSize: 104, lineHeight: 100 })}
      <text class="body" x="78" y="630" fill="${c.mutedDark}" font-size="32">${week.coverNote}</text>
      ${mascot(week.mascot, 1, 405, 555, 650, 1, week.mascot === "guitar")}
      ${footer(true, 1, total)}
    `,
  };
}

function summarySlide(week, total) {
  const dark = true;
  const rows = week.slides.map((slide, index) => {
    const date = slide.eyebrow.split(" · ")[0];
    const title = slide.title.join(" ").replace(/ \+$/, "");
    return `<text class="mono" x="76" y="${500 + index * 78}" fill="${c.coral}" font-size="21">${date}</text><text class="body" x="260" y="${500 + index * 78}" fill="${c.cream}" font-size="27" font-weight="700">${title}</text>`;
  }).join("");
  return {
    file: `${week.prefix}-${String(total).padStart(2, "0")}.png`,
    body: `
      <rect width="1080" height="1350" fill="${c.ink}"/>
      ${logo(true)}
      <text class="mono" x="76" y="226" fill="${c.gold}" font-size="23">GUARDA AS DATAS</text>
      ${titleBlock(["A semana", "num relance."], { dark, y: 350, fontSize: 84, lineHeight: 82 })}
      <rect x="76" y="400" width="650" height="2" fill="${c.gold}" opacity=".7"/>
      ${rows}
      ${mascot(week.mascot, 8, 625, 735, 445, -1)}
      ${footer(true, total, total)}
    `,
  };
}

for (const week of weeks) {
  const outDir = path.join(here, week.dir);
  fs.mkdirSync(outDir, { recursive: true });
  const total = week.slides.length + 2;
  const slides = [coverSlide(week, total), ...week.slides.map((slide, index) => slide.kind === "tour" ? tourSlide(week, slide, index + 2, total) : eventSlide(week, slide, index + 2, total)), summarySlide(week, total)];
  for (const slide of slides) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350">${styles}${slide.body}</svg>`;
    fs.writeFileSync(path.join(outDir, slide.file.replace(/\.png$/, ".svg")), svg);
    const pngFile = path.join(outDir, slide.file);
    await sharp(Buffer.from(svg)).png().toFile(pngFile);
    await sharp(pngFile)
      .flatten({ background: c.cream })
      .jpeg({ quality: 96, chromaSubsampling: "4:4:4" })
      .toFile(pngFile.replace(/\.png$/, ".jpg"));
  }
  const thumbs = await Promise.all(slides.map(async (slide, index) => ({
    input: await sharp(path.join(outDir, slide.file)).resize(270, 338, { fit: "fill" }).png().toBuffer(),
    left: (index % 4) * 270,
    top: Math.floor(index / 4) * 338,
  })));
  await sharp({ create: { width: 1080, height: 676, channels: 4, background: c.ink } })
    .composite(thumbs)
    .png()
    .toFile(path.join(outDir, `${week.prefix}-contact-sheet.png`));
  console.log(`Rendered ${slides.length} slides in ${outDir}`);
}
