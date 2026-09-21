const trackInteraction = (name, properties = {}) => {
  if (typeof window.zaraz?.track !== "function") return;
  Promise.resolve(window.zaraz.track(name, Object.fromEntries(Object.entries(properties).map(([key, value]) => [key, String(value).slice(0, 120)])))).catch(() => {});
};

document.addEventListener("click", event => {
  const eventLink = event.target.closest('a[href^="/evento/"]');
  if (!eventLink) return;
  trackInteraction("event_open", {
    event_id: decodeURIComponent(eventLink.pathname.split("/").pop() || ""),
    source: "landing",
    landing: location.pathname
  });
});
