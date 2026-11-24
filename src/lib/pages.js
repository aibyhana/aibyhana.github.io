// The pages of the site, as HTML. Every function here takes the site object from model.js and returns text.
// Nothing here touches files or the browser, so the same code builds the site and draws previews.
import { esc, attr, niceDate, stop, safeUrl, hostOf, playerOf } from "./html.js";
import { FIG } from "./figures.js";
import { PX, px } from "./pixel.js";
import { md, setup } from "./markdown.js";
import { link, imgSrc } from "./model.js";
import { tagPills } from "./brain-core.js";

const MAILTO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const nice = t => String(t || "").replace(/'/g, "’");
// [words](link) inside a sentence becomes a link
const rich = s => esc(s).replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, words, href) => '<a href="' + link(href) + '">' + words + "</a>");
const linkHtml = l => '<a href="' + attr(link(l.href)) + '">' + esc(l.label) + "</a>";
const shown = (SITE, k) => SITE.home.some(h => h.key === k && h.show !== false);
const of = (SITE, k) => SITE.postings.filter(p => p.kind === k);
const PATH = { research: "/research/", blog: "/blog/", brain: "/brain/", garden: "/garden/", bookmarks: "/bookmarks/", about: "/about/", cv: "/cv/", contact: "/contact/" };

// the formatter needs to know where pictures and links lead, and the word on the copy button
export function prepare(SITE) { setup({ img: imgSrc, link: link, copy: SITE.words.copy || "Copy" }); }

/* ---------- pieces that several pages share ---------- */
const sTitle = t => '<b class="s-t"><span>' + esc(t) + "</span></b>";
// the picture on a project: its drawing, or a small pixel mark when it has none
const plateArt = p => { const it = p.item || {}; return FIG[it.fig] ? FIG[it.fig]() : (PX.research ? px("research", 5) : ""); };
// research: a plate for each project
const sCards = list => { const n = list.length; return '<ol class="s-index s-grid m' + n % 3 + (n % 2 ? " odd" : "") + '">' + list.map(p => '<li><a class="s-card" href="' + attr(p.href) + '"><span class="s-fig fig">' + plateArt(p) + "</span>" + sTitle(p.title) + (p.line ? '<span class="s-l">' + esc(p.line) + "</span>" : "") + (p.meta ? '<span class="s-m">' + esc(p.meta) + "</span>" : "") + "</a></li>").join("") + "</ol>"; };
// a post in a list: the date, with the topic under it
const sLog = list => '<ol class="s-index s-log">' + list.map(p => '<li data-kind="' + attr(p.topic || "") + '"><a href="' + attr(p.href) + '"><span class="s-when"><time>' + (p.date ? niceDate(p.date) : "") + "</time>" + (p.topic ? '<span class="s-k">' + esc(p.topic) + "</span>" : "") + "</span><span>" + sTitle(p.title) + (p.line ? '<span class="s-l">' + esc(p.line) + "</span>" : "") + "</span></a></li>").join("") + "</ol>";
// the line that stays on top of a text: back to its list on the left, home on the right
const backStrip = (SITE, to, text) => '<p class="z-crumb back-to"><a href="' + attr(to) + '">' + esc(text) + '</a><a class="s-home" href="/">' + esc(SITE.words.brand || SITE.name) + "</a></p>";
const lede = (SITE, key) => SITE.sections[key] ? '<p class="z-lede">' + esc(nice(SITE.sections[key])) + "</p>" : "";
// a row of buttons that filters the list right after it
const chips = (SITE, kinds) => '<p class="b-kinds">' + [""].concat(kinds).map((k, i) => '<button type="button" data-zdo="kind" data-kind="' + attr(k) + '" aria-pressed="' + (i ? "false" : "true") + '"' + (i ? "" : ' class="on"') + ">" + esc(k || SITE.words.allKinds || "All") + "</button>").join("") + "</p>";

/* ---------- the name, the links, the footer ---------- */
// sub is what a part of the site adds under the links while you are in it. The second brain puts its search box and its topics there.
export function navHtml(SITE, section, sub) {
  const W = SITE.words;
  const pages = SITE.home.filter(h => h.show !== false && ["research", "blog", "brain", "garden", "bookmarks", "about", "cv"].indexOf(h.key) >= 0 && (h.key !== "bookmarks" || SITE.bookmarks.length > 0));
  const one = (key, href, label, small) => "<a" + (small || key === section ? ' class="' + [small ? "s2" : "", key === section ? "on" : ""].filter(Boolean).join(" ") + '"' : "") + ' href="' + href + '" data-z="' + key + '"' + (key === section ? ' aria-current="page"' : "") + ">" + esc(label || "") + "</a>";
  // her work first, then the pages about her. The small line between the two only stands when there is something on both sides.
  const work = pages.filter(h => ["about", "cv"].indexOf(h.key) < 0).map(h => one(h.key, PATH[h.key], W[h.key])).join("");
  const her = pages.filter(h => ["about", "cv"].indexOf(h.key) >= 0).map(h => one(h.key, PATH[h.key], W[h.key], true)).join("") +
    (shown(SITE, "hello") && W.contact ? one("contact", PATH.contact, W.contact, true) : "");
  return '<a class="s-name" href="/">' + esc(W.brand || SITE.name) + "</a><nav>" + work + (work && her ? '<i class="s-gap"></i>' : "") + her + "</nav>" + (sub || "");
}
export function footHtml(SITE, year) {
  const W = SITE.words;
  return '<div class="perch" id="sill" aria-hidden="true"></div>' +
    '<button class="bot" id="bot" type="button" title="This one lets you switch it off" aria-label="A small robot. Click it to switch it off or on."><span class="bot-says" id="bot-says" aria-hidden="true"></span><span id="bot-body"></span></button>' +
    '<p id="colophon">' + esc(String(W.copyright || "").replace("{year}", year).replace("{name}", SITE.name)) + "</p>" +
    '<div class="inks" id="inks" role="group" aria-label="Ink colour"></div>' +
    '<div id="z-foot">' + (SITE.look.inkPicker === false ? "" : (SITE.inks.length > 1 ? "<label>" + esc(W.colour || "Colour") + ' <select id="z-ink">' + SITE.inks.map((k, i) => '<option value="' + i + '">' + esc(k.name) + "</option>").join("") + "</select></label>" : "") + '<button type="button" data-zdo="flip">' + esc(W.flip || "Flip") + "</button>") + "</div>";
}
/* ---------- the pages ---------- */
// The home page: one line on who she is, her latest projects, then her latest posts beside the notes she last worked on.
// brain is the second brain, as brain.js reads it. Without it, in a preview, that part is left out.
export function homePage(SITE, brain) {
  const W = SITE.words;
  const head = (k, href) => '<div class="s-head k-' + k + '"><h2>' + esc(W[k] || "") + '</h2><a href="' + href + '">' + esc(W.all || "See all") + '<span class="s-sr"> ' + esc(W[k] || "") + "</span></a></div>";
  const MARK = { seed: "", growing: " reading", settled: " read" };
  let html = '<h1 class="s-sr">' + esc(SITE.name) + "</h1>" + (SITE.what ? '<p class="h-what">' + esc(nice(SITE.what)) + "</p>" : "");
  if (shown(SITE, "research") && of(SITE, "research").length) html += '<section class="s-sec">' + head("research", PATH.research) + sCards(of(SITE, "research").slice(0, 3)) + "</section>";
  let left = "", right = "";
  if (shown(SITE, "blog") && of(SITE, "blog").length) left = '<section class="s-sec">' + head("blog", PATH.blog) + sLog(of(SITE, "blog").slice(0, 4)) + "</section>";
  // the notes she changed last: the day, the mark that says how far along the note is, its title, its topics
  if (shown(SITE, "brain") && brain && brain.notes.length) right = '<section class="s-sec sb">' + head("brain", PATH.brain) + '<ol class="s-index s-log sb-rows sb-stack">' + brain.byDate.slice(0, 5).map(n =>
    '<li><a href="' + attr(n.href) + '"><span class="s-when"><time datetime="' + attr(n.date) + '">' + (n.date ? niceDate(n.date) : "") + '</time></span><span><b class="s-t">' + (n.status in MARK ? '<i class="s-dot' + MARK[n.status] + '"></i>' : "") + "<span>" + esc(n.title) + "</span></b></span></a>" + tagPills(n) + "</li>").join("") + "</ol></section>";
  if (left && right) html += '<div class="s-two"><div>' + left + "</div><div>" + right + "</div></div>"; else html += left + right;
  return { path: "/", title: SITE.title || SITE.name, section: "", home: true, html: '<section id="z-home">' + html + "</section>" };
}

// a page that lists things: Research, Blog
export function listPage(SITE, kind) {
  const W = SITE.words, list = of(SITE, kind), none = "<p>" + esc(W.nothingYet) + "</p>";
  let body;
  if (kind === "research") body = list.length ? sCards(list) : none;
  else {
    // the topics that have a post, hers first and in her order
    const have = [], pub = SITE.published;
    SITE.topics.forEach(t => { if (pub.some(p => p.topic === t) && have.indexOf(t) < 0) have.push(t); });
    pub.forEach(p => { if (p.topic && have.indexOf(p.topic) < 0) have.push(p.topic); });
    body = (have.length > 1 || (have.length === 1 && pub.some(p => p.topic !== have[0])) ? chips(SITE, have) : "") + (list.length ? sLog(list) : none) +
      (SITE.drafts.length ? "<h2>" + esc(W.halfWritten) + '</h2><ul class="z-drafts">' + SITE.drafts.map(p => "<li><strong>" + esc(stop(p.title)) + "</strong> " + esc(p.teaser) + "</li>").join("") + "</ul>" : "");
  }
  return { path: PATH[kind], title: W[kind + "Title"] || W[kind], section: kind,
    html: '<section id="z-list"><h1 tabindex="-1">' + esc(W[kind + "Title"]) + "</h1>" + lede(SITE, kind) + body + "</section>" };
}

// one project, alone on its page
export function postingPage(SITE, it) {
  const W = SITE.words, kind = it.kind, p = it.item || {};
  const same = of(SITE, kind), i = same.indexOf(it), a = same[i - 1], b = same[i + 1];
  const body = (FIG[p.fig] ? '<figure class="z-fig fig">' + FIG[p.fig]() + (p.caption ? "<figcaption>" + esc(p.caption) + "</figcaption>" : "") + "</figure>" : "") + '<div class="s-body">' + md((p.text || []).join("\n\n")) + "</div>" +
    ((p.facts || []).length ? '<dl class="z-facts">' + p.facts.map(f => "<div><dt>" + esc(f[0]) + "</dt><dd>" + rich(f[1]) + "</dd></div>").join("") + "</dl>" : "");
  const meta = [it.meta, it.date ? niceDate(it.date) : ""].filter(x => x && String(x).trim()).map(x => "<span>" + esc(String(x).trim()) + "</span>").join("");
  return { path: it.href, title: it.title, section: kind, reading: true, description: it.line,
    html: '<section id="z-list">' + backStrip(SITE, PATH[kind], W[kind]) + '<article class="z-art"><h1 tabindex="-1">' + esc(it.title) + "</h1>" + (it.line ? '<p class="s-lede">' + esc(it.line) + "</p>" : "") + '<p class="z-meta">' + meta + "</p>" + body + "</article>" +
      (a || b ? '<nav class="z-next">' + (a ? '<a href="' + attr(a.href) + '"><em>' + esc(W.prevPost) + "</em>" + esc(a.title) + "</a>" : "<span></span>") + (b ? '<a href="' + attr(b.href) + '"><em>' + esc(W.nextPost) + "</em>" + esc(b.title) + "</a>" : "") + "</nav>" : "") + "</section>" };
}

// one post, alone on its page
export function postPage(SITE, post) {
  const W = SITE.words, pub = SITE.published, k = pub.indexOf(post), newer = pub[k - 1], older = pub[k + 1];
  return { path: "/blog/" + post.id + "/", title: post.title, section: "blog", reading: true, view: true, description: post.teaser || "",
    html: '<section class="view" id="view-blog"><div id="blog-root"><article class="reader">' + backStrip(SITE, PATH.blog, W.back) + '<h1 tabindex="-1">' + esc(post.title) + '</h1><p class="meta"><span>' + niceDate(post.date) + "</span>" + (post.topic ? '<span class="s-topic">' + esc(post.topic) + "</span>" : "") + '</p><div class="body" id="post-body">' + md(post.body) + "</div>" +
      (older || newer ? '<p class="pager">' + (older ? '<a href="/blog/' + attr(older.id) + '/">' + esc(W.older) + " " + esc(older.title) + "</a>" : "<span></span>") + (newer ? '<a href="/blog/' + attr(newer.id) + '/">' + esc(W.newer) + " " + esc(newer.title) + "</a>" : "") + "</p>" : "") + "</article></div></section>" };
}

// about me: her description, her photo and her links, and what she is doing these days
export function aboutPage(SITE) {
  const W = SITE.words, top = '<h1 tabindex="-1">' + esc(W.aboutTitle || W.about || "") + "</h1>" + lede(SITE, "about");
  const src = SITE.photo && (SITE.look || {}).side !== "none" ? imgSrc(safeUrl(SITE.photo)) : "", nick = SITE.blueLine && SITE.blueLine.plain ? String(SITE.blueLine.plain) : "";
  const bio = SITE.intro.map(t => String(t || "").replace(/\s*\{blue\}/, "")).filter(Boolean);
  const links = SITE.links.map(linkHtml).join("") + (shown(SITE, "cv") ? '<a href="/cv/">' + esc(W.cv) + "</a>" : "") + (shown(SITE, "hello") && W.contact ? '<a href="/contact/">' + esc(W.contact) + "</a>" : "");
  const nowOn = shown(SITE, "now") && (SITE.now.length > 0 || !!W.rightNow);
  const now = nowOn ? '<section class="a-now" id="now"><h2 class="a-h" tabindex="-1">' + esc(W.now || "Now") + '</h2><dl class="n-list">' + SITE.now.map(n => "<div><dt>" + esc(n[0]) + "</dt><dd>" + rich(nice(n[1])) + "</dd></div>").join("") +
    (W.rightNow ? "<div><dt>" + esc(W.rightNow) + "</dt><dd data-clock>" + esc(SITE.clock.place) + "</dd></div>" : "") + "</dl>" +
    (SITE.updated ? '<p class="n-updated">' + esc(String(W.updated).replace("{month}", SITE.updated)) + "</p>" : "") + "</section>" : "";
  return { path: "/about/", title: W.aboutTitle || W.about, section: "about",
    html: '<section id="z-list">' + top + '<div class="a-page' + (src ? "" : " solo") + '"><div class="a-text">' + (SITE.what ? '<p class="a-role">' + esc(SITE.what) + "</p>" : "") +
      '<div class="s-bio">' + bio.map(t => "<p>" + rich(t) + "</p>").join("") + "</div>" + (links ? '<p class="a-links">' + links + "</p>" : "") + now + "</div>" +
      (src ? '<figure class="s-photo"><span class="s-print"><span class="s-sheet"><canvas data-photo aria-hidden="true"></canvas><img src="' + attr(src) + '" alt="' + attr(String(W.photo).replace("{name}", SITE.name)) + '"></span></span>' + (nick ? '<figcaption><button type="button" class="s-nick" data-zdo="pop"><span id="blue-line">' + esc(nick) + "</span></button></figcaption>" : "") + "</figure>" : "") + "</div></section>" };
}

// bookmarks: a plain list. The title leads to the page. A video on YouTube or Vimeo can also play here, after a click.
const bLink = v => /^https?:\/\//i.test(String(v.href || "")) ? String(v.href) : "/bookmarks/";
export const bookmarkKind = (SITE, v) => String(v.kind || "").trim() || (playerOf(v.href) ? String(SITE.words.videoKind || "Video") : "");
export function bookmarksPage(SITE) {
  const W = SITE.words, kindOf = v => bookmarkKind(SITE, v);
  const list = SITE.bookmarks.map((v, i) => [v, i]).sort((a, b) => String(b[0].date || "").localeCompare(String(a[0].date || "")) || a[1] - b[1]).map(x => x[0]), kinds = [];
  list.forEach(v => { const k = kindOf(v); if (k && kinds.indexOf(k) < 0) kinds.push(k); });
  return { path: "/bookmarks/", title: W.bookmarksTitle || W.bookmarks, section: "bookmarks",
    html: '<section id="z-list"><h1 tabindex="-1">' + esc(W.bookmarksTitle || W.bookmarks || "") + "</h1>" + lede(SITE, "bookmarks") + (kinds.length > 1 ? chips(SITE, kinds) : "") +
      '<ol class="s-index b-list">' + list.map(v => {
        const play = playerOf(v.href), where = hostOf(v.href), meta = [kindOf(v), v.by, v.length].filter(Boolean).join(", ");
        return '<li class="b-card" data-kind="' + attr(kindOf(v)) + '"><div class="b-main"><a class="b-t" href="' + attr(bLink(v)) + '" target="_blank" rel="noopener">' + sTitle(v.title || "") + "</a>" + (meta ? '<p class="b-by">' + esc(meta) + "</p>" : "") + (v.why ? '<p class="b-why">' + rich(nice(v.why)) + "</p>" : "") + "</div>" +
          (play ? '<button type="button" class="b-go" data-zdo="play" data-src="' + attr(play) + '" data-title="' + attr(v.title || "") + '"><i></i><span>' + esc(W.play || "Play here") + "</span></button>"
            : where ? '<a class="b-go" href="' + attr(bLink(v)) + '" target="_blank" rel="noopener"><span>' + esc(where) + "</span></a>" : "") + "</li>";
      }).join("") + "</ol></section>" };
}

// contact: her line, her links, and a small form when she has said where it sends
export function contactPage(SITE, preview) {
  const W = SITE.words, to = String(SITE.contactTo || "").trim(), form = MAILTO.test(to) || /^https:\/\/\S+$/i.test(to) || !!preview;
  const box = (k, more) => "<label" + (k === "Text" ? ' class="s-wide"' : "") + "><span>" + esc(W["contact" + k] || "") + "</span>" + more + "</label>";
  return { path: "/contact/", title: W.contactTitle || W.contact, section: "contact",
    html: '<section id="z-list"><h1 tabindex="-1">' + esc(W.contactTitle || W.contact || "") + "</h1>" + lede(SITE, "contact") +
      '<section class="s-hi"><div class="s-hi-top' + (form ? "" : " solo") + '"><div>' + (SITE.hello ? "<p>" + esc(nice(SITE.hello)) + "</p>" : "") + (SITE.links.length ? '<p class="s-links">' + SITE.links.map(linkHtml).join("") + "</p>" : "") + "</div>" +
      (form ? '<form class="s-form" novalidate>' + box("Name", '<input name="name" autocomplete="name">') + box("Email", '<input name="email" type="email" autocomplete="email">') + box("Text", '<textarea name="message" rows="3"></textarea>') +
        '<input class="s-trap" name="website" tabindex="-1" autocomplete="off" aria-hidden="true"><p class="s-send"><button type="submit">' + esc(W.contactSend || "Send") + '</button><span class="s-form-msg" role="status"></span></p></form>' : "") + "</div></section></section>" };
}

// the CV. The programs stand in it, after Research. A part with nothing in it is left out.
export function cvPage(SITE) {
  const W = SITE.words, C = SITE.cv || {};
  const job = j => '<div class="job"><p><b>' + esc(j.title) + "</b>" + (j.sub ? ", " + esc(j.sub) : "") + "</p>" + (j.when ? '<p class="meta">' + esc(j.when) + "</p>" : "") + ((j.points || []).length ? '<ul class="dash">' + j.points.map(p => "<li>" + esc(p) + "</li>").join("") + "</ul>" : "") + "</div>";
  const sec = (title, inner, id) => '<section class="cv-sec"' + (id ? ' id="' + id + '"' : "") + "><h2>" + title + "</h2><div>" + inner + "</div></section>";
  const bullets = a => '<ul class="dash">' + a.map(s => "<li>" + s + "</li>").join("") + "</ul>";
  const prog = p => '<div class="job"><p><b>' + esc(p.name) + "</b>" + (p.host ? ", " + esc(p.host) : "") + "</p>" + (p.when ? '<p class="meta">' + esc(p.when) + "</p>" : "") + (p.text ? "<p>" + esc(p.text) + "</p>" : "") +
    (p.led && p.led[0] ? '<p class="led">' + esc(W.project) + ' <a href="' + attr(link(p.led[1])) + '">' + esc(p.led[0]) + "</a></p>" : "") + "</div>";
  const has = a => Array.isArray(a) && a.length > 0;
  return { path: "/cv/", title: W.cvTitle || W.cv, section: "cv", view: true,
    html: '<section class="view" id="view-cv"><h1 tabindex="-1">' + esc(W.cvTitle) + '</h1><div id="cv-root">' + (C.line ? '<p class="cv-id">' + esc(C.line) + "</p>" : "") + '<div class="shelf">' +
      (has(C.experience) ? sec(esc(W.experience), C.experience.map(job).join("")) : "") +
      (has(C.education) ? sec(esc(W.education), C.education.map(job).join("")) : "") +
      (has(SITE.research) ? sec(esc(W.cvResearch), bullets(SITE.research.map(p => '<a href="/research/' + attr(p.id) + '/">' + esc(p.title) + "</a>" + (/[.?!]$/.test(p.title) ? " " : ". ") + esc(stop(p.where || ""))))) : "") +
      (shown(SITE, "programs") ? SITE.programs.filter(g => has(g.items)).map((g, i) => sec(esc(g.group), g.items.map(prog).join(""), i ? "" : "programs")).join("") : "") +
      (has(C.service) ? sec(esc(W.service), bullets(C.service.map(esc))) : "") +
      (has(C.training) ? sec(esc(W.training), bullets(C.training.map(esc))) : "") +
      (has(C.skills) ? sec(esc(W.skills), C.skills.map(s => '<div class="job"><p><b>' + esc(s[0]) + "</b></p><p>" + esc(s[1]) + "</p></div>").join("")) : "") +
      (has(C.languages) ? sec(esc(W.languages), '<dl class="kv">' + C.languages.map(l => "<dt>" + esc(l[0]) + "</dt><dd>" + esc(l[1]) + "</dd>").join("") + "</dl>") : "") +
      "</div></div></section>" };
}

// a page that is not there
export function missingPage(SITE) {
  const W = SITE.words;
  return { path: "/404.html", title: "Not found", section: "", html: '<section id="z-list"><h1 tabindex="-1">This page is not here.</h1><p class="z-lede"><a href="/">' + esc(W.brand || SITE.name) + "</a></p></section>" };
}

// Two kinds of page: most stand inside the frame with the links (#z). A post and the CV stand beside it (view: true),
// because their styles were written for that place.
// every page of the site, for the feed and the checks
// Settings: an empty box. The editor fills it in the browser.
export function settingsPage(SITE) {
  return { path: "/settings/", title: SITE.words.write || "Settings", section: "", html: '<section class="view" id="view-write"><div id="write-root"></div></section>', view: true, desk: true };
}
export function allPages(SITE, preview) {
  prepare(SITE);
  const pages = [homePage(SITE)];
  ["research", "blog"].forEach(k => { if (shown(SITE, k)) pages.push(listPage(SITE, k)); });
  if (shown(SITE, "research")) SITE.postings.filter(p => p.kind === "research").forEach(p => pages.push(postingPage(SITE, p)));
  if (shown(SITE, "blog")) SITE.published.forEach(p => pages.push(postPage(SITE, p)));
  if (shown(SITE, "bookmarks") && SITE.bookmarks.length) pages.push(bookmarksPage(SITE));
  if (shown(SITE, "about")) pages.push(aboutPage(SITE));
  if (shown(SITE, "cv")) pages.push(cvPage(SITE));
  if (shown(SITE, "hello")) pages.push(contactPage(SITE, preview));
  pages.push(settingsPage(SITE));
  return pages;
}
