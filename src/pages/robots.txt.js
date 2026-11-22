// robots.txt, written when the site is built. Which crawlers it keeps out is set in Settings, under Pages.
import { loadSite } from "../lib/load.js";
import { robotsTxt } from "../lib/robots.js";

export function GET() {
  return new Response(robotsTxt(loadSite()), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
