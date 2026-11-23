// The pages of the second brain, as HTML. They use the same frame, lists and text styles as the rest of the site,
// so a note looks like a post and a list of notes like the list of posts.
// Every function takes the site object and the brain from brain.js, and returns a page for the layout.
import { esc, attr, niceDate } from "./html.js";
import { renderNote, renderText, graphOf, slug } from "./brain.js";

const HOME = "/brain/";
const STAGE = { seed: ["", "a first thought"], growing: [" reading", "still growing"], settled: [" read", "settled"] };
// how far along a note is: a ring, half a dot, a full dot. The same marks the reading list uses.
const stage = n => (STAGE[n.status] ? '<i class="s-dot' + STAGE[n.status][0] + '" title="' + attr(STAGE[n.status][1]) + '"></i>' : "");
const nameOf = SITE => SITE.words.brain || "Second brain";
const data = o => JSON.stringify(o).replace(/</g, "\\u003c");

/* ---------- pieces ---------- */
// a list of notes, set like the list of posts: the date with the topics under it, the title, a line about it
const rows = list => '<ol class="s-index s-log">' + list.map(n =>
  '<li><a href="' + attr(n.href) + '"><span class="s-when"><time datetime="' + attr(n.date) + '">' + niceDate(n.date) + "</time>" + (n.tags.length ? '<span class="s-k">' + esc(n.tags.join(", ")) + "</span>" : "") +
  '</span><span><b class="s-t">' + stage(n) + "<span>" + esc(n.title) + "</span></b>" + (n.summary ? '<span class="s-l">' + esc(n.summary) + "</span>" : "") + "</span></a></li>").join("") + "</ol>";
// the map of notes. The drawing is made in the browser from the list given here.
const graph = (B, size, label, around) => '<figure class="sb-graph ' + size + '" data-graph aria-label="' + attr(label) + '"><script type="application/json">' + data(graphOf(B, around)) + "</script></figure>";
const head = (title, more, href) => '<div class="s-head"><h2>' + esc(title) + "</h2>" + (more ? '<a href="' + attr(href) + '">' + esc(more) + "</a>" : "") + "</div>";
const commas = list => list.map(n => '<a href="' + attr(n.href) + '">' + esc(n.title) + "</a>").join('<span class="sb-dot"> · </span>');

// What stands in the column of links while you are in the second brain: a search box, its pages, and every topic with its notes.
// A topic is folded until you are in it: on its page, or on one of its notes.
function sub(B, at) {
  const link = (key, href, label, count) => '<li><a href="' + href + '"' + (at.page === key ? ' class="on" aria-current="page"' : "") + ">" + esc(label) + (count != null ? "<span>" + count + "</span>" : "") + "</a></li>";
  const groups = B.topics.map(t => ({ id: t.id, name: t.name, notes: t.notes })).concat(B.loose.length ? [{ id: "", name: "No topic yet", notes: B.loose }] : []);
  return '<div class="sb-nav" data-brain-nav>' +
    '<form class="sb-find" role="search" action="' + HOME + 'search/"><label class="s-sr" for="sb-q">Search the notes</label>' +
    '<input id="sb-q" name="q" type="search" autocomplete="off" spellcheck="false" placeholder="Search notes" data-src="' + HOME + 'search.json" data-all="' + HOME + 'search/">' +
    '<button type="button" class="sb-menu" id="sb-menu" aria-expanded="false" aria-controls="sb-links" hidden>Topics</button></form>' +
    '<div class="sb-found" id="sb-found" hidden></div>' +
    '<div class="sb-links" id="sb-links"><ul>' +
    link("home", HOME, "Overview") + link("notes", HOME + "notes/", "All notes", B.notes.length) + link("topics", HOME + "topics/", "Topics", B.topics.length) +
    link("graph", HOME + "graph/", "Graph") + link("about", HOME + "about/", "About") + "</ul>" +
    groups.map(g => "<details" + ((at.topic && at.topic === g.id) || g.notes.some(n => n.id === at.note) ? " open" : "") + "><summary>" + esc(g.name) + "<span>" + g.notes.length + "</span></summary><ul>" +
      g.notes.map(n => '<li><a href="' + attr(n.href) + '"' + (n.id === at.note ? ' class="on" aria-current="page"' : "") + ">" + esc(n.title) + "</a></li>").join("") + "</ul></details>").join("") +
    "</div></div>";
}
const page = (B, at, path, title, html, more) => Object.assign({ path, title, section: "brain", brain: true, sub: sub(B, at), html: '<section id="z-list" class="sb" data-brain>' + html + "</section>" }, more || {});
const lede = t => (t ? '<p class="z-lede">' + esc(t) + "</p>" : "");

/* ---------- the pages ---------- */
// the overview: what this is, the map, what changed last, the topics
export function brainHome(SITE, B) {
  const name = nameOf(SITE);
  return page(B, { page: "home" }, HOME, name,
    '<h1 tabindex="-1">' + esc(name) + "</h1>" + lede(B.intro) +
    (B.notes.length > 1 ? graph(B, "wide", "A map of how the notes link to each other") : "") +
    '<section class="s-sec">' + head("Changed last", B.notes.length ? "All " + B.notes.length + " notes" : "", HOME + "notes/") +
    (B.notes.length ? rows(B.byDate.slice(0, 8)) : "<p>No notes yet. Put a Markdown file in the folder brain/notes.</p>") + "</section>" +
    (B.topics.length ? '<section class="s-sec">' + head("Topics", "See all", HOME + "topics/") + '<p class="sb-topics">' +
      B.topics.map(t => '<a href="' + attr(t.href) + '">' + esc(t.name) + "<span>" + t.notes.length + "</span></a>").join("") + "</p></section>" : ""),
    { description: B.intro });
}

// every note from A to Z, like the index at the back of a book. Under it, what is mentioned but not written yet.
export function brainNotes(SITE, B) {
  const letters = new Map();
  for (const n of B.byName) {
    const first = (n.title.trim()[0] || "#").toUpperCase(), key = /\p{L}/u.test(first) ? first : "#";
    if (!letters.has(key)) letters.set(key, []);
    letters.get(key).push(n);
  }
  return page(B, { page: "notes" }, HOME + "notes/", "All notes",
    '<h1 tabindex="-1">All notes</h1>' + lede(B.notes.length + " notes, from A to Z.") +
    '<div class="sb-index">' + [...letters].map(([letter, list]) => "<section><h2>" + esc(letter) + "</h2><ul>" +
      list.map(n => '<li><a href="' + attr(n.href) + '">' + stage(n) + esc(n.title) + "</a></li>").join("") + "</ul></section>").join("") + "</div>" +
    '<p class="sb-key"><span><i class="s-dot"></i>A first thought</span><span><i class="s-dot reading"></i>Still growing</span><span><i class="s-dot read"></i>Settled</span></p>' +
    (B.wanted.length ? '<section class="s-sec">' + head("Not written yet") + '<p class="sb-note-line">Notes that others point to. A good place to start when there is time to write.</p><ul class="sb-wanted">' +
      B.wanted.map(w => '<li><span class="sb-missing">' + esc(w.name) + '</span><span>from ' + w.from.map(n => '<a href="' + attr(n.href) + '">' + esc(n.title) + "</a>").join(", ") + "</span></li>").join("") + "</ul></section>" : ""));
}

// one note. Beside it: its headings, the notes that link here with the words around the link, the notes it links to, and a small map.
export function brainNote(SITE, B, n) {
  const { html, headings } = renderNote(n, B), linked = n.back.length + n.out.length > 0;
  const edit = SITE.repo && n.path ? "https://github.com/" + SITE.repo + "/edit/main/" + n.path.split("/").map(encodeURIComponent).join("/") : "";
  const side = (headings.length > 1 ? '<details class="s-toc" open><summary>' + esc(SITE.words.contents || "Contents") + "</summary><ol>" +
      headings.map(h => "<li" + (h.depth === 3 ? ' class="s-sub"' : "") + '><button type="button" data-zdo="jump" data-id="' + attr(h.id) + '">' + h.text + "</button></li>").join("") + "</ol></details>" : "") +
    (n.back.length ? "<section><h2>Linked from</h2><ul>" + n.back.map(b => '<li><a href="' + attr(b.note.href) + '">' + esc(b.note.title) + "</a><span>" + esc(b.words) + "</span></li>").join("") + "</ul></section>" : "") +
    (n.out.length ? "<section><h2>Links to</h2><ul>" + n.out.map(o => '<li><a href="' + attr(o.href) + '">' + esc(o.title) + "</a></li>").join("") + "</ul></section>" : "") +
    (linked ? graph(B, "local", "A map of the notes around " + n.title, n) : "");
  return page(B, { page: "note", note: n.id }, n.href, n.title,
    '<article class="z-art sb-art"><h1 tabindex="-1">' + esc(n.title) + '</h1><p class="z-meta"><span><time datetime="' + attr(n.date) + '">' + niceDate(n.date) + "</time></span>" +
    (STAGE[n.status] ? "<span>" + stage(n) + esc(STAGE[n.status][1]) + "</span>" : "") +
    n.tags.map(t => '<span><a href="' + HOME + "topics/" + attr(slug(t)) + '/">#' + esc(t) + "</a></span>").join("") + "</p>" +
    '<div class="s-body">' + html + "</div>" +
    (edit ? '<p class="sb-end"><a href="' + attr(edit) + '">Edit this note on GitHub</a></p>' : "") +
    (side ? '<aside class="s-side sb-side" aria-label="About this note"><div>' + side + "</div></aside>" : "") + "</article>",
    { description: n.summary });
}

// every topic with the notes under it
export function brainTopics(SITE, B) {
  const row = (name, href, list) => "<div><dt>" + (href ? '<a href="' + attr(href) + '">' + esc(name) + "</a>" : esc(name)) + "<span>" + list.length + "</span></dt><dd>" + commas(list) + "</dd></div>";
  return page(B, { page: "topics" }, HOME + "topics/", "Topics",
    '<h1 tabindex="-1">Topics</h1>' + lede(B.topics.length + " topics. A note can stand under more than one.") +
    '<dl class="sb-by">' + B.topics.map(t => row(t.name, t.href, t.notes)).join("") + (B.loose.length ? row("No topic yet", "", B.loose) : "") + "</dl>");
}

// the notes of one topic
export function brainTopic(SITE, B, t) {
  const list = [...t.notes].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return page(B, { page: "topics", topic: t.id }, t.href, t.name,
    '<p class="z-crumb sb-up"><a href="' + HOME + 'topics/">Topics</a></p><h1 tabindex="-1">' + esc(t.name) + "</h1>" +
    lede(list.length + (list.length === 1 ? " note" : " notes") + ", the one changed last on top.") + rows(list));
}

// the whole map
export function brainGraph(SITE, B) {
  const alone = B.byName.filter(n => n.out.length + n.back.length === 0);
  return page(B, { page: "graph" }, HOME + "graph/", "Graph",
    '<h1 tabindex="-1">Graph</h1>' + lede("Each dot is a note. A line means one of the two links to the other, and a bigger dot has more links. Point at a dot to see its neighbours, click it to open the note.") +
    graph(B, "full", "A map of how the notes link to each other") +
    (alone.length ? '<p class="sb-note-line">Not linked to anything yet: ' + commas(alone) + ".</p>" : ""));
}

// search: the list of notes is fetched once, then every key press looks through it in the browser
export function brainSearch(SITE, B) {
  return page(B, { page: "search" }, HOME + "search/", "Search",
    '<h1 tabindex="-1">Search</h1><form class="sb-search" role="search" onsubmit="return false"><label class="s-sr" for="sb-big">Search the notes</label>' +
    '<input id="sb-big" type="search" autocomplete="off" spellcheck="false" placeholder="A word or two" data-src="' + HOME + 'search.json"></form>' +
    '<p class="sb-note-line" id="sb-count" aria-live="polite"></p><ol class="s-index s-log" id="sb-results"></ol>' +
    '<noscript><p class="sb-note-line">Search needs JavaScript. The <a href="' + HOME + 'notes/">list of all notes</a> works without it.</p></noscript>');
}
// what search looks through: the title, the topics and the words of every note
export const searchList = B => B.byName.map(n => ({ t: n.title, u: n.href, g: n.tags, d: niceDate(n.date), x: n.text }));

// about the second brain: a page of its own, written in brain/about.md. Links to notes work in it.
export function brainAbout(SITE, B) {
  let title = "About", text = B.about.replace(/^\s*#\s+(.+)\n/, (m, h) => { title = h.trim(); return ""; });
  return page(B, { page: "about" }, HOME + "about/", title,
    '<article class="z-art sb-art"><h1 tabindex="-1">' + esc(title) + "</h1>" +
    (text.trim() ? '<div class="s-body">' + renderText(text, B).html + "</div>" : "<p>Nothing here yet. Write this page in the file brain/about.md.</p>") + "</article>");
}
