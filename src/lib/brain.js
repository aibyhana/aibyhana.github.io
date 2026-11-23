// The second brain: reads the notes in brain/notes when the site is built and works out how they hang together.
// Which note links to which, which notes link back, which topics there are, and which notes are mentioned but not written yet.
// Like load.js, this needs Node. The pages are put together in brain-pages.js.
import fs from "node:fs";
import path from "node:path";
import { md } from "./markdown.js";

const ROOT = path.join(process.cwd(), "brain");
const HOME = "/brain/";

// "Spaced repetition" -> "spaced-repetition". Letters of any alphabet are kept.
export const slug = s => String(s).normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "") || "note";
// the id the formatter gives a heading, so a link can lead to a part of a note
const headingId = words => String(words).toLowerCase().replace(/[`*_=~\[\]()]/g, "").replace(/[^a-z0-9À-￿]+/g, "-").replace(/^-+|-+$/g, "") || "part";

// [[Note]], [[Note|other words]], [[Note#Heading]], and ![[picture.png]]
const LINK = () => /(!?)\[\[([^\]\n|#]+)(?:#([^\]\n|]+))?(?:\|([^\]\n]+))?\]\]/g;
// runs a change over the text of a note, but leaves code alone: a link written inside code is an example, not a link
function outsideCode(text, change) {
  let fence = false;
  return String(text).split("\n").map(line => {
    if (/^\s*(```|~~~)/.test(line)) { fence = !fence; return line; }
    if (fence) return line;
    return line.split(/(`[^`]*`)/).map((piece, i) => (i % 2 ? piece : change(piece))).join("");
  }).join("\n");
}
// the same text with the code taken out
function withoutCode(text) {
  let fence = false;
  return String(text).replace(/\r\n?/g, "\n").split("\n").map(line => {
    if (/^\s*(```|~~~)/.test(line)) { fence = !fence; return ""; }
    return fence ? "" : line.replace(/`[^`]*`/g, "");
  }).join("\n");
}
// a note as plain words, for search and for the line under a title
export function plain(text) {
  return withoutCode(text).replace(LINK(), (m, pic, to, part, words) => (pic ? "" : words || to))
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^\s{0,3}>\s*\[!\w+\].*$/gm, "").replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+\.)\s+/gm, "")
    .replace(/[*_~|=]/g, "").replace(/\s+/g, " ").trim();
}
const cut = (s, n) => (s.length <= n ? s : s.slice(0, n).replace(/\s+\S*$/, "") + "…");

// The lines between --- at the top of a file: "key: value", "key: [a, b]", or a key followed by "- item" lines.
export function front(text) {
  const lines = String(text || "").replace(/^﻿/, "").replace(/\r\n?/g, "\n").split("\n"), meta = {};
  if (lines[0].trim() !== "---") return { meta, body: lines.join("\n") };
  let i = 1, last = "";
  const bare = v => { v = v.trim(); return /^(".*"|'.*')$/.test(v) ? v.slice(1, -1) : v; };
  for (; i < lines.length && lines[i].trim() !== "---"; i++) {
    const item = /^\s*-\s+(.*)$/.exec(lines[i]), pair = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(lines[i]);
    if (item && last) { if (!Array.isArray(meta[last])) meta[last] = []; meta[last].push(bare(item[1])); }
    else if (pair) {
      last = pair[1];
      const v = pair[2].trim();
      meta[last] = /^\[.*\]$/.test(v) ? v.slice(1, -1).split(",").map(bare).filter(Boolean) : bare(v);
    }
  }
  return { meta, body: lines.slice(i + 1).join("\n").replace(/^\n+/, "") };
}
const listOf = v => (Array.isArray(v) ? v : String(v || "").split(",")).map(t => String(t).trim().replace(/^#/, "")).filter(Boolean);

// every Markdown file under brain/notes, whatever folder it is in. Folders that start with a dot are Obsidian's own.
function files(dir, found) {
  if (!fs.existsSync(dir)) return found;
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    if (f.name.startsWith(".")) continue;
    const at = path.join(dir, f.name);
    if (f.isDirectory()) files(at, found); else if (/\.md$/i.test(f.name)) found.push(at);
  }
  return found;
}

let kept = null;
// read fresh when a file has changed, so a note shows at once while the dev server runs
export function loadBrain() {
  const list = files(path.join(ROOT, "notes"), []).sort();
  const aboutFile = path.join(ROOT, "about.md"), hasAbout = fs.existsSync(aboutFile);
  const stamp = f => { const s = fs.statSync(f); return f + ":" + s.mtimeMs + ":" + s.size; };
  const key = list.map(stamp).join("|") + (hasAbout ? "|" + stamp(aboutFile) : "");
  if (kept && kept.key === key) return kept.brain;

  const notes = [], taken = new Set();
  for (const file of list) {
    const { meta, body } = front(fs.readFileSync(file, "utf8"));
    if (String(meta.draft) === "true") continue;
    const name = path.basename(file).replace(/\.md$/i, ""), id = slug(name);
    if (taken.has(id)) continue;                  // two files with one name: the first one stands
    taken.add(id);
    const day = /^\d{4}-\d{2}-\d{2}/.exec(String(meta.updated || meta.date || ""));
    const text = plain(body);
    notes.push({
      id, title: String(meta.title || name), href: HOME + "notes/" + id + "/",
      path: path.relative(process.cwd(), file).split(path.sep).join("/"),
      date: day ? day[0] : fs.statSync(file).mtime.toISOString().slice(0, 10),
      status: ["seed", "growing", "settled"].includes(meta.status) ? meta.status : "",
      tags: listOf(meta.tags), summary: String(meta.summary || "") || cut(text, 150), body, text,
      out: [], back: [],
    });
  }
  const byId = new Map(notes.map(n => [n.id, n]));

  // the links out of every note, and with them the links back
  const wanted = new Map();
  for (const n of notes) {
    const seen = new Set();
    for (const part of withoutCode(n.body).split(/\n\s*\n/)) {
      for (const m of part.matchAll(LINK())) {
        if (m[1]) continue;                       // a picture, not a link
        const name = m[2].trim(), id = slug(name), to = byId.get(id);
        if (!to) {
          const w = wanted.get(id) || { name, from: [] };
          if (!w.from.includes(n)) w.from.push(n);
          wanted.set(id, w);
          continue;
        }
        if (to === n || seen.has(id)) continue;
        seen.add(id);
        n.out.push(to);
        // the words around the link, so a link back says why it is there
        const words = plain(part), label = (m[4] || name).trim(), at = Math.max(0, words.indexOf(label));
        const from = Math.max(0, at - 90), piece = words.slice(from, at + label.length + 90);
        to.back.push({ note: n, words: (from > 0 ? "…" : "") + piece.trim() + (from + piece.length < words.length ? "…" : "") });
      }
    }
  }

  const topics = new Map();
  for (const n of notes) for (const t of n.tags) {
    const id = slug(t), topic = topics.get(id) || { id, name: t, href: HOME + "topics/" + id + "/", notes: [] };
    topic.notes.push(n);
    topics.set(id, topic);
  }
  const byName = [...notes].sort((a, b) => a.title.localeCompare(b.title));
  for (const t of topics.values()) t.notes.sort((a, b) => a.title.localeCompare(b.title));
  const about = hasAbout ? front(fs.readFileSync(aboutFile, "utf8")) : { meta: {}, body: "" };

  const brain = {
    notes, byId, byName,
    byDate: [...notes].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.title.localeCompare(b.title))),
    topics: [...topics.values()].sort((a, b) => b.notes.length - a.notes.length || a.name.localeCompare(b.name)),
    topicById: topics,
    loose: byName.filter(n => n.tags.length === 0),
    wanted: [...wanted.values()].sort((a, b) => b.from.length - a.from.length || a.name.localeCompare(b.name)),
    links: notes.reduce((sum, n) => sum + n.out.length, 0),
    intro: String(about.meta.intro || ""), about: about.body,
  };
  kept = { key, brain };
  return brain;
}

// what the map of notes needs: a dot for each note, a line for each link. With `around`, only that note and its neighbours.
export function graphOf(brain, around) {
  let notes = brain.notes;
  if (around) { const near = new Set([around, ...around.out, ...around.back.map(b => b.note)]); notes = notes.filter(n => near.has(n)); }
  const inside = new Set(notes);
  const degree = n => new Set([...n.out, ...n.back.map(b => b.note)]).size;
  return {
    me: around ? around.id : "",
    nodes: notes.map(n => ({ id: n.id, t: n.title, u: n.href, n: degree(n) })),
    links: notes.flatMap(n => n.out.filter(to => inside.has(to)).map(to => ({ s: n.id, t: to.id }))),
  };
}

// Markdown as HTML, with the list of its headings. The site's own formatter does the work, so a note looks like a post.
// Before it runs, the links between notes are turned into ordinary links. A note that is not written yet is marked,
// and the largest heading a note uses becomes the largest one on the page.
export function renderText(text, brain) {
  let body = String(text || "").replace(/\r\n?/g, "\n"), top = 9;
  outsideCode(body, piece => { const h = /^(#{1,6})\s/.exec(piece); if (h) top = Math.min(top, h[1].length); return piece; });
  if (top > 1 && top < 9) body = outsideCode(body, piece => piece.replace(/^#{1,6}(?=\s)/, h => h.slice(top - 1)));
  body = outsideCode(body, piece => piece.replace(LINK(), (m, pic, to, part, words) => {
    if (pic) return "![" + (words || "").replace(/[\[\]]/g, "") + "](" + HOME + "attachments/" + encodeURI(to.trim()) + ")";
    const note = brain.byId.get(slug(to)), label = (words || to).trim().replace(/[\[\]]/g, "");
    return note ? "[" + label + "](" + note.href + (part ? "#" + headingId(part.trim()) : "") + ")" : "\u0007" + label + "\u0007";
  }));
  const html = md(body).replace(/\u0007([^\u0007]*)\u0007/g, '<span class="sb-missing" title="Not written yet">$1</span>');
  const headings = [];
  html.replace(/<h([23]) id="([^"]+)"[^>]*>(.*?)<\/h\1>/g, (m, depth, id, inner) => { headings.push({ depth: Number(depth), id, text: inner.replace(/<[^>]+>/g, "") }); return m; });
  return { html, headings };
}
// a note as HTML. A first heading that only repeats the title is left out.
export const renderNote = (note, brain) =>
  renderText(note.body.replace(/^\s*#\s+(.+)\n/, (m, h) => (slug(h) === note.id || h.trim() === note.title ? "" : m)), brain);
