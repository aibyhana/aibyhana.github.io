// The second brain: reads the notes when the site is built. Like load.js, this is the part that needs Node.
// The notes live with the rest of her words, in public/content/brain, so Settings can read and save them in the browser too.
// How the notes hang together is worked out in brain-core.js, and the pages are put together in brain-pages.js.
import fs from "node:fs";
import path from "node:path";
import { makeBrain, front, listOf, plain, linksOf } from "./brain-core.js";

export * from "./brain-core.js";

const PUBLIC = path.join(process.cwd(), "public");
const ROOT = path.join(PUBLIC, "content", "brain");

// every Markdown file under the notes folder, whatever folder it is in. Folders that start with a dot are Obsidian's own.
function files(dir, found) {
  if (!fs.existsSync(dir)) return found;
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    if (f.name.startsWith(".")) continue;
    const at = path.join(dir, f.name);
    if (f.isDirectory()) files(at, found); else if (/\.md$/i.test(f.name)) found.push(at);
  }
  return found;
}

// what Settings needs to know about every note file, the ones kept off the site too
export function listNotes() {
  return files(path.join(ROOT, "notes"), []).sort().map(f => {
    const got = front(fs.readFileSync(f, "utf8")), m = got.meta, day = /^\d{4}-\d{2}-\d{2}/.exec(String(m.updated || m.date || ""));
    return { path: path.relative(PUBLIC, f).split(path.sep).join("/"), title: String(m.title || path.basename(f).replace(/\.md$/i, "")), date: day ? day[0] : "", status: String(m.status || ""), tags: listOf(m.tags), draft: String(m.draft) === "true",
      words: plain(got.body).split(" ").filter(Boolean).length, links: linksOf(got.body) };
  });
}

let kept = null;
// read fresh when a file has changed, so a note shows at once while the dev server runs
export function loadBrain() {
  const list = files(path.join(ROOT, "notes"), []).sort();
  const aboutFile = path.join(ROOT, "about.md"), hasAbout = fs.existsSync(aboutFile);
  const stamp = f => { const s = fs.statSync(f); return f + ":" + s.mtimeMs + ":" + s.size; };
  const key = list.map(stamp).join("|") + (hasAbout ? "|" + stamp(aboutFile) : "");
  if (kept && kept.key === key) return kept.brain;
  // a path is written as the site serves it: content/brain/notes/Name.md
  const brain = makeBrain(
    list.map(f => ({ path: path.relative(PUBLIC, f).split(path.sep).join("/"), text: fs.readFileSync(f, "utf8"), day: fs.statSync(f).mtime.toISOString().slice(0, 10) })),
    hasAbout ? fs.readFileSync(aboutFile, "utf8") : "");
  kept = { key, brain };
  return brain;
}
