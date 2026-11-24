// What stands around the editor on the Settings page (settings-app.js holds the editor itself):
// the content as the site reads it, the helpers the pages are built with, and the look of the page,
// so a new colour or font shows here right after it is saved.
import { esc, attr, plain, niceDate, MONTH_NAMES, DAYS } from "../lib/html.js";
import { WORDS, CLOCK, LOOK, HOME, FONTS } from "../lib/defaults.js";
import { px, PX, pathOf } from "../lib/pixel.js";
import { setup, md, splitPost, joinPost } from "../lib/markdown.js";
import { makeSite, readPost, imgSrc, link } from "../lib/model.js";
import { rootStyle, fontHref } from "../lib/head.js";
import { front, joinNote, listOf, slug, fileName, renderText, plain as plainNote, linksOf, NOTES, ABOUT } from "../lib/brain-core.js";
import { useSite, readInk, applyInk, photoIs, dotPhoto } from "./ink.js";
import { install } from "./settings-app.js";

const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const REDUCED = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

// what was saved since the page opened. The site itself only shows a save after GitHub has built it again.
const overlay = new Map();
const missing = path => Object.assign(new Error(path + " is not there"), { file: path, status: 404 });

// one file of the content, as text. Paths are written as the site serves them: content/site.json
async function readFile(path) {
  if (overlay.has(path)) { const v = overlay.get(path); if (v === null) throw missing(path); return v; }
  const kept = window.HANA_FILES;          // a preview that is one single file carries the content inside it
  if (kept) { if (typeof kept[path] === "string") return kept[path]; throw missing(path); }
  let r;
  try { r = await fetch("/" + path, { cache: "no-cache" }); } catch (e) { throw Object.assign(new Error(path + " could not be read"), { file: path }); }
  if (!r.ok) throw Object.assign(new Error(path + " " + r.status), { file: path, status: r.status });
  return r.text();
}
// a picture that was just added is shown from what was saved here, the others from the site
function picture(u) {
  const p = String(u || ""), v = overlay.has(p) ? overlay.get(p) : window.HANA_FILES && window.HANA_FILES[p];
  return typeof v === "string" && v.indexOf("data:") === 0 ? v : imgSrc(p);
}

let SITE = null, built = [];
async function loadSite() {
  const json = async (name, or) => {
    let text;
    try { text = await readFile("content/" + name); } catch (e) { if (or !== undefined && e.status === 404) return or; throw e; }
    try { return JSON.parse(text); } catch (e) { throw Object.assign(new Error("content/" + name + " is not valid JSON"), { file: "content/" + name, broken: true }); }
  };
  const got = await Promise.all([json("site.json"), json("now.json", {}), json("research.json", []), json("programs.json", []), json("cv.json", {}), json("bookmarks.json", {})]);
  SITE = makeSite({ site: got[0], now: got[1], research: got[2], programs: got[3], cv: got[4], bookmarks: got[5], postsIndex: built });
  // a preview that is one single file builds its pages again from what was saved in the demo
  if (window.hanaChanged) window.hanaChanged(overlay);
  setup({ img: picture, link: link, copy: SITE.words.copy || "Copy" });
}
// the colours and the font of this page, taken from the content again
function applyLook() {
  const root = document.documentElement, f = FONTS[SITE.look.font] || FONTS.karla;
  rootStyle(SITE, FONTS).split(";").forEach(d => { const i = d.indexOf(":"); if (i > 0) root.style.setProperty(d.slice(0, i), d.slice(i + 1)); });
  let font = document.getElementById("site-font");
  if (f.css) {
    if (!font) { font = document.createElement("link"); font.rel = "stylesheet"; font.id = "site-font"; document.head.appendChild(font); }
    if (font.getAttribute("href") !== fontHref(f)) font.setAttribute("href", fontHref(f));
  }
  useSite(SITE); readInk(); applyInk(false);
}
// the pixel portrait of older versions of the site, as a drawing
function portraitSvg(rows) {
  const inside = (y, x) => y >= 0 && y < rows.length && x >= 0 && x < rows[y].length && rows[y][x] !== "-";
  let x0 = rows[0].length, x1 = -1, y0 = rows.length, y1 = -1;          // the box around the figure: empty squares outside it are left out
  rows.forEach((r, y) => { for (let x = 0; x < r.length; x++) if (r[x] !== "-") { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } });
  if (x1 < 0) { x0 = 0; y0 = 0; x1 = rows[0].length - 1; y1 = rows.length - 1; }
  return '<svg viewBox="' + x0 + " " + y0 + " " + (x1 - x0 + 1) + " " + (y1 - y0 + 1) + '" style="--mw:' + (x1 - x0 + 1) + ";--mh:" + (y1 - y0 + 1) + '" aria-hidden="true"><path class="dk" d="' + pathOf(rows.map(r => r.replace(/./g, c => c === "1" ? "#" : "."))) + '"/><path class="lt" d="' +
    pathOf(rows.map((r, y) => r.replace(/./g, (c, x) => c === "0" || (c === "1" && y < rows.length - 1 && !(inside(y - 1, x) && inside(y + 1, x) && inside(y, x - 1) && inside(y, x + 1))) ? "#" : "."))) + '"/></svg>';
}

let B = null;
// opens Settings in the box the page holds for it. data is what the page was built with: the address of the site and the list of posts.
export async function start(data, preview) {
  const root = document.getElementById("write-root");
  if (!root || root.dataset.ready) return;
  built = Array.isArray((data || {}).posts) ? data.posts : [];
  if (!B) {
    B = {
      $: $, $$: $$, esc: esc, attr: attr, plain: plain, md: md, splitPost: splitPost, joinPost: joinPost, readPost: readPost, px: px, PX: PX, pathOf: pathOf,
      readFile: readFile, overlay: overlay, niceDate: niceDate, MONTH_NAMES: MONTH_NAMES, DAYS: DAYS, REDUCED: REDUCED,
      site: () => SITE, preview: false, desk: null, fonts: FONTS,
      // the second brain: the helpers that read and write a note, and the list of notes the site was built with
      brain: { front: front, joinNote: joinNote, listOf: listOf, slug: slug, fileName: fileName, renderText: renderText, plain: plainNote, linksOf: linksOf, NOTES: NOTES, ABOUT: ABOUT }, notes: [],
      defaults: { words: WORDS, clock: CLOCK, look: LOOK, home: HOME },
      resetInk: () => {},          // the look is read again with every reload
      inkPhoto: () => { photoIs(SITE.photo ? picture(SITE.photo) : ""); dotPhoto(); },
      portraitSvg: portraitSvg, imgSrc: picture,
      say: () => {},               // the robot of the footer is not on this page
      reload: async () => { await loadSite(); applyLook(); }
    };
    install(B);
  }
  B.preview = !!preview;
  B.notes = Array.isArray((data || {}).brain) ? data.brain : [];
  try { await loadSite(); }
  catch (e) { root.innerHTML = '<p class="set-fail">' + esc(e.broken ? e.message + ". Open that file on GitHub and mend it, then come back." : "The content could not be read. Reload the page to try again.") + "</p>"; return; }
  applyLook();
  B.desk(root);
}
