// The garden in the browser: the robot walks along the floor under the shelves, stops under a plant now and then,
// and says a line when you click it. At night, by the clock of the site, it is asleep. Pointing at a plant tells you what it is.
import { px } from "../lib/pixel.js";

const $ = s => document.querySelector(s);
const STILL = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
const SIZE = 4;
const LINES = [
  "I water whatever was written last.",
  "Nothing here is finished. That is the idea.",
  "The cactus asks for nothing. I respect that.",
  "A shoot is a note with one sentence in it.",
  "Come back when something has grown.",
];

// is it night where she lives? The clock of the site says where that is.
function asleep() {
  let zone = "UTC";
  try { zone = JSON.parse(document.getElementById("site-data").textContent).clock.zone || "UTC"; } catch (e) { /* the clock is optional */ }
  try {
    const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: zone, hour: "2-digit", hour12: false }).format(new Date()));
    return hour >= 23 || hour < 6;
  } catch (e) { return false; }
}

let started = false;
export function start() {
  const floor = $("#gd-floor"), bot = $("#gd-bot"), body = $("#gd-body"), says = $("#gd-says"), line = $("#gd-line");
  if (!floor || !bot || started) return;
  started = true;

  // pointing at a plant, or reaching it with the keyboard, says what it is under the garden
  const rest = line ? line.dataset.rest : "";
  Array.from(document.querySelectorAll(".gd-shelf a")).forEach(a => {
    const tell = () => { if (line) line.textContent = a.dataset.says; }, back = () => { if (line) line.textContent = rest; };
    a.addEventListener("pointerenter", tell); a.addEventListener("pointerleave", back);
    a.addEventListener("focus", tell); a.addEventListener("blur", back);
  });

  const night = asleep();
  if (night) body.innerHTML = px("botOff", SIZE);
  let x = 24, busy = null, hush = null, turn = 0;
  const limit = () => Math.max(0, floor.clientWidth - bot.offsetWidth);
  const put = v => { x = Math.max(0, Math.min(v, limit())); bot.style.left = x + "px"; };
  put(x);

  function say(text, ms) {
    says.textContent = text;
    // near an edge the words lean inwards, so they stay inside the garden
    says.className = "gd-says on" + (x < 130 ? " from-left" : x > limit() - 130 ? " from-right" : "");
    clearTimeout(hush);
    hush = setTimeout(() => says.classList.remove("on"), ms || 3200);
  }
  function walkTo(to, then) {
    to = Math.max(0, Math.min(to, limit()));
    const ms = Math.abs(to - x) / 34 * 1000;
    bot.classList.toggle("left", to < x); bot.classList.add("walk");
    bot.style.transitionDuration = ms + "ms"; bot.style.left = to + "px"; x = to;
    clearTimeout(busy);
    busy = setTimeout(() => { bot.classList.remove("walk"); if (then) then(); }, ms + 40);
  }
  // it potters: now to a place of its own choosing, now under a plant, which it greets
  function next() {
    if (night || STILL || !bot.isConnected) return;
    const plants = Array.from(document.querySelectorAll(".gd-shelf li"));
    if (plants.length && Math.random() < 0.55) {
      const li = plants[Math.floor(Math.random() * plants.length)], f = floor.getBoundingClientRect(), r = li.getBoundingClientRect();
      walkTo(r.left + r.width / 2 - f.left - bot.offsetWidth / 2, () => {
        li.classList.add("glad"); setTimeout(() => li.classList.remove("glad"), 600);
        busy = setTimeout(next, 2200 + Math.random() * 2500);
      });
    } else walkTo(Math.random() * limit(), () => { busy = setTimeout(next, 1500 + Math.random() * 3000); });
  }

  bot.addEventListener("click", e => {
    e.stopPropagation();
    if (night) { say("Asleep. It is night here.", 2600); return; }
    // it stops where it stands to talk, then goes on
    const here = bot.getBoundingClientRect().left - floor.getBoundingClientRect().left;
    clearTimeout(busy); bot.classList.remove("walk"); bot.style.transitionDuration = "0ms"; put(here);
    say(LINES[turn++ % LINES.length]);
    busy = setTimeout(next, 3600);
  });
  // a click on the floor calls it over
  floor.addEventListener("click", e => {
    if (night || STILL) return;
    walkTo(e.clientX - floor.getBoundingClientRect().left - bot.offsetWidth / 2, () => { busy = setTimeout(next, 2500); });
  });
  window.addEventListener("resize", () => { if (x > limit()) { bot.style.transitionDuration = "0ms"; put(limit()); } });
  if (!night && !STILL) busy = setTimeout(next, 1800);
}
