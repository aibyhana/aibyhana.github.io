// What the pages do in the browser: the colour picker and the dark page, the photo printed as dots, the clock,
// the list of contents and the reading line of a long text, the text size, the filters, the video player,
// the contact form and the robot of the footer. The pages themselves are built ahead of time. Without this script they still read fine.
import { px } from "../lib/pixel.js";
import { useSite, readInk, applyInk, pickInk, flipInk, photoIs, dotPhoto, photoSoon } from "./ink.js";

const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const attr = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const REDUCED = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
const MAILTO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const rnd = (a, b) => a + Math.random() * (b - a);

// what the page was built with: the colours, the clock, a few labels
const told = () => { const holder = document.getElementById("site-data"); return holder ? JSON.parse(holder.textContent) : null; };
let SITE = told();
// anywhere but the real address counts as a preview: the contact form sends nothing there
const preview = !!SITE && (SITE.preview === true || (!!SITE.host && location.hostname !== SITE.host));

/* ---------- local time where she lives ---------- */
function tick() {
  const els = $$("[data-clock]"); if (!els.length) return;
  const c = SITE.clock, put = t => els.forEach(el => { el.textContent = t; });
  try {
    const parts = new Intl.DateTimeFormat("en-GB", { timeZone: c.zone, hour: "2-digit", minute: "2-digit", weekday: "short", hour12: false }).formatToParts(new Date());
    const get = t => (parts.find(p => p.type === t) || {}).value;
    const h = Number(get("hour")), wk = ["Sat", "Sun"].indexOf(get("weekday")) >= 0;
    const guess = h >= 23 || h < 6 ? c.asleep : h < 8 ? c.run : wk ? c.weekend : h >= 9 && h < 18 ? c.work : h >= 18 ? c.evening : c.morning;
    put((String(c.line).replace("{time}", get("hour") + ":" + get("minute")).replace("{place}", c.place) + " " + (guess || "")).trim().replace(/'/g, "’"));
  } catch (e) { put(c.place); }
}

/* ---------- reading: a quiet list of contents in the margin, a line on top that shows how far you are ---------- */
let sSpy = null, sWide = null;
function longText(scope) {
  if (sSpy) { window.removeEventListener("scroll", sSpy); window.removeEventListener("resize", sSpy); sSpy = null; }
  if (sWide) { sWide[0].removeEventListener("change", sWide[1]); sWide = null; }
  let bar = document.getElementById("s-read");
  const art = scope && scope.querySelector(".z-art, .reader");
  if (!art) { if (bar) bar.style.width = "0"; return; }
  const body = art.querySelector(".s-body, .body"), W = SITE.words;
  const heads = body ? Array.from(body.querySelectorAll("h2[id], h3[id]")).filter(h => !h.closest("details, blockquote, aside")) : [];
  const count = body ? (body.textContent.match(/\S+/g) || []).length : 0, meta = art.querySelector(".z-meta, .meta");
  if (meta && count > 600 && !meta.querySelector(".s-min")) { const sp = document.createElement("span"); sp.className = "s-min"; sp.textContent = String(W.minutes || "{n} min read").replace("{n}", Math.max(1, Math.round(count / 230))); meta.appendChild(sp); }
  if (meta && !meta.querySelector(".s-size")) { const z = document.createElement("span"); z.className = "s-size"; z.innerHTML = '<button type="button" data-zdo="size" data-d="-1" aria-label="' + attr(W.smaller || "Smaller text") + '">A−</button><button type="button" data-zdo="size" data-d="1" aria-label="' + attr(W.larger || "Larger text") + '">A+</button>'; meta.appendChild(z); }
  let side = art.querySelector(".s-side");
  if (heads.length >= 3 && !side) {          // a short text needs no contents
    side = document.createElement("aside"); side.className = "s-side";
    side.innerHTML = '<details class="s-toc"><summary>' + esc(W.contents || "Contents") + "</summary><ol>" + heads.map(h => "<li" + (h.tagName === "H3" ? ' class="s-sub"' : "") + '><button type="button" data-zdo="jump" data-id="' + attr(h.id) + '">' + esc(h.textContent) + "</button></li>").join("") + "</ol></details>";
    art.insertBefore(side, Array.from(art.children).find(c => c.classList.contains("z-fig")) || body); art.classList.add("s-long");
    // on a wide screen the list stands open in the margin. On a narrow one it is folded above the text.
    const mq = window.matchMedia("(min-width:1300px)"), det = side.firstChild, sync = () => { det.open = mq.matches; };
    sync(); mq.addEventListener("change", sync); sWide = [mq, sync];
  }
  if (!bar) { bar = document.createElement("div"); bar.id = "s-read"; bar.setAttribute("aria-hidden", "true"); document.body.appendChild(bar); }
  let cur = null, wait = false;
  const mark = () => {
    wait = false;
    if (!art.isConnected || art.offsetParent === null) { bar.style.width = "0"; return; }          // the reader has left this text
    const r = art.getBoundingClientRect(), far = r.height - window.innerHeight * 0.7;
    bar.style.width = (far > 300 ? Math.min(1, Math.max(0, -r.top / far)) * 100 : 0) + "%";
    if (!side) return;
    let on = null;
    for (const h of heads) { if (h.getBoundingClientRect().top <= window.innerHeight * 0.3) on = h; else break; }
    const b = on ? side.querySelector('button[data-id="' + on.id + '"]') : null;
    if (b === cur) return;
    if (cur) cur.classList.remove("on");
    cur = b; if (cur) cur.classList.add("on");
  };
  sSpy = () => { if (!wait) { wait = true; requestAnimationFrame(mark); } };
  window.addEventListener("scroll", sSpy, { passive: true }); window.addEventListener("resize", sSpy, { passive: true }); mark();
}

/* ---------- the size of the text in a post: two buttons, and the choice is kept in this browser ---------- */
let sRs = 1;
try { sRs = Math.min(1.4, Math.max(0.84, parseFloat(localStorage.getItem("hana-text-size")) || 1)); } catch (e) { /* no storage here: the size starts as it is */ }
document.documentElement.style.setProperty("--rs", sRs);

/* ---------- clicks ---------- */
function onClick(e) {
  const t = e.target.closest ? e.target.closest("[data-zdo]") : null;
  if (!t) return;
  const what = t.dataset.zdo;
  if (what === "flip") flipInk();
  else if (what === "size") {
    sRs = Math.min(1.4, Math.max(0.84, Math.round((sRs + 0.08 * Number(t.dataset.d)) * 100) / 100));
    document.documentElement.style.setProperty("--rs", sRs);
    try { localStorage.setItem("hana-text-size", sRs); } catch (err) { /* it still holds until the page is closed */ }
  }
  else if (what === "jump") {          // a line of the contents, or the number of a footnote
    const root = t.closest(".z-art, .reader, .c-preview") || document, to = root.querySelector('[id="' + t.dataset.id + '"]');
    if (to) { to.scrollIntoView({ behavior: REDUCED ? "auto" : "smooth", block: "start" }); try { to.focus({ preventScroll: true }); } catch (err) { /* older browsers */ } }
  }
  else if (what === "copy") {          // the button on a block of code
    const box = t.closest("figure"), pre = box && box.querySelector("pre"), rows = pre ? pre.querySelectorAll(".l") : [], txt = rows.length ? Array.from(rows).map(r => r.textContent).join("\n") : pre ? pre.textContent : "";
    const done = () => { t.textContent = SITE.words.copied || "Copied"; setTimeout(() => { t.textContent = SITE.words.copy || "Copy"; }, 1400); };
    const old = () => { const a = document.createElement("textarea"); a.value = txt; a.style.position = "fixed"; a.style.opacity = "0"; document.body.appendChild(a); a.select(); try { if (document.execCommand("copy")) done(); } catch (err) { /* the text can still be marked by hand */ } a.remove(); };
    try { navigator.clipboard.writeText(txt).then(done, old); } catch (err) { old(); }
  }
  else if (what === "kind") {          // the filter on top of a list: one kind, or all
    const want = t.dataset.kind || "", box = t.parentNode, list = box.nextElementSibling;
    Array.from(box.querySelectorAll("button")).forEach(x => { x.classList.toggle("on", x === t); x.setAttribute("aria-pressed", x === t ? "true" : "false"); });
    if (list) Array.from(list.children).forEach(c => { c.hidden = !!want && c.dataset.kind !== want; });
  }
  else if (what === "play") {          // a video plays under its title. Until this click nothing is fetched from the video site.
    if (!/^https:\/\/(www\.youtube-nocookie\.com|player\.vimeo\.com)\//.test(t.dataset.src || "")) return;
    const f = document.createElement("iframe");
    f.src = t.dataset.src; f.title = t.dataset.title || ""; f.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen"; f.allowFullscreen = true; f.referrerPolicy = "strict-origin-when-cross-origin";
    const box = document.createElement("div"); box.className = "v-frame"; box.appendChild(f);
    t.closest(".b-card").appendChild(box); t.remove();
  }
  else if (what === "pop") {          // the line under the photo throws a handful of squares
    const r = t.getBoundingClientRect();
    for (let i = 0; i < 16; i++) {
      const d = document.createElement("i"); d.className = "z-bit"; d.style.left = r.left + r.width / 2 + "px"; d.style.top = r.top + r.height / 2 + "px";
      d.style.setProperty("--dx", (Math.random() * 220 - 110).toFixed(0) + "px"); d.style.setProperty("--dy", (Math.random() * -170 - 20).toFixed(0) + "px");
      d.style.background = "var(--c" + (1 + i % 6) + ")"; d.addEventListener("animationend", () => d.remove()); document.body.appendChild(d);
    }
  }
}

/* ---------- the contact form. It sends to the address she set: a form service gets the message in the background,
   an email address opens the visitor's own mail app with the message filled in. In a preview nothing is sent. ---------- */
async function onSubmit(e) {
  const f = e.target.closest ? e.target.closest(".s-form") : null;
  if (!f) return;
  e.preventDefault();
  const W = SITE.words, msg = f.querySelector(".s-form-msg"), btn = f.querySelector("button"), v = k => String(f.elements[k].value || "").trim();
  const say = (t, bad) => { msg.textContent = t || ""; msg.classList.toggle("bad", !!bad); };
  if (v("website")) return;          // a box no person can see was filled in: a robot
  if (!v("name") || !v("message") || !MAILTO.test(v("email"))) { say(W.contactNeed, true); return; }
  const to = String(SITE.contactTo || "").trim();
  if (preview) { say(W.contactDemo); return; }
  if (/^https:\/\/\S+$/i.test(to)) {
    const d = new FormData(); d.append("name", v("name")); d.append("email", v("email")); d.append("message", v("message"));
    btn.disabled = true; say(W.contactSending);
    try {
      const r = await fetch(to, { method: "POST", headers: { Accept: "application/json" }, body: d });
      if (!r.ok) throw new Error(String(r.status));
      f.reset(); say(W.contactSent);
    } catch (err) { say(W.contactFail, true); }
    btn.disabled = false;
    return;
  }
  if (!MAILTO.test(to)) return;
  const a = document.createElement("a");          // a link to her address, clicked for the visitor: their mail app opens with the message in it
  a.href = "mailto:" + to + "?subject=" + encodeURIComponent(String(W.contactSubject || "").replace("{name}", v("name"))) + "&body=" + encodeURIComponent(v("message") + "\n\n" + v("name") + "\n" + v("email"));
  a.hidden = true; document.body.appendChild(a); a.click(); a.remove();
  say(W.contactMail);
}

/* ---------- the footer line: a robot that potters about and lets you switch it off ---------- */
function robot() {
  const bot = $("#bot"), says = $("#bot-says"), body = $("#bot-body"), sill = $("#sill");
  if (!bot || !body || !sill) return;
  const foot = bot.parentNode;
  sill.hidden = !SITE.look.plants; bot.hidden = SITE.look.robot === false;
  if (!sill.hidden) sill.innerHTML = px("cactus", 3) + px("sprout", 3) + px("blades", 3);
  let x = 40, off = false, busy = null, hush = null;
  body.innerHTML = px("bot", 3);
  function say(text, ms) { says.textContent = text; says.classList.add("on"); clearTimeout(hush); hush = setTimeout(() => says.classList.remove("on"), ms || 2200); }
  const limit = () => sill.hidden ? Math.max(40, foot.getBoundingClientRect().width - 60) : Math.max(40, sill.getBoundingClientRect().left - foot.getBoundingClientRect().left - 44);
  function walkTo(tx, then) {
    tx = Math.max(0, Math.min(tx, limit()));
    const ms = Math.abs(tx - x) / 30 * 1000;
    bot.classList.toggle("left", tx < x); bot.classList.add("walk");
    bot.style.transitionDuration = ms + "ms"; bot.style.left = tx + "px"; x = tx;
    busy = setTimeout(() => { bot.classList.remove("walk"); if (then) then(); }, ms + 40);
  }
  function next() {
    clearTimeout(busy);
    if (off || REDUCED || !bot.isConnected) return;
    if (bot.hidden) { busy = setTimeout(next, 4000); return; }
    if (!sill.hidden && Math.random() < 0.35) walkTo(limit(), () => { say("♥"); sill.classList.add("glad"); setTimeout(() => sill.classList.remove("glad"), 600); busy = setTimeout(next, 3000); });
    else walkTo(rnd(0, limit()), () => { busy = setTimeout(next, rnd(1200, 4000)); });
  }
  bot.addEventListener("click", () => {
    off = !off; clearTimeout(busy);
    const here = bot.getBoundingClientRect().left - foot.getBoundingClientRect().left;      // stop right where it stands
    bot.classList.remove("walk"); bot.style.transitionDuration = "0ms"; bot.style.left = here + "px"; x = here;
    body.innerHTML = px(off ? "botOff" : "bot", 3);
    say(off ? SITE.robot.off : SITE.robot.on, 2600);
    if (!off) busy = setTimeout(next, 1800);
  });
  // when the window gets narrower, the robot comes back inside it
  window.addEventListener("resize", () => { if (bot.isConnected && x > limit()) { bot.style.transitionDuration = "0ms"; x = limit(); bot.style.left = x + "px"; } });
  busy = setTimeout(next, 2600);
}

/* ---------- start ---------- */
// what belongs to the page that is showing
function page() {
  const pic = $("canvas[data-photo] + img"), L = SITE.look || {};
  const photoSrc = pic && !(L.photoAs ? L.photoAs === "plain" : L.photoDots === false) ? pic.getAttribute("src") : "";
  photoIs(photoSrc);
  applyInk(false);
  if (photoSrc) dotPhoto();
  tick();
  longText(document);
  if (location.hash && location.hash.length > 1) { const to = document.getElementById(decodeURIComponent(location.hash.slice(1))); if (to) to.scrollIntoView({ block: "start" }); }
  // the Settings page: its editor is a large script, so it is only fetched there
  const desk = document.getElementById("write-root");
  if (desk && !desk.dataset.ready) import("./settings-host.js").then(m => m.start(SITE, preview));
  // the second brain: its map, its search and its list of topics are fetched only on its pages
  if (document.querySelector("[data-brain]")) import("./brain.js").then(m => m.start());
  // the garden and its robot
  if (document.querySelector("[data-garden]")) import("./garden.js").then(m => m.start());
}
if (SITE) {
  useSite(SITE); readInk();
  document.addEventListener("click", onClick);
  document.addEventListener("submit", onSubmit);
  document.addEventListener("change", e => { if (e.target.id === "z-ink") pickInk(e.target.value); });
  window.addEventListener("resize", photoSoon);
  setInterval(tick, 30000);
  page(); robot();
  // a preview that swaps pages without loading calls this. What it was built with may have changed by then.
  window.hanaPage = () => { SITE = told() || SITE; useSite(SITE); readInk(); page(); robot(); };
}
