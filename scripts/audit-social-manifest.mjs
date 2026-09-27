#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const manifestPath = path.join(root, "social", "publishing-manifest.json");
const strictExternal = process.argv.includes("--strict-external");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const allowedStates = new Set(["draft", "approved", "scheduled", "published", "needs_replacement"]);
const failures = [];
const externalActions = [];
const seen = new Set();

function pngSize(file) {
  const header = fs.readFileSync(file).subarray(0, 24);
  if (header.length < 24 || header.toString("ascii", 1, 4) !== "PNG") return null;
  return { width: header.readUInt32BE(16), height: header.readUInt32BE(20) };
}

function checkFile(post, relative, expected, kind) {
  const file = path.join(root, relative);
  if (!fs.existsSync(file)) {
    failures.push({ post: post.id, issue: `missing_${kind}`, file: relative });
    return;
  }
  const size = pngSize(file);
  if (!size || size.width !== expected.width || size.height !== expected.height) {
    failures.push({ post: post.id, issue: `invalid_${kind}_dimensions`, file: relative, size, expected });
  }
}

for (const post of manifest.posts || []) {
  if (!post.id || seen.has(post.id)) failures.push({ post: post.id || "unknown", issue: "duplicate_or_missing_id" });
  seen.add(post.id);
  if (!allowedStates.has(post.state)) failures.push({ post: post.id, issue: "invalid_state" });
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00[+-]\d{2}:\d{2}$/.test(post.publishAt || "")) failures.push({ post: post.id, issue: "invalid_publish_at" });
  if (!Array.isArray(post.feed) || !post.feed.length) failures.push({ post: post.id, issue: "empty_feed" });
  if (!Array.isArray(post.stories) || post.stories.length !== post.feed.length) failures.push({ post: post.id, issue: "story_count_must_match_feed" });
  if (!post.caption || !fs.existsSync(path.join(root, post.caption)) || !fs.readFileSync(path.join(root, post.caption), "utf8").trim()) {
    failures.push({ post: post.id, issue: "missing_or_empty_caption", file: post.caption });
  }
  for (const file of post.feed || []) checkFile(post, file, { width: 1080, height: 1350 }, "feed");
  for (const story of post.stories || []) {
    checkFile(post, story.file, { width: 1080, height: 1920 }, "story");
    if (!/^https:\/\/odesvio\.pt\//.test(story.link || "")) failures.push({ post: post.id, issue: "invalid_story_link", file: story.file });
  }
  if (post.state === "scheduled" && !post.meta?.verifiedAt) externalActions.push({ post: post.id, issue: "scheduled_post_not_verified_in_planner" });
  if (post.state === "needs_replacement") externalActions.push({ post: post.id, issue: "replace_old_version_in_meta" });
}

const chronological = [...(manifest.posts || [])].sort((a, b) => a.publishAt.localeCompare(b.publishAt));
for (let index = 1; index < chronological.length; index += 1) {
  if (chronological[index].publishAt === chronological[index - 1].publishAt) {
    failures.push({ post: chronological[index].id, issue: "duplicate_publish_slot", other: chronological[index - 1].id });
  }
}

const report = { generatedAt: new Date().toISOString(), posts: seen.size, failures, externalActions };
fs.mkdirSync(path.join(root, "reports"), { recursive: true });
fs.writeFileSync(path.join(root, "reports", "social-manifest-audit.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ posts: report.posts, failures: failures.length, externalActions: externalActions.length, failureDetails: failures, externalActionDetails: externalActions }, null, 2));
if (failures.length || (strictExternal && externalActions.length)) process.exitCode = 1;
