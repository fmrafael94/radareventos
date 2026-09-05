const text = (value, limit = 1000) => typeof value === "string" ? value.trim().slice(0, limit) : "";

export const validHttpUrl = value => {
  try {
    const url = new URL(text(value, 1600));
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
};

export const validIsoDate = value => /^\d{4}-\d{2}-\d{2}$/.test(text(value, 10));

// This is the single editorial gate for anything that enters the public
// catalogue. A ticket URL is useful but not always applicable (free entry,
// door sales, or tickets not yet announced); the ticket/entry information is
// mandatory in every case.
export function publicationChecklist(values = {}) {
  const ticketing = text(values.tickets, 220);
  return [
    { id: "title", label: "Título", present: Boolean(text(values.eventName || values.title, 180)) },
    { id: "date", label: "Data", present: validIsoDate(values.eventDate || values.date) },
    { id: "city", label: "Cidade / concelho", present: Boolean(text(values.city, 100)) },
    { id: "venue", label: "Local", present: Boolean(text(values.venue, 180)) },
    { id: "poster", label: "Cartaz oficial", present: Boolean(validHttpUrl(values.posterUrl || values.image)) },
    { id: "ticketing", label: "Bilheteira ou entrada", present: Boolean(ticketing) },
    { id: "source", label: "Página oficial direta", present: Boolean(validHttpUrl(values.officialUrl || values.sourceUrl)) }
  ];
}

export const publishingReady = values => publicationChecklist(values).every(item => item.present);

export function normaliseEventText(value) {
  return text(value, 300)
    .toLocaleLowerCase("pt-PT")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\b20\d{2}\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const normaliseUrl = value => {
  const safe = validHttpUrl(value);
  if (!safe) return "";
  const url = new URL(safe);
  url.hash = "";
  url.search = "";
  url.pathname = url.pathname.replace(/\/+$/, "") || "/";
  return url.href.toLocaleLowerCase();
};

// Two independent fields must agree. This avoids blocking different concerts
// that happen to share a promoter page or a generic ticketing page.
export function samePublishedEvent(left = {}, right = {}) {
  const title = normaliseEventText(left.eventName || left.title);
  const candidateTitle = normaliseEventText(right.eventName || right.title);
  const date = text(left.eventDate || left.date, 10);
  const candidateDate = text(right.eventDate || right.date, 10);
  if (!title || !candidateTitle || !date || date !== candidateDate) return false;
  const city = normaliseEventText(left.city);
  const candidateCity = normaliseEventText(right.city);
  const venue = normaliseEventText(left.venue);
  const candidateVenue = normaliseEventText(right.venue);
  const sameTitle = title === candidateTitle;
  const samePlace = city && city === candidateCity && venue && venue === candidateVenue;
  const source = normaliseUrl(left.officialUrl || left.sourceUrl);
  const candidateSource = normaliseUrl(right.officialUrl || right.sourceUrl);
  return (sameTitle && samePlace) || (sameTitle && source && source === candidateSource);
}

export function reviewValuesFrom(value = {}, fallback = {}) {
  return {
    eventName: text(value.eventName || value.title || fallback.event_name, 180),
    eventDate: text(value.eventDate || value.date || fallback.event_date, 10),
    eventEndDate: text(value.eventEndDate || value.endDate, 10),
    city: text(value.city || fallback.city, 100),
    venue: text(value.venue, 180),
    tickets: text(value.tickets, 220),
    ticketUrl: validHttpUrl(value.ticketUrl),
    posterUrl: validHttpUrl(value.posterUrl || fallback.poster_url),
    officialUrl: validHttpUrl(value.officialUrl || fallback.official_url)
  };
}
