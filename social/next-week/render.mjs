import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const sharp = require("sharp");
const here = path.dirname(new URL(import.meta.url).pathname);
const repo = path.resolve(here, "../..");
const mascot = fs.readFileSync(path.join(repo, "brand/mascots-happy/vinil-feliz.png")).toString("base64");

const c = { ink: "#182226", cream: "#f7f5f0", gold: "#b7a45a", goldDark: "#8a7734", coral: "#e35e44", muted: "#667075" };
const styles = `<style>
  .display { font-family: Arial, Helvetica, sans-serif; font-weight: 800; letter-spacing: -5px; }
  .body { font-family: Arial, Helvetica, sans-serif; font-weight: 500; }
  .mono { font-family: Menlo, Monaco, monospace; font-weight: 700; letter-spacing: 3px; }
</style>`;

const logo = (dark = false, mark = c.gold) => `
  <g transform="translate(78 78)">
    <g transform="scale(.48)" fill="none" stroke="${mark}" stroke-linecap="round">
      <path d="M93 31a45 45 0 1 0 13 31" stroke-width="7"/><path d="M87 42a33 33 0 1 0 9 23" stroke-width="6"/><path d="M81 52a21 21 0 1 0 6 15" stroke-width="5"/><path d="M94 20v25c0 10-6 15-15 19" stroke-width="10"/>
    </g>
    <circle cx="30.7" cy="32.6" r="6.2" fill="${mark}"/><circle cx="30.7" cy="32.6" r="2.2" fill="${c.coral}"/>
    <text x="72" y="42" fill="${dark ? c.ink : c.cream}" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="800" letter-spacing="-1.4">O DESVIO</text>
  </g>`;

const image = (x = 470, y = 680, size = 610) => `<image href="data:image/png;base64,${mascot}" x="${x}" y="${y}" width="${size}" height="${size}" preserveAspectRatio="xMidYMid meet"/>`;
const footer = (dark, number) => `
  <text class="mono" x="78" y="1260" fill="${dark ? c.cream : c.ink}" font-size="25">ODESVIO.PT</text>
  <text class="mono" x="947" y="1260" fill="${dark ? c.gold : c.goldDark}" font-size="21">${String(number).padStart(2, "0")} / 07</text>`;

const eventSlide = ({ number, background, dark, eyebrow, title, title2 = "", venue, genres, mascotX = 470, mascotY = 690, mascotSize = 610 }) => ({
  file: `odesvio-agenda-28set-04out-${String(number).padStart(2, "0")}.png`,
  body: `
    <rect width="1080" height="1350" fill="${background}"/>
    ${logo(!dark, dark ? c.gold : c.ink)}
    <text class="mono" x="78" y="238" fill="${dark ? c.gold : c.ink}" font-size="24">${eyebrow}</text>
    <text class="display" x="76" y="404" fill="${dark ? c.cream : c.ink}" font-size="${title.length > 18 ? 82 : 100}">
      <tspan x="76">${title}</tspan>${title2 ? `<tspan x="76" dy="92">${title2}</tspan>` : ""}
    </text>
    <text class="body" x="78" y="${title2 ? 624 : 548}" fill="${dark ? "#cbd0cd" : "#2d373a"}" font-size="34">${venue}</text>
    <text class="mono" x="78" y="${title2 ? 702 : 626}" fill="${dark ? c.coral : c.ink}" font-size="22">${genres}</text>
    ${image(mascotX, mascotY, mascotSize)}
    ${footer(dark, number)}
  `,
});

const slides = [
  {
    file: "odesvio-agenda-28set-04out-01.png",
    body: `
      <rect width="1080" height="1350" fill="${c.ink}"/>${logo()}
      <text class="mono" x="78" y="238" fill="${c.gold}" font-size="24">28 SETEMBRO—4 OUTUBRO</text>
      <text class="display" x="76" y="400" fill="${c.cream}" font-size="106"><tspan x="76">A próxima</tspan><tspan x="76" dy="104">semana toca</tspan><tspan x="76" dy="104">assim.</tspan></text>
      <text class="body" x="78" y="760" fill="#cbd0cd" font-size="34">Cinco destaques. Muitas mais escolhas na agenda.</text>
      ${image(380, 660, 680)}${footer(true, 1)}
    `,
  },
  eventSlide({ number: 2, background: c.cream, dark: false, eyebrow: "28 SET · PORTO", title: "Placebo", venue: "Super Bock Arena · 20h00", genres: "ROCK · ALTERNATIVO" }),
  eventSlide({ number: 3, background: c.gold, dark: false, eyebrow: "30 SET · LISBOA", title: "Blood Red", title2: "Shoes", venue: "República da Música · 20h00", genres: "ROCK · ALTERNATIVO", mascotX: 500, mascotSize: 570 }),
  eventSlide({ number: 4, background: c.ink, dark: true, eyebrow: "1—4 OUT · BARREIRO", title: "OUT.FEST", venue: "Vários espaços · programa completo online", genres: "EXPERIMENTAL · ELETRÓNICA · JAZZ" }),
  eventSlide({ number: 5, background: c.cream, dark: false, eyebrow: "3 OUT · PAREDES", title: "MXGPU", venue: "Centro Cultural de Paredes · 21h30", genres: "ELETRÓNICA · DANCE" }),
  eventSlide({ number: 6, background: c.gold, dark: false, eyebrow: "4 OUT · LISBOA", title: "Evanescence", venue: "MEO Arena · 20h00", genres: "ROCK · METAL", mascotX: 470, mascotSize: 620 }),
  {
    file: "odesvio-agenda-28set-04out-07.png",
    body: `
      <rect width="1080" height="1350" fill="${c.ink}"/>${logo()}
      <text class="mono" x="78" y="238" fill="${c.gold}" font-size="24">GUARDA AS DATAS</text>
      <text class="display" x="76" y="375" fill="${c.cream}" font-size="90">A próxima semana.</text>
      <rect x="78" y="430" width="924" height="2" fill="${c.gold}" opacity=".7"/>
      <text class="mono" x="78" y="508" fill="${c.coral}" font-size="25">28 SET</text><text class="body" x="255" y="508" fill="${c.cream}" font-size="31" font-weight="700">Placebo · Porto</text>
      <text class="mono" x="78" y="590" fill="${c.coral}" font-size="25">30 SET</text><text class="body" x="255" y="590" fill="${c.cream}" font-size="31" font-weight="700">Blood Red Shoes · Lisboa</text>
      <text class="mono" x="78" y="672" fill="${c.coral}" font-size="25">1—4 OUT</text><text class="body" x="255" y="672" fill="${c.cream}" font-size="31" font-weight="700">OUT.FEST · Barreiro</text>
      <text class="mono" x="78" y="754" fill="${c.coral}" font-size="25">3 OUT</text><text class="body" x="255" y="754" fill="${c.cream}" font-size="31" font-weight="700">MXGPU · Paredes</text>
      <text class="mono" x="78" y="836" fill="${c.coral}" font-size="25">4 OUT</text><text class="body" x="255" y="836" fill="${c.cream}" font-size="31" font-weight="700">Evanescence · Lisboa</text>
      <text class="body" x="78" y="958" fill="#cbd0cd" font-size="30"><tspan x="78">Mais concertos, horários</tspan><tspan x="78" dy="42">e bilhetes na agenda.</tspan></text>
      ${image(690, 865, 350)}${footer(true, 7)}
    `,
  },
];

fs.mkdirSync(here, { recursive: true });
for (const slide of slides) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350">${styles}${slide.body}</svg>`;
  fs.writeFileSync(path.join(here, slide.file.replace(/\.png$/, ".svg")), svg);
  await sharp(Buffer.from(svg)).png().toFile(path.join(here, slide.file));
}
console.log(`Rendered ${slides.length} slides in ${here}`);
