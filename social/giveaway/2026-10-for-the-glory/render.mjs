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

const mascot = (file) => fs.readFileSync(path.join(here, "mascots", file)).toString("base64");
const poster = fs.readFileSync(path.join(here, "for-the-glory-official-poster.jpg")).toString("base64");

function logo(fg, accent) {
  return `<g transform="translate(76 70)">
    <circle cx="27" cy="27" r="26" fill="none" stroke="${accent}" stroke-width="4"/>
    <circle cx="27" cy="27" r="15" fill="none" stroke="${accent}" stroke-width="4"/>
    <circle cx="27" cy="27" r="4" fill="${palette.coral}"/>
    <path d="M27 27 L50 9" fill="none" stroke="${accent}" stroke-width="5" stroke-linecap="round"/>
    <text x="72" y="38" fill="${fg}" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="800" letter-spacing="-1.5">O DESVIO</text>
  </g>`;
}

function footer(fg, accent, index) {
  return `<rect x="76" y="1192" width="928" height="2" fill="${fg}" opacity=".18"/>
    <text class="mono" x="76" y="1266" fill="${fg}" font-size="24">ODESVIO.PT</text>
    <text class="mono" x="900" y="1266" fill="${accent}" font-size="20">0${index} / 04</text>`;
}

const slides = [
  {
    file: "odesvio-giveaway-for-the-glory-01",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350">
      ${styles}<rect width="1080" height="1350" fill="${palette.ink}"/>
      ${logo(palette.cream, palette.gold)}
      <rect x="0" y="175" width="1080" height="202" fill="${palette.coral}"/>
      <text class="display" x="72" y="322" fill="${palette.cream}" font-size="132" style="letter-spacing:-7px">GIVEAWAY</text>
      <text class="mono" x="76" y="448" fill="${palette.gold}" font-size="24">1 BILHETE PARA OFERECER</text>
      <text class="display" x="76" y="585" fill="${palette.cream}" font-size="74"><tspan x="76">17 OUT.</tspan><tspan x="76" dy="72">LISBOA.</tspan></text>
      <rect x="76" y="704" width="350" height="88" rx="44" fill="${palette.gold}"/>
      <text class="mono" x="251" y="759" fill="${palette.ink}" font-size="20" text-anchor="middle">1 BILHETE</text>
      <g transform="rotate(2 760 710)">
        <rect x="508" y="400" width="512" height="670" rx="26" fill="${palette.cream}"/>
        <image href="data:image/jpeg;base64,${poster}" x="522" y="414" width="484" height="642" preserveAspectRatio="xMidYMid meet"/>
      </g>
      <image href="data:image/png;base64,${mascot("v2-01-bilhete.png")}" x="36" y="796" width="390" height="390" preserveAspectRatio="xMidYMid meet"/>
      ${footer(palette.cream, palette.gold, 1)}
    </svg>`,
  },
  {
    file: "odesvio-giveaway-for-the-glory-02",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350">
      ${styles}<rect width="1080" height="1350" fill="${palette.cream}"/>
      ${logo(palette.ink, palette.gold)}
      <text class="mono" x="76" y="225" fill="${palette.coral}" font-size="23">COMO PARTICIPAR</text>
      <text class="display" x="76" y="390" fill="${palette.ink}" font-size="104"><tspan x="76">Entrar é</tspan><tspan x="76" dy="98">simples.</tspan></text>
      <g transform="translate(78 630)">
        <circle cx="34" cy="34" r="34" fill="${palette.coral}"/><text class="display" x="34" y="49" text-anchor="middle" fill="${palette.cream}" font-size="44" style="letter-spacing:0">1</text>
        <text class="body" x="94" y="45" fill="${palette.ink}" font-size="33">Segue @odesvio.pt</text>
        <circle cx="34" cy="140" r="34" fill="${palette.gold}"/><text class="display" x="34" y="155" text-anchor="middle" fill="${palette.ink}" font-size="44" style="letter-spacing:0">2</text>
        <text class="body" x="94" y="151" fill="${palette.ink}" font-size="33">Identifica 1 amigo</text>
        <circle cx="34" cy="246" r="34" fill="${palette.coral}"/><text class="display" x="34" y="261" text-anchor="middle" fill="${palette.cream}" font-size="44" style="letter-spacing:0">3</text>
        <text class="body" x="94" y="224" fill="${palette.ink}" font-size="30"><tspan x="94">Conta um episódio lendário</tspan><tspan x="94" dy="40">que aconteceu num gig</tspan><tspan x="94" dy="40">de hardcore</tspan></text>
      </g>
      <image href="data:image/png;base64,${mascot("v2-02-cassete.png")}" x="590" y="650" width="500" height="500" preserveAspectRatio="xMidYMid meet"/>
      ${footer(palette.ink, palette.coral, 2)}
    </svg>`,
  },
  {
    file: "odesvio-giveaway-for-the-glory-03",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350">
      ${styles}<rect width="1080" height="1350" fill="${palette.gold}"/>
      ${logo(palette.ink, palette.ink)}
      <text class="mono" x="76" y="225" fill="${palette.coral}" font-size="23">O EPISÓDIO QUE FICOU NO PIT</text>
      <text class="display" x="76" y="385" fill="${palette.ink}" font-size="94"><tspan x="76">Aquele momento</tspan><tspan x="76" dy="91">que ainda</tspan><tspan x="76" dy="91">contas.</tspan></text>
      <text class="body" x="78" y="690" fill="#344044" font-size="31"><tspan x="78">Preferencialmente num gig dos</tspan><tspan x="78" dy="44">For The Glory. Queremos o episódio</tspan><tspan x="78" dy="44">lendário que nunca saiu da conversa.</tspan></text>
      <image href="data:image/png;base64,${mascot("v2-03-microfone.png")}" x="460" y="750" width="600" height="600" preserveAspectRatio="xMidYMid meet"/>
      ${footer(palette.ink, palette.coral, 3)}
    </svg>`,
  },
  {
    file: "odesvio-giveaway-for-the-glory-04",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350">
      ${styles}<rect width="1080" height="1350" fill="${palette.ink}"/>
      ${logo(palette.cream, palette.gold)}
      <text class="mono" x="76" y="225" fill="${palette.gold}" font-size="23">CADA EPISÓDIO CONTA</text>
      <text class="display" x="76" y="390" fill="${palette.cream}" font-size="96"><tspan x="76">Mais episódios.</tspan><tspan x="76" dy="94">Mais hipóteses.</tspan></text>
      <text class="body" x="78" y="650" fill="${palette.soft}" font-size="31"><tspan x="78">Cada comentário válido é uma entrada.</tspan><tspan x="78" dy="44">O vencedor sai de uma escolha aleatória.</tspan></text>
      <rect x="76" y="770" width="510" height="172" rx="30" fill="#252f33" stroke="${palette.gold}" stroke-width="2"/>
      <text class="mono" x="112" y="826" fill="${palette.gold}" font-size="20">PARTICIPAÇÕES ATÉ</text>
      <text class="display" x="108" y="902" fill="${palette.cream}" font-size="54" style="letter-spacing:-2px">11 OUT · 23:59</text>
      <text class="mono" x="78" y="1035" fill="${palette.coral}" font-size="21">17 OUT · 20:00 · LISBOA</text>
      <text class="body" x="78" y="1085" fill="${palette.cream}" font-size="29">For The Glory · Fear The Lord · @sunny_slam</text>
      <text class="body" x="78" y="1132" fill="${palette.soft}" font-size="26">Evento de @hellxis</text>
      <image href="data:image/png;base64,${mascot("v2-04-vinil.png")}" x="600" y="635" width="490" height="490" preserveAspectRatio="xMidYMid meet"/>
      ${footer(palette.cream, palette.gold, 4)}
    </svg>`,
  },
];

for (const slide of slides) {
  fs.writeFileSync(path.join(here, `${slide.file}.svg`), slide.svg);
  await sharp(Buffer.from(slide.svg)).png().toFile(path.join(here, `${slide.file}.png`));
}

const cells = await Promise.all(slides.map(async (slide, index) => ({
  input: await sharp(path.join(here, `${slide.file}.png`)).resize(405, 506, { fit: "fill" }).png().toBuffer(),
  left: (index % 2) * 405,
  top: Math.floor(index / 2) * 506,
})));

await sharp({ create: { width: 810, height: 1012, channels: 4, background: palette.ink } })
  .composite(cells)
  .png()
  .toFile(path.join(here, "odesvio-giveaway-for-the-glory-contact-sheet.png"));

console.log("Rendered four For The Glory giveaway slides.");
