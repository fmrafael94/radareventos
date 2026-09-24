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
  grey: "#cbd0cd",
  green: "#5d7164",
  panel: "#263135",
};

const styles = `<style>
  .display { font-family: Arial, Helvetica, sans-serif; font-weight: 800; letter-spacing: -5px; }
  .body { font-family: Arial, Helvetica, sans-serif; font-weight: 500; }
  .strong { font-family: Arial, Helvetica, sans-serif; font-weight: 800; }
  .mono { font-family: Menlo, Monaco, monospace; font-weight: 700; letter-spacing: 2px; }
</style>`;

const assetCache = new Map();
function asset(relativePath) {
  if (!assetCache.has(relativePath)) {
    assetCache.set(relativePath, fs.readFileSync(path.join(here, relativePath)).toString("base64"));
  }
  return assetCache.get(relativePath);
}

function image(relativePath, x, y, width, options = {}) {
  const { flip = false, rotate = 0, opacity = 1 } = options;
  const tx = flip ? x + width : x;
  return `<g opacity="${opacity}" transform="translate(${tx} ${y}) scale(${flip ? -1 : 1} 1) rotate(${rotate} ${width / 2} ${width / 2})">
    <image href="data:image/png;base64,${asset(relativePath)}" width="${width}" height="${width}" preserveAspectRatio="xMidYMid meet"/>
  </g>`;
}

function logo(dark = true) {
  return `<g transform="translate(66 54)">
    <g transform="scale(.42)" fill="none" stroke="${c.gold}" stroke-linecap="round">
      <path d="M93 31a45 45 0 1 0 13 31" stroke-width="7"/><path d="M87 42a33 33 0 1 0 9 23" stroke-width="6"/>
      <path d="M81 52a21 21 0 1 0 6 15" stroke-width="5"/><path d="M94 20v25c0 10-6 15-15 19" stroke-width="10"/>
    </g>
    <circle cx="27" cy="29" r="5.5" fill="${c.gold}"/><circle cx="27" cy="29" r="2" fill="${c.coral}"/>
    <text x="64" y="38" fill="${dark ? c.cream : c.ink}" font-family="Arial, Helvetica, sans-serif" font-size="31" font-weight="800">O DESVIO</text>
  </g>`;
}

function footer(dark, number, total) {
  return `<text class="mono" x="68" y="1282" fill="${dark ? c.cream : c.ink}" font-size="21">ODESVIO.PT</text>
    <text class="mono" x="1012" y="1282" text-anchor="end" fill="${dark ? c.gold : c.goldDark}" font-size="18">${String(number).padStart(2, "0")} / ${String(total).padStart(2, "0")}</text>`;
}

function lines(items, { x, y, size, gap, color, cls = "display", anchor = "start" }) {
  return `<text class="${cls}" x="${x}" y="${y}" text-anchor="${anchor}" fill="${color}" font-size="${size}">${items.map((line, index) => `<tspan x="${x}"${index ? ` dy="${gap}"` : ""}>${line}</tspan>`).join("")}</text>`;
}

function base(background, number, body) {
  const dark = background === c.ink || background === c.coral;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350">${styles}<rect width="1080" height="1350" fill="${background}"/>${logo(dark)}${body}${footer(dark, number, 8)}</svg>`;
}

function pill(x, y, width, label, dark = true) {
  return `<rect x="${x}" y="${y}" width="${width}" height="58" rx="29" fill="${dark ? c.gold : c.ink}"/><text class="strong" x="${x + width / 2}" y="${y + 38}" text-anchor="middle" fill="${dark ? c.ink : c.cream}" font-size="21">${label}</text>`;
}

function button(x, y, width, label, icon, dark = true) {
  const fill = dark ? c.cream : c.ink;
  const text = dark ? c.ink : c.cream;
  return `<rect x="${x}" y="${y}" width="${width}" height="76" rx="18" fill="${fill}"/><text x="${x + 30}" y="${y + 48}" fill="${text}" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="800">${label}</text><text x="${x + width - 34}" y="${y + 49}" text-anchor="middle" fill="${dark ? c.coral : c.gold}" font-family="Arial" font-size="28">${icon}</text>`;
}

let clipIndex = 0;
function screenshot(relativePath, x, y, width, height, radius = 18) {
  const id = `shot-${clipIndex++}`;
  return `<defs><clipPath id="${id}"><rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${radius}"/></clipPath></defs>
    <rect x="${x - 4}" y="${y - 4}" width="${width + 8}" height="${height + 8}" rx="${radius + 4}" fill="${c.ink}" opacity=".18"/>
    <image href="data:image/png;base64,${asset(relativePath)}" x="${x}" y="${y}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet" clip-path="url(#${id})"/>`;
}

function focusRing(cx, cy, rx, ry, label, labelX, labelY, dark = false) {
  const fill = dark ? c.cream : c.ink;
  return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" stroke="${c.coral}" stroke-width="8"/>
    <rect x="${labelX}" y="${labelY}" width="220" height="46" rx="23" fill="${fill}"/>
    <text class="mono" x="${labelX + 110}" y="${labelY + 30}" text-anchor="middle" fill="${dark ? c.ink : c.cream}" font-size="15">${label}</text>`;
}

function tapTarget(cx, cy, label, labelX, labelY, dark = false) {
  const fill = dark ? c.cream : c.ink;
  return `<circle cx="${cx}" cy="${cy}" r="36" fill="${c.cream}" fill-opacity=".94" stroke="${c.coral}" stroke-width="8"/>
    <path d="M${cx - 8} ${cy + 9}l16-18m-2 0h-14m14 0v14" fill="none" stroke="${c.ink}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
    <rect x="${labelX}" y="${labelY}" width="220" height="46" rx="23" fill="${fill}"/>
    <text class="mono" x="${labelX + 110}" y="${labelY + 30}" text-anchor="middle" fill="${dark ? c.ink : c.cream}" font-size="15">${label}</text>`;
}

const slides = [
  base(c.ink, 1, `
    <text class="mono" x="68" y="202" fill="${c.gold}" font-size="21">GUIA RÁPIDO · O DESVIO</text>
    ${lines(["Encontraste", "o concerto.", "E agora?"], { x:68, y:332, size:91, gap:88, color:c.cream })}
    ${lines(["Da ficha do evento até à porta da sala.", "Sem perder o ritmo pelo caminho."], { x:72, y:650, size:28, gap:42, color:c.grey, cls:"body" })}
    ${pill(68, 770, 318, "DESLIZA PARA APRENDER", true)}
    ${image("../../../brand/mascots-happy/amplificador-feliz.png", 500, 615, 520, { rotate:-2 })}
  `),

  base(c.cream, 2, `
    <text class="mono" x="68" y="200" fill="${c.goldDark}" font-size="21">01 · ABRE A FICHA</text>
    ${lines(["Está tudo", "no alinhamento."], { x:68, y:326, size:85, gap:83, color:c.ink })}
    <text class="mono" x="70" y="500" fill="${c.coral}" font-size="16">EXEMPLO REAL · REIGN OF FURY FEST 2026</text>
    ${screenshot("screenshots/homepage-reign-feature.png", 68, 526, 560, 550)}
    ${focusRing(348, 1023, 258, 34, "ABRE A FICHA", 68, 1097, false)}
    ${lines(["Toca no destaque", "para abrir a ficha", "com toda a informação."], { x:666, y:584, size:29, gap:44, color:c.green, cls:"body" })}
    ${image("mascots/amplificador-telemovel.png", 610, 690, 420, { rotate:2 })}
  `),

  base(c.gold, 3, `
    <text class="mono" x="68" y="200" fill="${c.ink}" font-size="21">02 · VÊ E CONFIRMA</text>
    ${lines(["Cartaz grande.", "Fonte à vista."], { x:68, y:326, size:84, gap:82, color:c.ink })}
    <text class="mono" x="70" y="518" fill="${c.coral}" font-size="16">EXEMPLO REAL · REIGN OF FURY FEST 2026</text>
    ${screenshot("screenshots/reign-poster.png", 68, 554, 500, 309)}
    ${tapTarget(512, 808, "TOCA NO CARTAZ", 208, 884, false)}
    ${lines(["Amplia o cartaz sem cortes.", "Depois confirma mudanças", "na fonte oficial."], { x:616, y:600, size:29, gap:45, color:c.ink, cls:"body" })}
    ${screenshot("screenshots/reign-actions.png", 68, 982, 944, 61, 12)}
    ${focusRing(592, 1012, 98, 43, "FONTE OFICIAL", 482, 1075, false)}
    ${image("mascots/amplificador-cartaz.png", 665, 650, 300, { rotate:2 })}
  `),

  base(c.ink, 4, `
    <text class="mono" x="68" y="200" fill="${c.gold}" font-size="21">03 · ENCONTRA O CAMINHO</text>
    ${lines(["Do sofá", "até à sala."], { x:68, y:326, size:88, gap:86, color:c.cream })}
    <path d="M690 300 C900 400 600 560 848 690 C1006 773 822 964 982 1080" fill="none" stroke="${c.gold}" stroke-width="5" stroke-dasharray="16 18" opacity=".75"/>
    <circle cx="690" cy="300" r="18" fill="${c.coral}"/><circle cx="982" cy="1080" r="18" fill="${c.coral}"/>
    ${lines(["O botão abre o mapa já apontado", "ao local certo do evento."], { x:70, y:568, size:29, gap:43, color:c.grey, cls:"body" })}
    <text class="mono" x="70" y="690" fill="${c.gold}" font-size="16">NA FICHA DO REIGN OF FURY</text>
    ${screenshot("screenshots/reign-actions.png", 68, 724, 944, 61, 12)}
    ${focusRing(357, 754, 140, 45, "CARREGA AQUI", 247, 814, true)}
    ${image("mascots/amplificador-mapa.png", 450, 770, 570, { rotate:-1 })}
  `),

  base(c.cream, 5, `
    <text class="mono" x="68" y="200" fill="${c.goldDark}" font-size="21">04 · GARANTE A ENTRADA</text>
    ${lines(["Bilhete sem", "solos desnecessários."], { x:68, y:326, size:80, gap:80, color:c.ink })}
    ${lines(["Quando existe venda oficial, o botão leva-te", "diretamente à bilheteira certa."], { x:72, y:548, size:28, gap:42, color:c.green, cls:"body" })}
    <text class="mono" x="70" y="690" fill="${c.goldDark}" font-size="16">NA FICHA DO REIGN OF FURY</text>
    ${screenshot("screenshots/reign-actions.png", 68, 724, 944, 61, 12)}
    ${focusRing(141, 754, 83, 45, "ABRE A BILHETEIRA", 68, 814, false)}
    <rect x="68" y="900" width="510" height="126" rx="24" fill="${c.ink}"/>
    ${lines(["Se a venda ainda não abriu,", "a ficha diz ‘por confirmar’."], { x:100, y:950, size:25, gap:38, color:c.cream, cls:"strong" })}
    ${image("mascots/amplificador-bilhete-calendario.png", 510, 760, 520, { rotate:2 })}
  `),

  base(c.coral, 6, `
    <text class="mono" x="68" y="200" fill="${c.ink}" font-size="21">05 · NÃO DEIXES ESCAPAR</text>
    ${lines(["Marca.", "Partilha.", "Não falhes."], { x:68, y:326, size:90, gap:86, color:c.cream })}
    ${screenshot("screenshots/reign-actions.png", 68, 624, 944, 61, 12)}
    ${focusRing(842, 654, 164, 45, "ADICIONA", 732, 708, true)}
    ${screenshot("screenshots/reign-share.png", 68, 790, 470, 319)}
    ${focusRing(303, 1030, 202, 45, "PARTILHA", 193, 1132, true)}
    ${image("mascots/amplificador-bilhete-calendario.png", 515, 700, 500, { flip:true, rotate:-2 })}
  `),

  base(c.gold, 7, `
    <text class="mono" x="68" y="200" fill="${c.ink}" font-size="21">06 · A AGENDA TAMBÉM É TUA</text>
    ${lines(["Falta algo?", "Mete no cartaz."], { x:68, y:326, size:84, gap:82, color:c.ink })}
    ${lines(["Acrescenta no topo da agenda.", "Corrige no rodapé da própria ficha."], { x:72, y:552, size:27, gap:43, color:c.ink, cls:"body" })}
    <text class="mono" x="70" y="672" fill="${c.coral}" font-size="16">PARA ACRESCENTAR</text>
    ${screenshot("screenshots/homepage-submit.png", 68, 706, 390, 60, 12)}
    ${focusRing(263, 736, 208, 44, "COMPLETA A AGENDA", 68, 790, false)}
    <text class="mono" x="70" y="904" fill="${c.coral}" font-size="16">PARA CORRIGIR</text>
    ${screenshot("screenshots/reign-correct.png", 68, 938, 350, 58, 10)}
    ${focusRing(243, 967, 190, 42, "CORRIGIR EVENTO", 68, 1020, false)}
    ${image("mascots/amplificador-formulario.png", 455, 600, 580, { rotate:1 })}
  `),

  base(c.ink, 8, `
    <text class="mono" x="540" y="222" text-anchor="middle" fill="${c.gold}" font-size="21">FIM DO GUIA · INÍCIO DO DESVIO</text>
    ${lines(["Menos screenshots.", "Mais concertos."], { x:540, y:360, size:82, gap:82, color:c.cream, anchor:"middle" })}
    ${lines(["Guarda este guia e envia-o a quem", "chega sempre atrasado ao concerto."], { x:540, y:586, size:29, gap:43, color:c.grey, cls:"body", anchor:"middle" })}
    ${pill(344, 716, 392, "ABRIR ODESVIO.PT", true)}
    ${image("../../../brand/mascots-happy/amplificador-feliz.png", 330, 765, 430, { rotate:-2 })}
  `),
];

for (const [index, svg] of slides.entries()) {
  const baseName = `odesvio-guia-${String(index + 1).padStart(2, "0")}`;
  fs.writeFileSync(path.join(here, `${baseName}.svg`), svg);
  await sharp(Buffer.from(svg)).png().toFile(path.join(here, `${baseName}.png`));
}

const thumbs = await Promise.all(slides.map(async (_, index) => ({
  input: await sharp(path.join(here, `odesvio-guia-${String(index + 1).padStart(2, "0")}.png`)).resize(270, 338, { fit:"fill" }).png().toBuffer(),
  left: (index % 4) * 270,
  top: Math.floor(index / 4) * 338,
})));

await sharp({ create:{ width:1080, height:676, channels:4, background:c.ink } })
  .composite(thumbs)
  .png()
  .toFile(path.join(here, "odesvio-guia-contact-sheet.png"));

console.log(`Rendered ${slides.length} slides in ${here}`);
