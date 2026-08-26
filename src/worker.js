import { onRequestGet as getConfig } from "../functions/api/config.js";
import { onRequestGet as getEvents } from "../functions/api/events.js";
import { onRequestPost as postFeedback } from "../functions/api/feedback.js";
import { onRequestGet as getAdminFeedback, onRequestPatch as patchAdminFeedback } from "../functions/api/admin/feedback.js";
import { onRequestGet as getAutomationReviews, onRequestPatch as patchAutomationReview } from "../functions/api/admin/automation-reviews.js";
import { onRequestGet as getAdminPoster } from "../functions/api/admin/poster.js";
import { onRequestPost as postAuditReport } from "../functions/api/internal/audit-report.js";

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
    if (pathname === "/api/admin/automation-reviews" && request.method === "GET") return getAutomationReviews(context);
    if (pathname === "/api/admin/automation-reviews" && request.method === "PATCH") return patchAutomationReview(context);
    if (pathname === "/api/admin/poster" && request.method === "GET") return getAdminPoster(context);
    if (pathname === "/api/internal/audit-report" && request.method === "POST") return postAuditReport(context);

    return env.ASSETS.fetch(request);
  },
};
