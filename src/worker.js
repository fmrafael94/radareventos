import { onRequestGet as getConfig } from "../functions/api/config.js";
import { onRequestGet as getEvents } from "../functions/api/events.js";
import { onRequestPost as postFeedback } from "../functions/api/feedback.js";
import { onRequestGet as getAdminFeedback, onRequestPatch as patchAdminFeedback } from "../functions/api/admin/feedback.js";
import { onRequestGet as getAdminPoster } from "../functions/api/admin/poster.js";
import { reviewOfficialSources } from "../functions/automation/review-sources.js";

const contextFor = (request, env) => ({ request, env });

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    const context = contextFor(request, env);

    if (pathname === "/api/config" && request.method === "GET") return getConfig(context);
    if (pathname === "/api/events" && request.method === "GET") return getEvents(context);
    if (pathname === "/api/feedback" && request.method === "POST") return postFeedback(context);
    if (pathname === "/api/admin/feedback" && request.method === "GET") return getAdminFeedback(context);
    if (pathname === "/api/admin/feedback" && request.method === "PATCH") return patchAdminFeedback(context);
    if (pathname === "/api/admin/poster" && request.method === "GET") return getAdminPoster(context);

    return env.ASSETS.fetch(request);
  },

  async scheduled(controller, env, ctx) {
    // The same Cloudflare-run review is used for the two-hour rhythm and the
    // daily pass. It only records link reachability; publication remains a
    // human decision backed by an official source.
    const kind = controller.cron === "15 8 * * *" ? "daily_review" : "two_hour_review";
    ctx.waitUntil(reviewOfficialSources(env, kind));
  }
};
