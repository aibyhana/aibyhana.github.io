// The colour of the ink, the dark page, and the photo printed as dots.
// The pages and Settings share this, so a colour picked on one page holds on the next.
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

let SITE = null;
// what it needs to know: inks, look and blueLine, as the content files give them
export function useSite(site) { SITE = site; }

/* ---------- the colour of the ink, and the dark page. The choice is kept in this browser. ---------- */
let inkAt = 0, inkNeg = false;
export function readInk() {
  inkAt = 0; inkNeg = !!SITE.look.flipped || !!SITE.inks[0].dark;
  try {
    const saved = JSON.parse(localStorage.getItem("ink") || "null");
    if (saved && saved.first === SITE.inks[0].name) { const i = SITE.inks.findIndex(k => k.name === saved.name); if (i >= 0) inkAt = i; inkNeg = !!saved.neg; }
  } catch (e) { /* storage is optional */ }
}
function blueLine() {
  const el = $("#blue-line"), k = SITE.inks[inkAt] || SITE.inks[0], L = SITE.blueLine;
  if (!el || !L) return;
  const ink = String(k.name || "").toLowerCase(), own = String(L.name || SITE.inks[0].name || "").toLowerCase();
  const line = (ink === own ? L.same : inkAt === 0 ? L.plain : String(L.other || "").replace("{ink}", ink)) || L.plain || "";
  el.textContent = line.replace(/'/g, "’");
}
export function applyInk(save) {
  const root = document.documentElement, k = SITE.inks[inkAt] || SITE.inks[0], pick = $("#z-ink");
  root.style.setProperty("--a", k.ink);
  root.style.setProperty("--b", k.paper || SITE.look.paper);
  root.style.setProperty("--pop", SITE.look.pop || "#ffe45c");
  root.classList.toggle("neg", inkNeg);
  if (pick) pick.value = String(inkAt);
  $$('[data-zdo="flip"]').forEach(b => b.setAttribute("aria-pressed", inkNeg ? "true" : "false"));
  blueLine();
  try { inkPhoto(); } catch (e) { /* the photo keeps its last print */ }
  if (save) { try { localStorage.setItem("ink", JSON.stringify({ name: k.name, neg: inkNeg, first: SITE.inks[0].name })); } catch (e) { /* storage is optional */ } }
}

/* ---------- the photo as dots. Every dot is on or off, there are no shades.
   On a light page the dark parts of the photo are printed. On a dark page the light parts are, so a face stays a face. ---------- */
let shot = null, shotWant = "", photoSrc = "";
function rgbOf(css) {
  const c = document.createElement("canvas"); c.width = c.height = 1;
  const x = c.getContext("2d"); x.fillStyle = "#000"; x.fillStyle = css; x.fillRect(0, 0, 1, 1);
  return x.getImageData(0, 0, 1, 1).data;
}
// how many dots go across, and how wide the picture is shown, so that a dot always covers whole pixels of the screen
function dotGrid() {
  const want = window.innerWidth <= 760 ? 200 : window.innerWidth <= 1020 ? 260 : 320, dpr = window.devicePixelRatio || 1, d = Math.max(1, Math.round(2 * dpr));
  const w = Math.max(24, Math.round(want * dpr / d));
  return { w: w, css: w * d / dpr };
}
export function dotPhoto() {
  if (!photoSrc) return;
  const src = photoSrc, g = dotGrid(), key = src + "|" + g.w;
  if (shot && shot.key === key) { shot.css = g.css; inkPhoto(); return; }
  if (shotWant === key) return;
  shotWant = key;
  const fail = () => { if (shotWant === key) shotWant = ""; };          // the photo then shows as it is
  const img = new Image();
  img.onerror = fail;
  img.onload = () => {
    if (shotWant !== key) return;
    try {
      const W = g.w, H = Math.max(1, Math.round(W * img.naturalHeight / img.naturalWidth)), c = document.createElement("canvas"); c.width = W; c.height = H;
      const x = c.getContext("2d"); x.imageSmoothingQuality = "high"; x.drawImage(img, 0, 0, W, H);
      const d = x.getImageData(0, 0, W, H).data, grey = new Float32Array(W * H), count = new Uint32Array(256);
      for (let i = 0, j = 0; i < grey.length; i++, j += 4) { grey[i] = d[j] * 0.6 + d[j + 1] * 0.3 + d[j + 2] * 0.1; count[Math.round(grey[i])]++; }
      // the darkest and the lightest parts are stretched to black and white first, then lifted a little so a face keeps its detail
      let lo = 0, hi = 255, n = 0;
      while (lo < 254 && (n += count[lo]) < grey.length * 0.02) lo++;
      n = 0; while (hi > lo + 1 && (n += count[hi]) < grey.length * 0.005) hi--;
      for (let i = 0; i < grey.length; i++) grey[i] = Math.pow(Math.max(0, Math.min(1, (grey[i] - lo) / (hi - lo))), 0.72) * 255;
      // each dot is switched on or off, and what was rounded away is handed to the dots next to it
      const bits = new Uint8Array(W * H), near = [[1, 0], [2, 0], [-1, 1], [0, 1], [1, 1], [0, 2]];
      for (let y = 0; y < H; y++) for (let q = 0; q < W; q++) {
        const i = y * W + q, on = grey[i] >= 128, e = (grey[i] - (on ? 255 : 0)) / 8;
        bits[i] = on ? 1 : 0;
        near.forEach(o => { const xx = q + o[0], yy = y + o[1]; if (xx >= 0 && xx < W && yy < H) grey[yy * W + xx] += e; });
      }
      shot = { key: key, w: W, h: H, css: g.css, bits: bits }; shotWant = "";
      if (photoSrc === src) inkPhoto();
    } catch (e) { fail(); }
  };
  img.src = src;
}
// prints the dots in the ink on every canvas that asks for the photo
export function inkPhoto() {
  if (!shot || !photoSrc || shot.key.indexOf(photoSrc + "|") !== 0) return false;
  const cs = getComputedStyle(document.documentElement), ink = rgbOf(cs.getPropertyValue("--ink").trim()), paper = rgbOf(cs.getPropertyValue("--paper").trim());
  const light = c => c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11, lit = light(ink) > light(paper) ? 1 : 0;
  $$("canvas[data-photo]").forEach(cv => {
    if (cv.width !== shot.w || cv.height !== shot.h) { cv.width = shot.w; cv.height = shot.h; }
    cv.style.width = shot.css + "px";
    const ctx = cv.getContext("2d"), out = ctx.createImageData(shot.w, shot.h), o = out.data;
    for (let i = 0, j = 0; i < shot.bits.length; i++, j += 4) if (shot.bits[i] === lit) { o[j] = ink[0]; o[j + 1] = ink[1]; o[j + 2] = ink[2]; o[j + 3] = 255; }
    ctx.putImageData(out, 0, 0);
    cv.dataset.dots = lit ? "light" : "dark";
  });
  return true;
}
let photoTimer = null;
export const photoSoon = () => { clearTimeout(photoTimer); photoTimer = setTimeout(dotPhoto, 120); };          // a new window width: print again

// a visitor picks another ink, or flips the page
export function pickInk(i) { inkAt = Number(i) || 0; applyInk(true); }
export function flipInk() { inkNeg = !inkNeg; applyInk(true); }
// which picture is printed as dots. An empty address means none.
export function photoIs(src) { photoSrc = src || ""; }
