import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const sharp = require("sharp");
const here = path.dirname(new URL(import.meta.url).pathname);

const c = {
  ink: "#182226",
  cream: "#f7f5f0",
  gold: "#b7a45a",
  goldDark: "#88752e",
  coral: "#e35e44",
  mutedDark: "#cbd0cd",
  mutedLight: "#596467",
};

const styles = `<style>
  .display { font-family: Arial, Helvetica, sans-serif; font-weight: 800; letter-spacing: -5px; }
  .body { font-family: Arial, Helvetica, sans-serif; font-weight: 500; }
  .strong { font-family: Arial, Helvetica, sans-serif; font-weight: 800; }
  .mono { font-family: Menlo, Monaco, monospace; font-weight: 700; letter-spacing: 2.4px; }
</style>`;

function logo(dark = true) {
  return `<g transform="translate(68 60)">
    <g transform="scale(.44)" fill="none" stroke="${c.gold}" stroke-linecap="round">
      <path d="M93 31a45 45 0 1 0 13 31" stroke-width="7"/>
      <path d="M87 42a33 33 0 1 0 9 23" stroke-width="6"/>
      <path d="M81 52a21 21 0 1 0 6 15" stroke-width="5"/>
      <path d="M94 20v25c0 10-6 15-15 19" stroke-width="10"/>
    </g>
    <circle cx="28" cy="30" r="5.8" fill="${c.gold}"/><circle cx="28" cy="30" r="2.1" fill="${c.coral}"/>
    <text x="66" y="39" fill="${dark ? c.cream : c.ink}" font-family="Arial, Helvetica, sans-serif" font-size="32" font-weight="800" letter-spacing="-1.2">O DESVIO</text>
  </g>`;
}

function footer(dark, number) {
  return `<text class="mono" x="68" y="1280" fill="${dark ? c.cream : c.ink}" font-size="22">ODESVIO.PT</text>
    <text class="mono" x="936" y="1280" fill="${dark ? c.gold : c.goldDark}" font-size="19">${String(number).padStart(2, "0")} / 05</text>`;
}

const cache = new Map();
function mascot(dir, pose, x, y, width, { flip = false, rotate = 0 } = {}) {
  const key = `${dir}/${pose}`;
  if (!cache.has(key)) {
    cache.set(key, fs.readFileSync(path.join(here, dir, "mascots", `pose-${String(pose).padStart(2, "0")}.png`)).toString("base64"));
  }
  const img = `<image href="data:image/png;base64,${cache.get(key)}" x="0" y="0" width="${width}" height="${width}" preserveAspectRatio="xMidYMid meet"/>`;
  const sx = flip ? -1 : 1;
  const tx = flip ? x + width : x;
  return `<g transform="translate(${tx} ${y}) scale(${sx} 1) rotate(${rotate} ${width / 2} ${width / 2})">${img}</g>`;
}

function lines(items, { x, y, size, lineHeight, color, cls = "strong", anchor = "start" }) {
  return `<text class="${cls}" x="${x}" y="${y}" text-anchor="${anchor}" fill="${color}" font-size="${size}">${items.map((item, index) => `<tspan x="${x}"${index ? ` dy="${lineHeight}"` : ""}>${item}</tspan>`).join("")}</text>`;
}

function title(items, options) {
  return lines(items, { ...options, cls: "display" });
}

function pill(x, y, width, text, dark) {
  return `<rect x="${x}" y="${y}" width="${width}" height="58" rx="29" fill="${dark ? "none" : c.ink}" stroke="${dark ? c.gold : c.ink}" stroke-width="2"/>
    <text class="mono" x="${x + width / 2}" y="${y + 37}" text-anchor="middle" fill="${dark ? c.cream : c.cream}" font-size="18">${text}</text>`;
}

function base(background, number, body) {
  const dark = background === c.ink;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350">${styles}
    <rect width="1080" height="1350" fill="${background}"/>
    ${logo(dark)}${body}${footer(dark, number)}
  </svg>`;
}

const features = [
  {
    dir: "2026-09-22-reign-fury",
    prefix: "odesvio-destaque-reign-fury",
    slides: [
      base(c.ink, 1, `
        <text class="mono" x="68" y="214" fill="${c.gold}" font-size="22">DESTAQUE DO FIM DE SEMANA</text>
        ${title(["Reign Of Fury", "Fest 2026"], { x: 68, y: 340, size: 94, lineHeight: 92, color: c.cream })}
        ${lines(["Um dia. Dez bandas. Corroios."], { x: 72, y: 566, size: 30, lineHeight: 40, color: c.mutedDark, cls: "body" })}
        ${pill(68, 622, 292, "26 SETEMBRO", true)}
        ${mascot("2026-09-22-reign-fury", 1, 345, 520, 710, { flip: true })}`),
      base(c.cream, 2, `
        <text class="mono" x="68" y="214" fill="${c.goldDark}" font-size="22">O PIT COMEÇA AQUI</text>
        ${title(["Quatro nomes", "sem aquecimento."], { x: 68, y: 336, size: 78, lineHeight: 78, color: c.ink })}
        ${lines(["Merauder", "Knuckledust", "No Turning Back", "Devil In Me"], { x: 72, y: 600, size: 42, lineHeight: 62, color: c.ink })}
        ${mascot("2026-09-22-reign-fury", 2, 465, 545, 590, { flip: false })}`),
      base(c.gold, 3, `
        <text class="mono" x="68" y="214" fill="${c.ink}" font-size="22">E NÃO ABRANDA</text>
        ${title(["Mais seis", "para fechar o dia."], { x: 68, y: 336, size: 78, lineHeight: 78, color: c.ink })}
        ${lines(["Not Without Fighting", "Neighborz", "Diabolical Mental State"], { x: 70, y: 575, size: 33, lineHeight: 54, color: c.ink })}
        ${lines(["Faced Out", "Takeback", "Uncrown"], { x: 612, y: 575, size: 33, lineHeight: 54, color: c.ink })}
        ${mascot("2026-09-22-reign-fury", 3, 250, 700, 650, { flip: false })}`),
      base(c.cream, 4, `
        <text class="mono" x="68" y="214" fill="${c.goldDark}" font-size="22">26 SETEMBRO · CORROIOS</text>
        ${title(["Chega cedo.", "Sai sem voz."], { x: 68, y: 340, size: 88, lineHeight: 86, color: c.ink })}
        <rect x="68" y="570" width="460" height="244" rx="28" fill="${c.ink}"/>
        ${lines(["PORTAS", "15H00"], { x: 104, y: 632, size: 23, lineHeight: 66, color: c.cream, cls: "mono" })}
        ${lines(["PRIMEIRA BANDA", "16H00"], { x: 290, y: 632, size: 20, lineHeight: 66, color: c.gold, cls: "mono" })}
        ${lines(["Ginásio Clube de Corroios", "2.ª fase · 40 €"], { x: 72, y: 875, size: 28, lineHeight: 47, color: c.mutedLight, cls: "body" })}
        ${mascot("2026-09-22-reign-fury", 4, 500, 515, 560, { flip: false })}`),
      base(c.ink, 5, `
        <text class="mono" x="68" y="214" fill="${c.gold}" font-size="22">SÁBADO TEM DESTINO</text>
        ${title(["Vemo-nos", "no pit."], { x: 68, y: 350, size: 102, lineHeight: 98, color: c.cream })}
        ${lines(["Evento completo e bilhetes", "em odesvio.pt"], { x: 72, y: 610, size: 31, lineHeight: 44, color: c.mutedDark, cls: "body" })}
        <rect x="68" y="734" width="470" height="76" rx="38" fill="${c.gold}"/>
        <text class="strong" x="303" y="783" text-anchor="middle" fill="${c.ink}" font-size="25">GUARDAR O EVENTO</text>
        ${mascot("2026-09-22-reign-fury", 5, 455, 500, 620, { flip: false })}`),
    ],
  },
  {
    dir: "2026-09-30-faro-alternativo",
    prefix: "odesvio-destaque-faro-alternativo",
    slides: [
      base(c.cream, 1, `
        <text class="mono" x="68" y="214" fill="${c.goldDark}" font-size="22">DESTAQUE DO FIM DE SEMANA</text>
        ${title(["Faro", "Alternativo"], { x: 68, y: 342, size: 102, lineHeight: 96, color: c.ink })}
        ${lines(["Três noites. Dois palcos.", "Um festival."], { x: 72, y: 590, size: 31, lineHeight: 44, color: c.mutedLight, cls: "body" })}
        ${pill(68, 706, 340, "2 A 4 OUTUBRO", false)}
        ${mascot("2026-09-30-faro-alternativo", 1, 402, 500, 650, { flip: false })}`),
      base(c.ink, 2, `
        <text class="mono" x="68" y="214" fill="${c.gold}" font-size="22">2 OUT · HARDCORE</text>
        ${title(["Primeira noite.", "Sem travões."], { x: 68, y: 338, size: 82, lineHeight: 82, color: c.cream })}
        ${lines(["Desolated", "Brothers Till We Die", "Asfixia Social", "Grankapo", "Fear The Lord", "Against Them All"], { x: 70, y: 590, size: 31, lineHeight: 48, color: c.cream })}
        ${mascot("2026-09-30-faro-alternativo", 2, 505, 555, 550, { flip: false })}`),
      base(c.coral, 3, `
        <text class="mono" x="68" y="214" fill="${c.ink}" font-size="22">3 OUT · METAL</text>
        ${title(["A segunda noite", "pesa mais."], { x: 68, y: 338, size: 80, lineHeight: 80, color: c.ink })}
        ${lines(["Avulsed", "Teething", "Morte Incandescente", "Capela Mortuária", "Besta", "Baltum"], { x: 70, y: 590, size: 32, lineHeight: 49, color: c.ink })}
        ${mascot("2026-09-30-faro-alternativo", 3, 490, 560, 570, { flip: false })}`),
      base(c.gold, 4, `
        <text class="mono" x="68" y="214" fill="${c.ink}" font-size="22">4 OUT · ROCK + PUNK</text>
        ${title(["Última noite.", "Último mergulho."], { x: 68, y: 338, size: 78, lineHeight: 80, color: c.ink })}
        ${lines(["Mata-Ratos", "Miss Lava", "Ancient Settlers", "Redemptus", "Razor Kids", "Undercover Society"], { x: 70, y: 590, size: 31, lineHeight: 48, color: c.ink })}
        ${mascot("2026-09-30-faro-alternativo", 5, 488, 555, 575, { flip: false })}`),
      base(c.cream, 5, `
        <text class="mono" x="68" y="214" fill="${c.goldDark}" font-size="22">2 A 4 OUT · FARO</text>
        ${title(["Três noites.", "Escolhe as tuas."], { x: 68, y: 338, size: 82, lineHeight: 82, color: c.ink })}
        ${lines(["Passeio Ribeirinho · dois palcos", "Portas 20h30 · concertos 21h00", "Diário 25 € · passe 55 €"], { x: 72, y: 594, size: 28, lineHeight: 46, color: c.mutedLight, cls: "body" })}
        <rect x="68" y="782" width="420" height="76" rx="38" fill="${c.ink}"/>
        <text class="strong" x="278" y="831" text-anchor="middle" fill="${c.cream}" font-size="25">VER PROGRAMA COMPLETO</text>
        ${mascot("2026-09-30-faro-alternativo", 4, 492, 560, 565, { flip: false })}`),
    ],
  },
  {
    dir: "2026-10-07-fatal-move",
    prefix: "odesvio-destaque-fatal-move-tour",
    slides: [
      base(c.ink, 1, `
        <text class="mono" x="68" y="214" fill="${c.gold}" font-size="22">IBERIA TOUR · PORTUGAL</text>
        ${title(["Fatal Move", "em dose dupla."], { x: 68, y: 340, size: 92, lineHeight: 90, color: c.cream })}
        ${lines(["Duas cidades. Duas noites.", "Dois alinhamentos."], { x: 72, y: 590, size: 30, lineHeight: 44, color: c.mutedDark, cls: "body" })}
        ${pill(68, 706, 330, "9 + 10 OUTUBRO", true)}
        ${mascot("2026-10-07-fatal-move", 1, 410, 510, 635, { flip: true })}`),
      base(c.cream, 2, `
        <text class="mono" x="68" y="214" fill="${c.goldDark}" font-size="22">9 OUT · LISBOA</text>
        ${title(["Primeira paragem:"], { x: 68, y: 340, size: 74, lineHeight: 76, color: c.ink })}
        ${lines(["Fatal Move", "Outta Spite", "NoPath"], { x: 70, y: 505, size: 46, lineHeight: 64, color: c.ink })}
        ${lines(["Village Underground · 20h00", "evento de @sportswear.bookings"], { x: 72, y: 755, size: 26, lineHeight: 44, color: c.mutedLight, cls: "body" })}
        ${mascot("2026-10-07-fatal-move", 2, 455, 480, 610, { flip: false })}`),
      base(c.gold, 3, `
        <text class="mono" x="68" y="214" fill="${c.ink}" font-size="22">10 OUT · SANTO TIRSO</text>
        ${title(["Segunda paragem:"], { x: 68, y: 340, size: 72, lineHeight: 76, color: c.ink })}
        ${lines(["Fatal Move", "Fear The Lord", "Lost Grave"], { x: 70, y: 505, size: 46, lineHeight: 64, color: c.ink })}
        ${lines(["Carpe Diem · 22h00", "evento de @born_to_resist_events_booking"], { x: 72, y: 755, size: 25, lineHeight: 44, color: c.ink, cls: "body" })}
        ${mascot("2026-10-07-fatal-move", 3, 470, 500, 585, { flip: false })}`),
      base(c.cream, 4, `
        <text class="mono" x="68" y="214" fill="${c.goldDark}" font-size="22">A MESMA TOUR · DOIS CARTAZES</text>
        ${title(["Escolhe o teu", "alinhamento."], { x: 68, y: 335, size: 80, lineHeight: 80, color: c.ink })}
        <rect x="68" y="560" width="432" height="326" rx="28" fill="${c.ink}"/>
        ${lines(["LISBOA · 9 OUT"], { x: 102, y: 620, size: 19, lineHeight: 40, color: c.gold, cls: "mono" })}
        ${lines(["Fatal Move", "Outta Spite", "NoPath"], { x: 102, y: 681, size: 31, lineHeight: 46, color: c.cream })}
        <rect x="580" y="560" width="432" height="326" rx="28" fill="${c.coral}"/>
        ${lines(["SANTO TIRSO · 10 OUT"], { x: 614, y: 620, size: 18, lineHeight: 40, color: c.ink, cls: "mono" })}
        ${lines(["Fatal Move", "Fear The Lord", "Lost Grave"], { x: 614, y: 681, size: 31, lineHeight: 46, color: c.ink })}
        ${mascot("2026-10-07-fatal-move", 4, 335, 770, 410, { flip: false })}`),
      base(c.ink, 5, `
        <text class="mono" x="68" y="214" fill="${c.gold}" font-size="22">9 OUT · LISBOA · 10 OUT · SANTO TIRSO</text>
        ${title(["Escolhe a data.", "Entra no pit."], { x: 68, y: 340, size: 88, lineHeight: 86, color: c.cream })}
        ${lines(["Detalhes, fontes e ligações", "em odesvio.pt"], { x: 72, y: 590, size: 30, lineHeight: 44, color: c.mutedDark, cls: "body" })}
        <rect x="68" y="730" width="420" height="76" rx="38" fill="${c.gold}"/>
        <text class="strong" x="278" y="779" text-anchor="middle" fill="${c.ink}" font-size="25">GUARDAR AS DATAS</text>
        ${mascot("2026-10-07-fatal-move", 5, 470, 500, 590, { flip: false })}`),
    ],
  },
];

for (const feature of features) {
  const outDir = path.join(here, feature.dir);
  for (const [index, svg] of feature.slides.entries()) {
    const basename = `${feature.prefix}-${String(index + 1).padStart(2, "0")}`;
    fs.writeFileSync(path.join(outDir, `${basename}.svg`), svg);
    await sharp(Buffer.from(svg)).png().toFile(path.join(outDir, `${basename}.png`));
  }
  const thumbs = await Promise.all(feature.slides.map(async (_, index) => ({
    input: await sharp(path.join(outDir, `${feature.prefix}-${String(index + 1).padStart(2, "0")}.png`)).resize(270, 338, { fit: "fill" }).png().toBuffer(),
    left: (index % 4) * 270,
    top: Math.floor(index / 4) * 338,
  })));
  await sharp({ create: { width: 1080, height: 676, channels: 4, background: c.ink } })
    .composite(thumbs)
    .png()
    .toFile(path.join(outDir, `${feature.prefix}-contact-sheet.png`));
  console.log(`Rendered ${feature.slides.length} slides in ${outDir}`);
}
