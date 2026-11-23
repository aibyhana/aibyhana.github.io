// What the search of the second brain looks through, written when the site is built.
import { loadBrain } from "../../lib/brain.js";
import { searchList } from "../../lib/brain-pages.js";

export function GET() {
  return new Response(JSON.stringify(searchList(loadBrain())), { headers: { "Content-Type": "application/json; charset=utf-8" } });
}
