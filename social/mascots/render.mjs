import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const sharp = require("sharp");

const here = path.dirname(new URL(import.meta.url).pathname);
const repo = path.resolve(here, "../..");
const mascot = (file) => fs.readFileSync(path.join(repo, `brand/mascots-happy/${file}`)).toString("base64");
const mascots = {
  carrinha: mascot("carrinha-feliz.png"),
  guitarra: mascot("guitarra-feliz.png"),
  vinil: mascot("vinil-feliz.png"),
  amplificador: mascot("amplificador-feliz.png"),
  bateria: mascot("bateria-feliz.png"),
};

const palette = {
  ink: "#182226",
  cream: "#f7f5f0",
  gold: "#b7a45a",
  goldDark: "#8a7734",
  coral: "#e35e44",
  muted: "#667075",
};

const logo = (x = 78, y = 78, dark = false, mark = palette.gold) => `
  <g transform="translate(${x} ${y})">
    <g transform="scale(.48)" fill="none" stroke="${mark}" stroke-linecap="round">
      <path d="M93 31a45 45 0 1 0 13 31" stroke-width="7"/>
      <path d="M87 42a33 33 0 1 0 9 23" stroke-width="6"/>
      <path d="M81 52a21 21 0 1 0 6 15" stroke-width="5"/>
      <path d="M94 20v25c0 10-6 15-15 19" stroke-width="10"/>
    </g>
    <circle cx="30.7" cy="32.6" r="6.2" fill="${mark}"/>
    <circle cx="30.7" cy="32.6" r="2.2" fill="${palette.coral}"/>
    <text x="72" y="42" fill="${dark ? palette.ink : palette.cream}" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="800" letter-spacing="-1.4">O DESVIO</text>
  </g>`;

const commonStyle = `
  <style>
    .display { font-family: Arial, Helvetica, sans-serif; font-weight: 800; letter-spacing: -5px; }
    .body { font-family: Arial, Helvetica, sans-serif; font-weight: 500; }
    .mono { font-family: Menlo, Monaco, monospace; font-weight: 700; letter-spacing: 3px; }
  </style>`;

const slides = [
  {
    file: "odesvio-mascote-launch-01.png",
    svg: `
      <rect width="1080" height="1350" fill="${palette.ink}"/>
      ${logo()}
      <text class="mono" x="78" y="234" fill="${palette.gold}" font-size="22">A AGENDA DE MÚSICA EM PORTUGAL</text>
      <text class="display" x="76" y="392" fill="${palette.cream}" font-size="112">
        <tspan x="76" dy="0">Há música</tspan><tspan x="76" dy="108">a acontecer.</tspan>
      </text>
      <rect x="78" y="558" width="104" height="8" rx="4" fill="${palette.coral}"/>
      <text class="body" x="78" y="625" fill="#cbd0cd" font-size="37">Nós ajudamos-te a encontrá-la.</text>
      <image href="data:image/png;base64,${mascots.carrinha}" x="285" y="620" width="800" height="800" preserveAspectRatio="xMidYMid meet"/>
      <text class="mono" x="78" y="1260" fill="${palette.cream}" font-size="25">ODESVIO.PT</text>
      <text class="mono" x="947" y="1260" fill="${palette.gold}" font-size="21">01 / 05</text>
    `,
  },
  {
    file: "odesvio-mascote-launch-02.png",
    svg: `
      <rect width="1080" height="1350" fill="${palette.cream}"/>
      ${logo(78, 78, true)}
      <text class="mono" x="78" y="238" fill="${palette.goldDark}" font-size="22">PROCURA À TUA MANEIRA</text>
      <text class="display" x="76" y="390" fill="${palette.ink}" font-size="108">
        <tspan x="76" dy="0">Um filtro.</tspan><tspan x="76" dy="104">Ou vários.</tspan>
      </text>
      <text class="body" x="78" y="594" fill="${palette.muted}" font-size="34">
        <tspan x="78" dy="0">Artista, sala, cidade, data, género,</tspan><tspan x="78" dy="48">formato, preço — combina como quiseres.</tspan>
      </text>
      <rect x="78" y="716" width="340" height="62" rx="31" fill="${palette.ink}"/>
      <text class="body" x="112" y="757" fill="${palette.cream}" font-size="25" font-weight="700">MENOS PROCURA</text>
      <image href="data:image/png;base64,${mascots.guitarra}" x="450" y="665" width="600" height="600" preserveAspectRatio="xMidYMid meet"/>
      <text class="mono" x="78" y="1260" fill="${palette.ink}" font-size="25">ODESVIO.PT</text>
      <text class="mono" x="947" y="1260" fill="${palette.goldDark}" font-size="21">02 / 05</text>
    `,
  },
  {
    file: "odesvio-mascote-launch-03.png",
    svg: `
      <rect width="1080" height="1350" fill="${palette.gold}"/>
      ${logo(78, 78, true, palette.ink)}
      <text class="mono" x="78" y="238" fill="${palette.ink}" font-size="22">TODO O PAÍS. TODA A MÚSICA.</text>
      <text class="display" x="76" y="392" fill="${palette.ink}" font-size="102">
        <tspan x="76" dy="0">Do underground</tspan><tspan x="76" dy="100">aos grandes</tspan><tspan x="76" dy="100">palcos.</tspan>
      </text>
      <text class="body" x="78" y="742" fill="#2d373a" font-size="34">Uma agenda. Sem hierarquias.</text>
      <image href="data:image/png;base64,${mascots.vinil}" x="470" y="720" width="600" height="600" preserveAspectRatio="xMidYMid meet"/>
      <text class="mono" x="78" y="1260" fill="${palette.ink}" font-size="25">ODESVIO.PT</text>
      <text class="mono" x="947" y="1260" fill="${palette.ink}" font-size="21">03 / 05</text>
    `,
  },
  {
    file: "odesvio-mascote-launch-04.png",
    svg: `
      <rect width="1080" height="1350" fill="${palette.cream}"/>
      ${logo(78, 78, true)}
      <text class="mono" x="78" y="238" fill="${palette.goldDark}" font-size="22">PARA QUEM FAZ A MÚSICA ACONTECER</text>
      <text class="display" x="76" y="390" fill="${palette.ink}" font-size="100">
        <tspan x="76" dy="0">Promoves</tspan><tspan x="76" dy="98">concertos?</tspan>
      </text>
      <text class="body" x="78" y="625" fill="${palette.muted}" font-size="35">
        <tspan x="78" dy="0">Junta os teus eventos à agenda.</tspan><tspan x="78" dy="48">É simples e gratuito.</tspan>
      </text>
      <rect x="78" y="765" width="420" height="78" rx="16" fill="${palette.coral}"/>
      <text class="body" x="116" y="816" fill="${palette.cream}" font-size="29" font-weight="800">COMPLETA A AGENDA →</text>
      <image href="data:image/png;base64,${mascots.amplificador}" x="455" y="690" width="630" height="630" preserveAspectRatio="xMidYMid meet"/>
      <text class="mono" x="78" y="1260" fill="${palette.ink}" font-size="25">ODESVIO.PT</text>
      <text class="mono" x="947" y="1260" fill="${palette.goldDark}" font-size="21">04 / 05</text>
    `,
  },
  {
    file: "odesvio-mascote-launch-05.png",
    svg: `
      <rect width="1080" height="1350" fill="${palette.ink}"/>
      ${logo()}
      <text class="mono" x="78" y="238" fill="${palette.gold}" font-size="22">AGENDA ATÉ DOMINGO</text>
      <text class="display" x="76" y="370" fill="${palette.cream}" font-size="96">Guarda as datas.</text>
      <rect x="78" y="426" width="760" height="2" fill="${palette.gold}" opacity=".65"/>
      <text class="mono" x="78" y="510" fill="${palette.coral}" font-size="22">22 SET</text>
      <text class="body" x="235" y="510" fill="${palette.cream}" font-size="31">Einar Solberg · Porto</text>
      <text class="mono" x="78" y="582" fill="${palette.coral}" font-size="22">23 SET</text>
      <text class="body" x="235" y="582" fill="${palette.cream}" font-size="31">Fat Freddy’s Drop · Lisboa</text>
      <text class="mono" x="78" y="654" fill="${palette.coral}" font-size="22">25 SET</text>
      <text class="body" x="235" y="654" fill="${palette.cream}" font-size="31">Sensible Soccers · Braga</text>
      <text class="mono" x="78" y="726" fill="${palette.coral}" font-size="22">26 SET</text>
      <text class="body" x="235" y="726" fill="${palette.cream}" font-size="31">Reign Of Fury Fest · Corroios</text>
      <text class="mono" x="78" y="798" fill="${palette.coral}" font-size="22">27 SET</text>
      <text class="body" x="235" y="798" fill="${palette.cream}" font-size="31">Beethoven · Lisboa</text>
      <text class="body" x="78" y="912" fill="#cbd0cd" font-size="29">
        <tspan x="78">Horários, salas e bilhetes</tspan><tspan x="78" dy="40">na agenda completa.</tspan>
      </text>
      <image href="data:image/png;base64,${mascots.bateria}" x="600" y="780" width="470" height="470" preserveAspectRatio="xMidYMid meet"/>
      <rect x="78" y="1222" width="520" height="3" fill="${palette.gold}"/>
      <text class="mono" x="78" y="1272" fill="${palette.gold}" font-size="28">ODESVIO.PT</text>
      <text class="mono" x="947" y="1272" fill="${palette.gold}" font-size="21">05 / 05</text>
    `,
  },
];

for (const slide of slides) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350">${commonStyle}${slide.svg}</svg>`;
  const svgPath = path.join(here, slide.file.replace(/\.png$/, ".svg"));
  fs.writeFileSync(svgPath, svg);
  await sharp(Buffer.from(svg)).png().toFile(path.join(here, slide.file));
}

console.log(`Rendered ${slides.length} mascot-led slides in ${here}`);
