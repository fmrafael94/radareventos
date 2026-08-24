export function onRequestGet(context) {
  return Response.json(
    { turnstileSiteKey: context.env.TURNSTILE_SITEKEY || "" },
    { headers: { "Cache-Control": "no-store" } }
  );
}
