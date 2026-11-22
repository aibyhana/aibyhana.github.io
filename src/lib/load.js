// Reads the content files when the site is built. This is the only file here that needs Node.
import fs from "node:fs";
import path from "node:path";
import { makeSite } from "./model.js";

// her words live in public/content, so the same files are served to Settings in the browser
const ROOT = path.join(process.cwd(), "public", "content");
const json = (name, fallback) => {
  const file = path.join(ROOT, name);
  if (!fs.existsSync(file)) { if (fallback !== undefined) return fallback; throw new Error("The content file " + name + " is missing from public/content."); }
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch (e) { throw new Error("public/content/" + name + " is not valid JSON: " + e.message); }
};

// read fresh each time, so a change shows at once while the dev server runs
export function loadSite() {
  const dir = path.join(ROOT, "posts");
  const posts = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => /\.md$/.test(f)).sort().map(f => ({ id: f.replace(/\.md$/, ""), text: fs.readFileSync(path.join(dir, f), "utf8") })) : [];
  return makeSite({ site: json("site.json"), now: json("now.json", {}), research: json("research.json", []), books: json("books.json", {}), programs: json("programs.json", []),
    cv: json("cv.json", {}), bookmarks: json("bookmarks.json", {}), posts: posts });
}
