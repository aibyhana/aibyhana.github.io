// Turns the content files into one object the pages are built from.
// It has no access to files itself: load.js reads them when the site is built, Settings reads them in the browser.
import { WORDS, CLOCK, LOOK, HOME } from "./defaults.js";
import { splitPost } from "./markdown.js";

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const countWords = t => (String(t || "").match(/\S+/g) || []).length;

// where a link of the old kind (#work-x, #blog) leads now. Any other link is left as it is.
const PLACES = { home: "/", research: "/research/", reading: "/brain/", books: "/brain/", papers: "/brain/", blog: "/blog/", bookmarks: "/bookmarks/", videos: "/bookmarks/",
  about: "/about/", now: "/about/#now", cv: "/cv/", programs: "/cv/#programs", hackathons: "/cv/#programs", contact: "/contact/", settings: "/settings/", write: "/settings/" };
export function link(href) {
  const h = String(href || "");
  if (h.charAt(0) !== "#") return h;
  const k = h.slice(1);
  if (k.indexOf("work-") === 0) return "/research/" + k.slice(5) + "/";
  if (k.indexOf("post-") === 0) return "/blog/" + k.slice(5) + "/";
  if (k.indexOf("book-") === 0 || k.indexOf("paper-") === 0) return "/brain/";          // books and papers are notes of the second brain now
  return PLACES[k] || h;
}
// a picture kept with the content is served from /content/img
export const imgSrc = u => /^content\//.test(String(u || "")) ? "/" + u : String(u || "");

// one post file -> what the lists need to know about it
export function readPost(id, text) {
  const s = splitPost(text), m = s.meta;
  return { id: id, title: String(m.title || id), date: DAY.test(String(m.date || "")) ? m.date : "", draft: String(m.draft) === "true",
    teaser: String(m.teaser || m.description || m.summary || ""), topic: String(m.topic || "").trim(), words: countWords(s.body), body: s.body };
}

// raw: { site, now, research, programs, cv, bookmarks, posts: [{ id, text }] }
// Settings has no post texts at hand, so it may pass postsIndex (the list in posts.json) in place of posts.
export function makeSite(raw) {
  const d = raw || {}, site = d.site || {};
  const SITE = Object.assign({}, site, d.now || {}, {
    research: Array.isArray(d.research) ? d.research : [],
    programs: Array.isArray(d.programs) ? d.programs : [], cv: d.cv || {}
  });
  SITE.name = SITE.name || "Lorem Ipsum";
  SITE.words = Object.assign({}, WORDS, site.words);
  SITE.clock = Object.assign({}, CLOCK, site.clock);
  SITE.look = Object.assign({}, LOOK, site.paper ? { paper: site.paper } : {}, site.look);
  SITE.home = Array.isArray(site.home) && site.home.length ? site.home : HOME;
  SITE.inks = (site.inks || []).filter(k => k && k.ink);
  if (!SITE.inks.length) SITE.inks = [{ name: "Black", ink: "#1d1c1a" }];
  SITE.robot = Object.assign({ off: "off", on: "on" }, site.robot);
  SITE.blueLine = Object.assign({ name: "", plain: "", same: "", other: "" }, site.blueLine);
  SITE.photo = typeof site.photo === "string" ? site.photo : "";
  SITE.photoSize = Array.isArray(site.photoSize) ? site.photoSize : null;
  SITE.sections = Object.assign({}, site.sections);
  SITE.links = Array.isArray(site.links) ? site.links : [];
  SITE.intro = Array.isArray(site.intro) ? site.intro : [];
  SITE.now = Array.isArray(SITE.now) ? SITE.now : [];
  SITE.topics = Array.isArray(site.topics) ? site.topics.map(t => String(t || "").trim()).filter(Boolean) : [];
  SITE.bookmarks = Array.isArray((d.bookmarks || {}).bookmarks) ? d.bookmarks.bookmarks.filter(x => x && typeof x === "object") : [];
  SITE.posts = Array.isArray(d.posts) ? d.posts.map(p => readPost(p.id, p.text)) : (Array.isArray(d.postsIndex) ? d.postsIndex : []);

  // the posts that show, newest first, and the drafts that are listed as half written
  SITE.published = SITE.posts.filter(p => !p.draft && p.date).sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : 0);
  SITE.drafts = SITE.posts.filter(p => p.draft && p.teaser);

  // postings: every post and every project is one. Those with a date come first, newest on top.
  const postings = SITE.published.map(p => ({ kind: "blog", id: p.id, href: "/blog/" + p.id + "/", title: p.title, date: p.date, line: p.teaser || "", meta: "", topic: p.topic || "", item: p }))
    .concat(SITE.research.map(p => ({ kind: "research", id: p.id, href: "/research/" + p.id + "/", title: p.title, date: p.date || "", line: p.short || "", meta: p.where || "", item: p })));
  SITE.postings = postings.filter(p => p.date).sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : 0).concat(postings.filter(p => !p.date));
  return SITE;
}
