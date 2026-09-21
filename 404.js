(() => {
  const storageKey = "desvio-404-deck-v1";
  const variants = {
    amplificador: {
      heading: "A banda saiu do palco.",
      body: "Este evento já não está na agenda. O cabo ficou, mas o concerto não.",
      cta: "Voltar ao alinhamento",
      image: "/brand/404/amplificador.png?v=3",
      alt: "Amplificador mascote com o cabo desligado"
    },
    vinil: {
      heading: "Perdemos o beat.",
      body: "Este evento saltou da playlist. Vamos pôr outra coisa a tocar.",
      cta: "Voltar à agenda",
      image: "/brand/404/vinil.png?v=3",
      alt: "Disco de vinil mascote à procura do beat"
    },
    carrinha: {
      heading: "O evento foi de tournée.",
      body: "Virou na saída errada e já não mora aqui.",
      cta: "Traçar nova rota",
      image: "/brand/404/carrinha.png?v=3",
      alt: "Carrinha de tournée mascote num desvio"
    },
    bateria: {
      heading: "Silêncio no alinhamento.",
      body: "O palco ficou vazio. A agenda, felizmente, não.",
      cta: "Ver quem toca a seguir",
      image: "/brand/404/bateria.png?v=3",
      alt: "Bateria mascote num palco vazio"
    },
    guitarra: {
      heading: "Este riff ficou por tocar.",
      body: "A corda partiu e o evento saiu do alinhamento. Há mais música logo a seguir.",
      cta: "Afinar nova procura",
      image: "/brand/404/guitarra.png?v=3",
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
