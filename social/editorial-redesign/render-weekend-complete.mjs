import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const sharp = require("sharp");
const here = path.dirname(new URL(import.meta.url).pathname);
const root = path.resolve(here, "../..");
const out = path.join(here, "weekend-complete-proposal");

const c = {
  ink: "#182226",
  inkSoft: "#263135",
  cream: "#f7f5f0",
  gold: "#b7a45a",
  coral: "#e35e44",
  muted: "#bec6c3",
  mutedLight: "#5b676a",
};

const styles = `<style>
  .display { font-family: Arial, Helvetica, sans-serif; font-weight: 800; letter-spacing: -4px; }
  .strong { font-family: Arial, Helvetica, sans-serif; font-weight: 800; }
  .body { font-family: Arial, Helvetica, sans-serif; font-weight: 500; }
  .mono { font-family: Menlo, Monaco, monospace; font-weight: 700; letter-spacing: 1.9px; }
</style>`;

const data = (file, mime) => `data:${mime};base64,${fs.readFileSync(file).toString("base64")}`;
const pngData = async file => `data:image/png;base64,${(await sharp(file).png().toBuffer()).toString("base64")}`;

const assets = {
  van: data(path.join(root, "brand/mascots-happy/carrinha-feliz.png"), "image/png"),
  amp: data(path.join(root, "brand/mascots-happy/amplificador-feliz.png"), "image/png"),
  guitar: data(path.join(root, "brand/mascots-happy/guitarra-feliz.png"), "image/png"),
  microphone: data(path.join(root, "social/giveaway/2026-10-for-the-glory/mascots/v2-03-microfone.png"), "image/png"),
  forTheGlory: data(path.join(root, "social/giveaway/2026-10-for-the-glory/for-the-glory-official-poster.jpg"), "image/jpeg"),
  blackBox: data(path.join(here, "black-box-instagram.jpg"), "image/jpeg"),
  purgatory: await pngData(path.join(here, "purgatory-official.webp")),
};

function logo(dark = true) {
  return `<g transform="translate(64 50)">
    <g transform="scale(.42)" fill="none" stroke="${c.gold}" stroke-linecap="round">
      <path d="M93 31a45 45 0 1 0 13 31" stroke-width="7"/><path d="M87 42a33 33 0 1 0 9 23" stroke-width="6"/><path d="M81 52a21 21 0 1 0 6 15" stroke-width="5"/><path d="M94 20v25c0 10-6 15-15 19" stroke-width="10"/>
    </g>
    <circle cx="26.8" cy="28.5" r="5.3" fill="${c.gold}"/><circle cx="26.8" cy="28.5" r="2" fill="${c.coral}"/>
    <text x="62" y="37" fill="${dark ? c.cream : c.ink}" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="800" letter-spacing="-1">O DESVIO</text>
  </g>`;
}

function footer(dark, index) {
  return `<text class="mono" x="64" y="1300" fill="${dark ? c.cream : c.ink}" font-size="18">ODESVIO.PT</text>
    <text class="mono" x="1016" y="1300" text-anchor="end" fill="${c.gold}" font-size="18">${String(index).padStart(2, "0")} / 04</text>`;
}

function svg(background, body, index) {
  const dark = background === c.ink;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350">${styles}<rect width="1080" height="1350" fill="${background}"/><rect width="1080" height="15" fill="${index === 1 ? c.gold : c.coral}"/>${logo(dark)}${body}${footer(dark, index)}</svg>`;
}

const slides = [
  svg(c.ink, `
    <text class="mono" x="64" y="190" fill="${c.gold}" font-size="20">16–18 OUT · DE GUIMARÃES A LISBOA</text>
    <text class="display" x="64" y="310" fill="${c.cream}" font-size="92"><tspan x="64">O fim de semana</tspan><tspan x="64" dy="94">pede volume.</tspan></text>
    <text class="body" x="68" y="548" fill="${c.muted}" font-size="29"><tspan x="68">Três cartazes oficiais.</tspan><tspan x="68" dy="41">Três desvios para escolher.</tspan></text>
    <line x1="64" y1="660" x2="1016" y2="660" stroke="${c.gold}" stroke-width="2"/>
    <text class="mono" x="64" y="710" fill="${c.coral}" font-size="18">GUIMARÃES · LISBOA · ALMADA</text>
    <image href="${assets.van}" x="116" y="690" width="850" height="500" preserveAspectRatio="xMidYMid meet"/>
  `, 1),

  svg(c.cream, `
    <text class="mono" x="64" y="183" fill="${c.gold}" font-size="19">17 OUT · LISBOA</text>
    <text class="display" x="64" y="255" fill="${c.ink}" font-size="60">O regresso pede coro.</text>
    <rect x="510" y="300" width="506" height="642" rx="26" fill="${c.ink}"/>
    <image href="${assets.forTheGlory}" x="526" y="316" width="474" height="610" preserveAspectRatio="xMidYMid meet"/>
    <rect x="792" y="257" width="224" height="45" rx="22" fill="${c.coral}"/>
    <text class="mono" x="904" y="285" text-anchor="middle" fill="${c.cream}" font-size="15">CARTAZ OFICIAL</text>
    <image href="${assets.microphone}" x="18" y="500" width="462" height="462" preserveAspectRatio="xMidYMid meet"/>
    <rect x="64" y="1005" width="952" height="204" rx="26" fill="${c.ink}"/>
    <text class="strong" x="94" y="1060" fill="${c.cream}" font-size="34">For The Glory · Fear The Lord · Sunny Slam</text>
    <text class="body" x="94" y="1110" fill="${c.muted}" font-size="24">RCA Club — República da Música · 20h00</text>
    <text class="mono" x="94" y="1166" fill="${c.gold}" font-size="17">EVENTO DE @HELLXIS</text>
  `, 2),

  svg(c.ink, `
    <text class="mono" x="64" y="183" fill="${c.gold}" font-size="19">16–17 OUT · GUIMARÃES</text>
    <text class="display" x="64" y="255" fill="${c.cream}" font-size="60">Dois dias dentro da caixa.</text>
    <rect x="64" y="305" width="660" height="660" rx="26" fill="#061c25" stroke="#3d5057" stroke-width="2"/>
    <image href="${assets.blackBox}" x="80" y="321" width="628" height="628" preserveAspectRatio="xMidYMid meet"/>
    <rect x="64" y="260" width="224" height="45" rx="22" fill="${c.coral}"/>
    <text class="mono" x="176" y="288" text-anchor="middle" fill="${c.cream}" font-size="15">CARTAZ OFICIAL</text>
    <image href="${assets.amp}" x="706" y="505" width="355" height="410" preserveAspectRatio="xMidYMid meet"/>
    <rect x="64" y="1015" width="952" height="194" rx="26" fill="${c.inkSoft}" stroke="#465458"/>
    <text class="strong" x="94" y="1070" fill="${c.cream}" font-size="36">Black Box Fest 2026</text>
    <text class="body" x="94" y="1118" fill="${c.muted}" font-size="24">Sede dos Trovadores do Cano · Guimarães</text>
    <text class="mono" x="94" y="1172" fill="${c.gold}" font-size="17">EVENTO DE @BLACKBOXFEST</text>
  `, 3),

  svg(c.cream, `
    <text class="mono" x="64" y="183" fill="${c.gold}" font-size="19">16–17 OUT · ALMADA</text>
    <text class="display" x="64" y="255" fill="${c.ink}" font-size="60">Do purgatório sai-se a pé.</text>
    <rect x="420" y="300" width="596" height="748" rx="26" fill="${c.ink}"/>
    <image href="${assets.purgatory}" x="438" y="318" width="560" height="700" preserveAspectRatio="xMidYMid meet"/>
    <rect x="792" y="257" width="224" height="45" rx="22" fill="${c.coral}"/>
    <text class="mono" x="904" y="285" text-anchor="middle" fill="${c.cream}" font-size="15">CARTAZ OFICIAL</text>
    <image href="${assets.guitar}" x="12" y="515" width="390" height="490" preserveAspectRatio="xMidYMid meet"/>
    <rect x="64" y="1080" width="952" height="155" rx="26" fill="${c.ink}"/>
    <text class="strong" x="94" y="1134" fill="${c.cream}" font-size="36">Purgatory Fest 2026</text>
    <text class="body" x="94" y="1181" fill="${c.muted}" font-size="24">Hollywood Spot · Feijó, Almada</text>
    <text class="mono" x="987" y="1180" text-anchor="end" fill="${c.gold}" font-size="16">EVENTO DE @PURGATORYMETALFEST</text>
  `, 4),
];

fs.mkdirSync(out, { recursive: true });
for (const [index, slide] of slides.entries()) {
  const base = `odesvio-fim-de-semana-proposta-${String(index + 1).padStart(2, "0")}`;
  fs.writeFileSync(path.join(out, `${base}.svg`), slide);
  await sharp(Buffer.from(slide)).png().toFile(path.join(out, `${base}.png`));
}

const thumbs = await Promise.all(slides.map(async (_, index) => ({
  input: await sharp(path.join(out, `odesvio-fim-de-semana-proposta-${String(index + 1).padStart(2, "0")}.png`)).resize(540, 675).png().toBuffer(),
  left: (index % 2) * 540,
  top: Math.floor(index / 2) * 675,
})));

await sharp({ create: { width: 1080, height: 1350, channels: 4, background: c.ink } })
  .composite(thumbs)
  .png()
  .toFile(path.join(out, "odesvio-fim-de-semana-proposta-contact-sheet.png"));

fs.writeFileSync(path.join(out, "caption.txt"), `O fim de semana pede volume — e estes três cartazes merecem sair do ecrã.\n\n16–17 OUT · Black Box Fest 2026 · Sede dos Trovadores do Cano · Guimarães · evento de @blackboxfest\n16–17 OUT · Purgatory Fest 2026 · Hollywood Spot · Feijó, Almada · evento de @purgatorymetalfest\n17 OUT · @forthegloryhc + @ftlband + @sunny_slam · @republica_da_musica · Lisboa · evento de @hellxis\n\nDesliza para veres os cartazes oficiais, guarda o post e confirma horários, bilhetes e fontes em odesvio.pt.\n\nMenos procura. Mais música.\n\n#odesvio #concertosportugal #fimdesemana #musicaaovivo #hardcore #metal`);

console.log(`Weekend proposal rendered in ${out}`);
