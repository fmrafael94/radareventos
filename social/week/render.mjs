import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const sharp = require("sharp");

const here = path.dirname(new URL(import.meta.url).pathname);
const repo = path.resolve(here, "../..");
const asset = (file) => fs.readFileSync(path.join(repo, "brand/mascots-happy", file)).toString("base64");

const mascots = {
  carrinha: asset("carrinha-feliz.png"),
  guitarra: asset("guitarra-feliz.png"),
  vinil: asset("vinil-feliz.png"),
  amplificador: asset("amplificador-feliz.png"),
  bateria: asset("bateria-feliz.png"),
};

const c = {
  ink: "#182226",
  cream: "#f7f5f0",
  gold: "#b7a45a",
  goldDark: "#8a7734",
  coral: "#e35e44",
  muted: "#667075",
};

const logo = (dark = false, mark = c.gold) => `
  <g transform="translate(78 78)">
    <g transform="scale(.48)" fill="none" stroke="${mark}" stroke-linecap="round">
      <path d="M93 31a45 45 0 1 0 13 31" stroke-width="7"/>
      <path d="M87 42a33 33 0 1 0 9 23" stroke-width="6"/>
      <path d="M81 52a21 21 0 1 0 6 15" stroke-width="5"/>
      <path d="M94 20v25c0 10-6 15-15 19" stroke-width="10"/>
    </g>
    <circle cx="30.7" cy="32.6" r="6.2" fill="${mark}"/>
    <circle cx="30.7" cy="32.6" r="2.2" fill="${c.coral}"/>
    <text x="72" y="42" fill="${dark ? c.ink : c.cream}" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="800" letter-spacing="-1.4">O DESVIO</text>
  </g>`;

const styles = `<style>
  .display { font-family: Arial, Helvetica, sans-serif; font-weight: 800; letter-spacing: -5px; }
  .body { font-family: Arial, Helvetica, sans-serif; font-weight: 500; }
  .mono { font-family: Menlo, Monaco, monospace; font-weight: 700; letter-spacing: 3px; }
</style>`;

const slides = [
  {
    file: "odesvio-proximos-7-dias-01.png",
    body: `
      <rect width="1080" height="1350" fill="${c.ink}"/>
      ${logo()}
      <text class="mono" x="78" y="238" fill="${c.gold}" font-size="24">22—28 SETEMBRO 2026</text>
      <text class="display" x="76" y="400" fill="${c.cream}" font-size="108">
        <tspan x="76">5 concertos</tspan><tspan x="76" dy="105">para os próximos</tspan><tspan x="76" dy="105">7 dias.</tspan>
      </text>
      <text class="body" x="78" y="760" fill="#cbd0cd" font-size="34">Do dub ao hardcore. Do clássico ao alternativo.</text>
      <image href="data:image/png;base64,${mascots.carrinha}" x="390" y="700" width="730" height="730" preserveAspectRatio="xMidYMid meet"/>
      <text class="mono" x="78" y="1260" fill="${c.cream}" font-size="25">ODESVIO.PT</text>
      <text class="mono" x="947" y="1260" fill="${c.gold}" font-size="21">01 / 07</text>
    `,
  },
  {
    file: "odesvio-proximos-7-dias-02.png",
    body: `
      <rect width="1080" height="1350" fill="${c.cream}"/>
      ${logo(true)}
      <text class="mono" x="78" y="238" fill="${c.goldDark}" font-size="24">23 SET · LISBOA</text>
      <text class="display" x="76" y="404" fill="${c.ink}" font-size="100">
        <tspan x="76">Fat Freddy’s</tspan><tspan x="76" dy="98">Drop</tspan>
      </text>
      <text class="body" x="78" y="624" fill="${c.muted}" font-size="35">Sagres Campo Pequeno · 21h00</text>
      <text class="mono" x="78" y="702" fill="${c.coral}" font-size="22">DUB · REGGAE · SOUL</text>
      <image href="data:image/png;base64,${mascots.vinil}" x="470" y="690" width="610" height="610" preserveAspectRatio="xMidYMid meet"/>
      <text class="mono" x="78" y="1260" fill="${c.ink}" font-size="25">DETALHES NA BIO</text>
      <text class="mono" x="947" y="1260" fill="${c.goldDark}" font-size="21">02 / 07</text>
    `,
  },
  {
    file: "odesvio-proximos-7-dias-03.png",
    body: `
      <rect width="1080" height="1350" fill="${c.gold}"/>
      ${logo(true, c.ink)}
      <text class="mono" x="78" y="238" fill="${c.ink}" font-size="24">25 SET · BRAGA</text>
      <text class="display" x="76" y="404" fill="${c.ink}" font-size="100">
        <tspan x="76">Sensible</tspan><tspan x="76" dy="98">Soccers</tspan>
      </text>
      <text class="body" x="78" y="624" fill="#2d373a" font-size="35">Theatro Circo · 21h30</text>
      <text class="mono" x="78" y="702" fill="${c.ink}" font-size="22">ELETRÓNICA · INSTRUMENTAL</text>
      <image href="data:image/png;base64,${mascots.guitarra}" x="500" y="690" width="560" height="560" preserveAspectRatio="xMidYMid meet"/>
      <text class="mono" x="78" y="1260" fill="${c.ink}" font-size="25">DETALHES NA BIO</text>
      <text class="mono" x="947" y="1260" fill="${c.ink}" font-size="21">03 / 07</text>
    `,
  },
  {
    file: "odesvio-proximos-7-dias-04.png",
    body: `
      <rect width="1080" height="1350" fill="${c.ink}"/>
      ${logo()}
      <text class="mono" x="78" y="238" fill="${c.gold}" font-size="24">26 SET · CORROIOS</text>
      <text class="display" x="76" y="404" fill="${c.cream}" font-size="96">
        <tspan x="76">Reign of Fury</tspan><tspan x="76" dy="94">Fest</tspan>
      </text>
      <text class="body" x="78" y="624" fill="#cbd0cd" font-size="34">Ginásio Clube de Corroios · 15h00</text>
      <text class="mono" x="78" y="702" fill="${c.coral}" font-size="22">HARDCORE · METAL · PUNK</text>
      <image href="data:image/png;base64,${mascots.amplificador}" x="470" y="690" width="610" height="610" preserveAspectRatio="xMidYMid meet"/>
      <text class="mono" x="78" y="1260" fill="${c.cream}" font-size="25">DETALHES NA BIO</text>
      <text class="mono" x="947" y="1260" fill="${c.gold}" font-size="21">04 / 07</text>
    `,
  },
  {
    file: "odesvio-proximos-7-dias-05.png",
    body: `
      <rect width="1080" height="1350" fill="${c.cream}"/>
      ${logo(true)}
      <text class="mono" x="78" y="238" fill="${c.goldDark}" font-size="24">27 SET · LISBOA</text>
      <text class="display" x="76" y="400" fill="${c.ink}" font-size="92">
        <tspan x="76">Sinfonia n.º 5</tspan><tspan x="76" dy="92">de Beethoven</tspan>
      </text>
      <text class="body" x="78" y="624" fill="${c.muted}" font-size="35">CCB · Grande Auditório · 17h00</text>
      <text class="mono" x="78" y="702" fill="${c.coral}" font-size="22">CLÁSSICA · ORQUESTRAL</text>
      <image href="data:image/png;base64,${mascots.bateria}" x="430" y="670" width="670" height="670" preserveAspectRatio="xMidYMid meet"/>
      <text class="mono" x="78" y="1260" fill="${c.ink}" font-size="25">DETALHES NA BIO</text>
      <text class="mono" x="947" y="1260" fill="${c.goldDark}" font-size="21">05 / 07</text>
    `,
  },
  {
    file: "odesvio-proximos-7-dias-06.png",
    body: `
      <rect width="1080" height="1350" fill="${c.gold}"/>
      ${logo(true, c.ink)}
      <text class="mono" x="78" y="238" fill="${c.ink}" font-size="24">28 SET · PORTO</text>
      <text class="display" x="76" y="404" fill="${c.ink}" font-size="112">Placebo</text>
      <text class="body" x="78" y="532" fill="#2d373a" font-size="35">Super Bock Arena · 20h00</text>
      <text class="mono" x="78" y="610" fill="${c.ink}" font-size="22">ROCK · ALTERNATIVO</text>
      <text class="body" x="78" y="690" fill="#2d373a" font-size="29">30th Anniversary Tour</text>
      <image href="data:image/png;base64,${mascots.carrinha}" x="390" y="660" width="740" height="740" preserveAspectRatio="xMidYMid meet"/>
      <text class="mono" x="78" y="1260" fill="${c.ink}" font-size="25">DETALHES NA BIO</text>
      <text class="mono" x="947" y="1260" fill="${c.ink}" font-size="21">06 / 07</text>
    `,
  },
  {
    file: "odesvio-proximos-7-dias-07.png",
    body: `
      <rect width="1080" height="1350" fill="${c.ink}"/>
      ${logo()}
      <text class="mono" x="78" y="238" fill="${c.gold}" font-size="24">GUARDA AS DATAS</text>
      <text class="display" x="76" y="375" fill="${c.cream}" font-size="94">Esta semana.</text>
      <rect x="78" y="430" width="924" height="2" fill="${c.gold}" opacity=".7"/>

      <text class="mono" x="78" y="508" fill="${c.coral}" font-size="25">23 SET</text>
      <text class="body" x="235" y="508" fill="${c.cream}" font-size="31" font-weight="700">Fat Freddy’s Drop · Lisboa</text>
      <text class="mono" x="78" y="590" fill="${c.coral}" font-size="25">25 SET</text>
      <text class="body" x="235" y="590" fill="${c.cream}" font-size="31" font-weight="700">Sensible Soccers · Braga</text>
      <text class="mono" x="78" y="672" fill="${c.coral}" font-size="25">26 SET</text>
      <text class="body" x="235" y="672" fill="${c.cream}" font-size="31" font-weight="700">Reign of Fury Fest · Corroios</text>
      <text class="mono" x="78" y="754" fill="${c.coral}" font-size="25">27 SET</text>
      <text class="body" x="235" y="754" fill="${c.cream}" font-size="31" font-weight="700">Beethoven · Lisboa</text>
      <text class="mono" x="78" y="836" fill="${c.coral}" font-size="25">28 SET</text>
      <text class="body" x="235" y="836" fill="${c.cream}" font-size="31" font-weight="700">Placebo · Porto</text>

      <image href="data:image/png;base64,${mascots.bateria}" x="670" y="850" width="370" height="370" preserveAspectRatio="xMidYMid meet"/>
      <text class="body" x="78" y="962" fill="#cbd0cd" font-size="31">
        <tspan x="78">Mais informação, horários</tspan><tspan x="78" dy="43">e bilhetes na agenda.</tspan>
      </text>
      <text class="mono" x="78" y="1260" fill="${c.cream}" font-size="25">ODESVIO.PT</text>
      <text class="mono" x="947" y="1260" fill="${c.gold}" font-size="21">07 / 07</text>
    `,
  },
];

fs.mkdirSync(here, { recursive: true });
for (const slide of slides) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350">${styles}${slide.body}</svg>`;
  fs.writeFileSync(path.join(here, slide.file.replace(/\.png$/, ".svg")), svg);
  await sharp(Buffer.from(svg)).png().toFile(path.join(here, slide.file));
}

console.log(`Rendered ${slides.length} weekly slides in ${here}`);
