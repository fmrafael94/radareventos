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
      <rect x="0" y="178" width="1080" height="168" fill="${palette.coral}"/>
      <text class="display" x="72" y="303" fill="${palette.cream}" font-size="112" style="letter-spacing:-6px">GIVEAWAY</text>
      <text class="mono" x="76" y="414" fill="${palette.gold}" font-size="22">UM COMENTÁRIO PODE LEVAR-TE AO PIT</text>
      <text class="display" x="76" y="545" fill="${palette.cream}" font-size="70"><tspan x="76">1 BILHETE.</tspan><tspan x="76" dy="68">3 BANDAS.</tspan></text>
      <rect x="76" y="692" width="330" height="74" rx="37" fill="${palette.gold}"/>
      <text class="mono" x="241" y="739" fill="${palette.ink}" font-size="18" text-anchor="middle">17 OUT · LISBOA</text>
      <g transform="rotate(1 782 700)">
        <rect x="500" y="378" width="510" height="675" rx="28" fill="${palette.cream}"/>
        <image href="data:image/jpeg;base64,${poster}" x="514" y="392" width="482" height="647" preserveAspectRatio="xMidYMid meet"/>
      </g>
      <image href="data:image/png;base64,${mascot("v2-01-bilhete.png")}" x="24" y="760" width="430" height="430" preserveAspectRatio="xMidYMid meet"/>
      ${footer(palette.cream, palette.gold, 1)}
    </svg>`,
  },
  {
    file: "odesvio-giveaway-for-the-glory-02",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350">
      ${styles}<rect width="1080" height="1350" fill="${palette.ink}"/>
      ${logo(palette.cream, palette.gold)}
      <text class="mono" x="76" y="214" fill="${palette.coral}" font-size="21">COMO PARTICIPAR</text>
      <text class="display" x="76" y="346" fill="${palette.cream}" font-size="90">Três passos.</text>
      <g transform="translate(76 438)">
        <rect width="928" height="150" rx="28" fill="#263135"/>
        <circle cx="68" cy="75" r="34" fill="${palette.coral}"/><text class="display" x="68" y="90" text-anchor="middle" fill="${palette.cream}" font-size="42" style="letter-spacing:0">1</text>
        <text class="body" x="132" y="87" fill="${palette.cream}" font-size="34">Segue @odesvio.pt</text>
        <rect y="172" width="928" height="150" rx="28" fill="#263135"/>
        <circle cx="68" cy="247" r="34" fill="${palette.gold}"/><text class="display" x="68" y="262" text-anchor="middle" fill="${palette.ink}" font-size="42" style="letter-spacing:0">2</text>
        <text class="body" x="132" y="259" fill="${palette.cream}" font-size="34">Identifica 1 amigo</text>
        <rect y="344" width="928" height="210" rx="28" fill="#263135"/>
        <circle cx="68" cy="419" r="34" fill="${palette.coral}"/><text class="display" x="68" y="434" text-anchor="middle" fill="${palette.cream}" font-size="42" style="letter-spacing:0">3</text>
        <text class="body" x="132" y="405" fill="${palette.cream}" font-size="31"><tspan x="132">Conta um episódio lendário</tspan><tspan x="132" dy="42">vivido num gig de hardcore</tspan></text>
      </g>
      <image href="data:image/png;base64,${mascot("v2-02-cassete.png")}" x="608" y="916" width="390" height="300" preserveAspectRatio="xMidYMid meet"/>
      ${footer(palette.cream, palette.coral, 2)}
    </svg>`,
  },
  {
    file: "odesvio-giveaway-for-the-glory-03",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350">
      ${styles}<rect width="1080" height="1350" fill="${palette.gold}"/>
      ${logo(palette.ink, palette.ink)}
      <text class="mono" x="76" y="214" fill="${palette.coral}" font-size="21">O EPISÓDIO QUE FICOU NO PIT</text>
      <text class="display" x="76" y="348" fill="${palette.ink}" font-size="88"><tspan x="76">Aquele momento</tspan><tspan x="76" dy="88">que ainda contas.</tspan></text>
      <rect x="76" y="555" width="928" height="230" rx="30" fill="${palette.cream}" opacity=".96"/>
      <text class="body" x="116" y="628" fill="${palette.ink}" font-size="30"><tspan x="116">Preferencialmente num gig dos @forthegloryhc.</tspan><tspan x="116" dy="44">Conta o episódio lendário que ainda hoje</tspan><tspan x="116" dy="44">aparece em todas as conversas.</tspan></text>
      <text class="mono" x="78" y="858" fill="${palette.coral}" font-size="20">CADA COMENTÁRIO VÁLIDO = 1 ENTRADA</text>
      <text class="body" x="78" y="916" fill="${palette.ink}" font-size="29"><tspan x="78">Podes participar mais do que uma vez.</tspan><tspan x="78" dy="42">Mais episódios, mais hipóteses.</tspan></text>
      <image href="data:image/png;base64,${mascot("v2-03-microfone.png")}" x="520" y="820" width="540" height="430" preserveAspectRatio="xMidYMid meet"/>
      ${footer(palette.ink, palette.coral, 3)}
    </svg>`,
  },
  {
    file: "odesvio-giveaway-for-the-glory-04",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350">
      ${styles}<rect width="1080" height="1350" fill="${palette.ink}"/>
      ${logo(palette.cream, palette.gold)}
      <text class="mono" x="76" y="214" fill="${palette.gold}" font-size="21">O CONCERTO</text>
      <text class="display" x="76" y="330" fill="${palette.cream}" font-size="78">Guarda a data.</text>
      <g transform="rotate(-1 310 700)">
        <rect x="76" y="398" width="440" height="590" rx="28" fill="${palette.cream}"/>
        <image href="data:image/jpeg;base64,${poster}" x="90" y="412" width="412" height="562" preserveAspectRatio="xMidYMid meet"/>
      </g>
      <text class="mono" x="570" y="438" fill="${palette.coral}" font-size="20">17 OUT · 20:00 · LISBOA</text>
      <text class="body" x="570" y="512" fill="${palette.cream}" font-size="29"><tspan x="570">@forthegloryhc</tspan><tspan x="570" dy="48">@ftlband</tspan><tspan x="570" dy="48">@sunny_slam</tspan></text>
      <text class="mono" x="570" y="710" fill="${palette.gold}" font-size="18">SALA</text>
      <text class="body" x="570" y="758" fill="${palette.cream}" font-size="27">@republica_da_musica</text>
      <text class="mono" x="570" y="833" fill="${palette.gold}" font-size="18">EVENTO DE</text>
      <text class="body" x="570" y="881" fill="${palette.cream}" font-size="29">@hellxis</text>
      <rect x="570" y="922" width="432" height="136" rx="26" fill="#263135" stroke="${palette.gold}" stroke-width="2"/>
      <text class="mono" x="604" y="968" fill="${palette.gold}" font-size="17">PARTICIPAÇÕES ATÉ</text>
      <text class="display" x="600" y="1029" fill="${palette.cream}" font-size="45" style="letter-spacing:-2px">11 OUT · 23:59</text>
      <image href="data:image/png;base64,${mascot("v2-04-vinil.png")}" x="742" y="1030" width="250" height="155" preserveAspectRatio="xMidYMid meet"/>
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

const storyDir = path.join(here, "stories");
fs.mkdirSync(storyDir, { recursive: true });

for (const [index, slide] of slides.entries()) {
  const input = path.join(here, `${slide.file}.png`);
  const backdrop = await sharp(input)
    .resize(1080, 1920, { fit: "cover" })
    .blur(34)
    .modulate({ brightness: 0.44, saturation: 0.62 })
    .png()
    .toBuffer();
  const card = await sharp(input)
    .resize(960, 1200, { fit: "fill" })
    .png()
    .toBuffer();
  const chrome = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920">
    ${styles}
    <text class="mono" x="60" y="170" fill="${palette.gold}" font-size="20">GIVEAWAY · 1 BILHETE</text>
    <text class="display" x="60" y="234" fill="${palette.cream}" font-size="46" style="letter-spacing:-2px">@ODESVIO.PT</text>
    <text class="mono" x="1020" y="203" text-anchor="end" fill="${palette.soft}" font-size="18">${String(index + 1).padStart(2, "0")} / 04</text>
    <text class="mono" x="60" y="1738" fill="${palette.gold}" font-size="19">17 OUT · LISBOA</text>
    <text class="body" x="60" y="1794" fill="${palette.cream}" font-size="30">Participa no post do feed.</text>
    <text class="mono" x="60" y="1848" fill="${palette.soft}" font-size="16">@FORTHEGLORYHC · @FTLBAND · @SUNNY_SLAM · @HELLXIS</text>
  </svg>`);
  await sharp(backdrop)
    .composite([
      { input: chrome, left: 0, top: 0 },
      { input: card, left: 60, top: 300 },
    ])
    .png()
    .toFile(path.join(storyDir, `${slide.file}-story.png`));
}

console.log("Rendered four For The Glory giveaway slides and Stories.");
