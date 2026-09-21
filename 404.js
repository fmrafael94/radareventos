(() => {
  const storageKey = "desvio-404-deck-v1";
  const variants = {
    amplificador: {
      heading: "Puxaram-lhe a ficha.",
      body: "Este evento ficou sem corrente.",
      cta: "Voltar ao alinhamento",
      image: "/brand/404/amplificador-normalizado.png?v=1",
      alt: "Amplificador mascote com o cabo desligado"
    },
    vinil: {
      heading: "O disco saltou.",
      body: "Este evento saiu da faixa.",
      cta: "Voltar à agenda",
      image: "/brand/404/vinil-normalizado.png?v=1",
      alt: "Disco de vinil mascote à procura do beat"
    },
    carrinha: {
      heading: "A tour perdeu-se.",
      body: "Este evento fez um desvio a mais.",
      cta: "Traçar nova rota",
      image: "/brand/404/carrinha-normalizada.png?v=1",
      alt: "Carrinha de tour mascote num desvio"
    },
    bateria: {
      heading: "O beat foi ao bar.",
      body: "E levou este evento com ele.",
      cta: "Ver quem toca a seguir",
      image: "/brand/404/bateria-normalizada.png?v=1",
      alt: "Bateria mascote num palco vazio"
    },
    guitarra: {
      heading: "A corda deu o berro.",
      body: "Este evento saiu do tom.",
      cta: "Afinar nova procura",
      image: "/brand/404/guitarra-normalizada.png?v=1",
      alt: "Guitarra mascote com uma corda partida"
    }
  };
  const variantKeys = Object.keys(variants);

  function shuffledKeys(random = Math.random) {
    const keys = [...variantKeys];
    for (let index = keys.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(random() * (index + 1));
      [keys[index], keys[swapIndex]] = [keys[swapIndex], keys[index]];
    }
    return keys;
  }

  function nextVariantKey(storage, random = Math.random) {
    let state = {};
    try { state = JSON.parse(storage.getItem(storageKey) || "{}"); } catch { state = {}; }
    let remaining = Array.isArray(state.remaining)
      ? state.remaining.filter((key, index, values) => variantKeys.includes(key) && values.indexOf(key) === index)
      : [];

    if (!remaining.length) {
      remaining = shuffledKeys(random);
      if (state.last && remaining.length > 1 && remaining.at(-1) === state.last) {
        [remaining[0], remaining[remaining.length - 1]] = [remaining.at(-1), remaining[0]];
      }
    }

    const selected = remaining.pop();
    try { storage.setItem(storageKey, JSON.stringify({ remaining, last:selected })); } catch { /* session storage may be unavailable */ }
    return selected;
  }

  function renderVariant(key) {
    const variant = variants[key];
    if (!variant) return;
    const heading = document.querySelector(".copy h1");
    const body = document.querySelector(".copy .lede");
    const cta = document.querySelector("[data-error-cta]");
    const image = document.querySelector("figure img");
    if (heading) heading.textContent = variant.heading;
    if (body) body.textContent = variant.body;
    if (cta) cta.textContent = variant.cta;
    if (image) {
      image.src = variant.image;
      image.alt = variant.alt;
      image.dataset.variant = key;
    }
    document.title = `${variant.heading} — Desvio`;
    document.body.dataset.errorVariant = key;
  }

  window.DESVIO_404 = { variantKeys:[...variantKeys], nextVariantKey };
  let storage;
  try { storage = window.sessionStorage; } catch { storage = undefined; }
  const selected = nextVariantKey(storage);
  renderVariant(selected);
})();
