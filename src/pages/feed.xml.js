// The RSS feed, written when the site is built.
import { loadSite } from "../lib/load.js";
import { feedXml } from "../lib/feed.js";

export function GET() {
  const SITE = loadSite();
  return new Response(feedXml(SITE, String(SITE.url || "https://aibyhana.github.io").replace(/\/$/, "")), { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}
