// What the pages of the second brain do in the browser: the map of notes, the search, and the list of topics under the links.
// It is fetched only on those pages. Without it they still read fine.
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/* ---------- the map of notes: a dot for each note, a line for each link ----------
   The places are worked out once and the same way every time, so the map does not move or jump about. */
const NS = "http://www.w3.org/2000/svg";
const el = (name, attrs, parent) => {
  const e = document.createElementNS(NS, name);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
};
const short = t => (t.length > 30 ? t.slice(0, 28).trimEnd() + "…" : t);

// Linked notes pull each other closer, all notes push each other apart, and everything leans to the middle
// so that groups with no link between them stay on the page. This happens in a plain square. The box is fitted afterwards.
function place(nodes, edges) {
  const n = nodes.length;
  nodes.forEach((d, i) => { const r = Math.sqrt((i + 0.5) / n), a = i * 2.399963; d.x = r * Math.cos(a); d.y = r * Math.sin(a); });
  if (n < 2) return;
  const k = 1.7 / Math.sqrt(n), steps = 420;
  for (let s = 0; s < steps; s++) {
    const heat = 0.3 * (1 - s / steps) + 0.003;
    const mx = new Float64Array(n), my = new Float64Array(n);
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      let x = nodes[i].x - nodes[j].x, y = nodes[i].y - nodes[j].y, d2 = x * x + y * y;
      if (d2 < 1e-6) { x = 0.01 * (j - i); y = 0.01; d2 = x * x + y * y; }
      const f = (k * k) / d2;
      mx[i] += x * f; my[i] += y * f; mx[j] -= x * f; my[j] -= y * f;
    }
    for (const [a, b] of edges) {
      const x = nodes[a].x - nodes[b].x, y = nodes[a].y - nodes[b].y, f = Math.sqrt(x * x + y * y) / k;
      mx[a] -= x * f; my[a] -= y * f; mx[b] += x * f; my[b] += y * f;
    }
    for (let i = 0; i < n; i++) {
      mx[i] -= nodes[i].x * 1.6; my[i] -= nodes[i].y * 1.6;
      const m = Math.sqrt(mx[i] * mx[i] + my[i] * my[i]) || 1, step = Math.min(m, heat);
      nodes[i].x += (mx[i] / m) * step; nodes[i].y += (my[i] / m) * step;
    }
  }
}
// stretches the square to the box, a little more one way than the other if the box is wide
function fit(nodes, W, H, padX, padY) {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  nodes.forEach(d => { x0 = Math.min(x0, d.x); x1 = Math.max(x1, d.x); y0 = Math.min(y0, d.y); y1 = Math.max(y1, d.y); });
  const w = W - 2 * padX, h = H - 2 * padY, dx = x1 - x0, dy = y1 - y0;
  let sx = dx > 1e-6 ? w / dx : 0, sy = dy > 1e-6 ? h / dy : 0;
  if (sx && sy) { sx = Math.min(sx, sy * 1.9); sy = Math.min(sy, sx * 1.9); }
  nodes.forEach(d => { d.x = W / 2 + (d.x - (x0 + x1) / 2) * sx; d.y = H / 2 + (d.y - (y0 + y1) / 2) * sy; });
}
// A name stands beside its dot where there is room: right, left, under or over it. Where there is none, it shows only when you point at the dot.
function names(nodes, order, W, H) {
  const taken = [], hit = (a, b) => a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] && b[1] < a[1] + a[3];
  const dots = nodes.map(d => [d.x - d.r - 2, d.y - d.r - 2, 2 * d.r + 4, 2 * d.r + 4]);
  for (const i of order) {
    const d = nodes[i], w = d.label.length * 6.4 + 4, h = 14, g = d.r + 5;
    const tries = [
      ["start", d.x + g, d.y + 4, [d.x + g, d.y - h / 2, w, h]],
      ["end", d.x - g, d.y + 4, [d.x - g - w, d.y - h / 2, w, h]],
      ["middle", d.x, d.y + d.r + 14, [d.x - w / 2, d.y + d.r + 3, w, h]],
      ["middle", d.x, d.y - d.r - 5, [d.x - w / 2, d.y - d.r - h - 2, w, h]],
    ];
    const free = tries.find(t => t[3][0] >= 3 && t[3][0] + w <= W - 3 && t[3][1] >= 2 && t[3][1] + h <= H - 2 && !taken.some(b => hit(t[3], b)) && !dots.some((b, j) => j !== i && hit(t[3], b)));
    const at = free || (d.x > W * 0.6 ? tries[1] : tries[0]);
    d.anchor = at[0]; d.lx = at[1]; d.ly = at[2]; d.named = !!free;
    if (free) taken.push(free[3]);
  }
}
function draw(box) {
  const holder = box.querySelector('script[type="application/json"]');
  if (!holder) return;
  const data = JSON.parse(holder.textContent), W = Math.round(box.clientWidth), H = Math.round(box.clientHeight);
  if (!W || !H || !data.nodes.length) return;
  const old = box.querySelector("svg"); if (old) old.remove();
  const nodes = data.nodes.map(d => ({ ...d, r: 3.2 + Math.sqrt(d.n) * 1.5, label: short(d.t) })), at = new Map(nodes.map((d, i) => [d.id, i]));
  const edges = data.links.map(l => [at.get(l.s), at.get(l.t)]).filter(e => e[0] != null && e[1] != null);
  place(nodes, edges);
  fit(nodes, W, H, Math.max(36, Math.min(84, W * 0.11)), 30);
  const near = nodes.map(() => new Set());
  edges.forEach(([a, b]) => { near[a].add(b); near[b].add(a); });
  // the note you are on is named first, then the best linked ones. With very many notes only the first few dozen are tried.
  const order = nodes.map((d, i) => i).sort((a, b) => (nodes[b].id === data.me) - (nodes[a].id === data.me) || nodes[b].n - nodes[a].n);
  names(nodes, order.slice(0, 60), W, H);
  order.slice(60).forEach(i => { const d = nodes[i], left = d.x > W * 0.6; d.anchor = left ? "end" : "start"; d.lx = d.x + (left ? -1 : 1) * (d.r + 5); d.ly = d.y + 4; d.named = false; });

  const svg = el("svg", { viewBox: "0 0 " + W + " " + H, width: W, height: H, class: "sb-g", role: "img", "aria-label": box.getAttribute("aria-label") || "" }, box);
  const lines = edges.map(([a, b]) => el("line", { x1: nodes[a].x, y1: nodes[a].y, x2: nodes[b].x, y2: nodes[b].y }, svg));
  const dots = nodes.map(d => {
    const a = el("a", { href: d.u, class: "n" + (d.id === data.me ? " me" : "") + (d.named ? " named" : "") }, svg);
    el("circle", { cx: d.x, cy: d.y, r: d.r }, a);
    el("text", { x: d.lx, y: d.ly, "text-anchor": d.anchor }, a).textContent = d.label;
    el("title", {}, a).textContent = d.t;
    return a;
  });
  const light = i => {
    svg.classList.toggle("hot", i != null);
    dots.forEach((a, j) => a.classList.toggle("on", i != null && (j === i || near[i].has(j))));
    lines.forEach((l, j) => l.classList.toggle("on", i != null && (edges[j][0] === i || edges[j][1] === i)));
  };
  dots.forEach((a, i) => {
    a.addEventListener("pointerenter", () => light(i));
    a.addEventListener("pointerleave", () => light(null));
    a.addEventListener("focus", () => light(i));
    a.addEventListener("blur", () => light(null));
  });
}

/* ---------- looking through the notes ----------
   The words of all notes are fetched once. A note is found when every word you typed is in it somewhere.
   A word in the title counts most, then one in the topics, then one in the text. */
let loading = null;
const load = src => loading || (loading = fetch(src).then(r => r.json()).then(list => list.map(n => ({ ...n, lt: n.t.toLowerCase(), lg: n.g.join(" ").toLowerCase(), lx: n.x.toLowerCase() }))));
const wordsOf = text => text.toLowerCase().split(/\s+/).filter(Boolean);
function find(notes, words) {
  const found = [];
  for (const n of notes) {
    let score = 0, ok = true;
    for (const w of words) {
      const inTitle = n.lt.includes(w), inTopics = n.lg.includes(w), inText = n.lx.includes(w);
      if (!inTitle && !inTopics && !inText) { ok = false; break; }
      score += (inTitle ? 10 : 0) + (n.lt.startsWith(w) ? 4 : 0) + (inTopics ? 5 : 0) + (inText ? Math.min(4, n.lx.split(w).length - 1) : 0);
    }
    if (ok) found.push([score, n]);
  }
  return found.sort((a, b) => b[0] - a[0] || a[1].t.localeCompare(b[1].t)).map(f => f[1]);
}
// the words around the first place a word was found, with the found words marked
function around(n, words, length) {
  let first = -1;
  for (const w of words) { const i = n.lx.indexOf(w); if (i >= 0 && (first < 0 || i < first)) first = i; }
  const from = first < 0 ? 0 : Math.max(0, first - 60), piece = n.x.slice(from, from + length);
  const html = esc((from > 0 ? "…" : "") + piece + (from + length < n.x.length ? "…" : ""));
  // all words in one pass, the longest first, so a mark is never put inside another
  const any = [...words].sort((a, b) => b.length - a.length).map(w => esc(w).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  return html.replace(new RegExp("(" + any + ")", "gi"), "<mark>$1</mark>");
}

// the Search page: every note that has the words, with the place where they were found
function searchPage() {
  const box = $("#sb-big"), out = $("#sb-results"), count = $("#sb-count");
  if (!box || !out || box.dataset.ready) return;
  box.dataset.ready = "1";
  const look = notes => {
    const words = wordsOf(box.value);
    if (!words.length) { out.innerHTML = ""; count.textContent = ""; return; }
    const found = find(notes, words);
    count.textContent = found.length === 0 ? "Nothing found." : found.length === 1 ? "1 note." : found.length + " notes.";
    out.innerHTML = found.map(n => '<li><a href="' + esc(n.u) + '"><span class="s-when"><time>' + esc(n.d) + "</time>" + (n.g.length ? '<span class="s-k">' + esc(n.g.join(", ")) + "</span>" : "") +
      '</span><span><b class="s-t"><span>' + esc(n.t) + '</span></b><span class="s-l">' + around(n, words, 190) + "</span></span></a></li>").join("");
    const url = new URL(location.href);
    url.searchParams.set("q", box.value);
    history.replaceState(null, "", url);
  };
  const go = () => load(box.dataset.src).then(look);
  box.addEventListener("input", go);
  const asked = new URLSearchParams(location.search).get("q");
  if (asked) box.value = asked;
  box.focus();
  go();
}

// under the links: while you type in the search box, the list of topics makes room for what was found.
// On a small screen that list folds away behind a button.
function column() {
  const box = $("#sb-q"), found = $("#sb-found"), links = $("#sb-links"), menu = $("#sb-menu"), nav = $("[data-brain-nav]");
  if (!box || !found || !links || box.dataset.ready) return;
  box.dataset.ready = "1";
  const show = notes => {
    const words = wordsOf(box.value);
    found.hidden = !words.length; links.classList.toggle("away", !!words.length);
    if (!words.length) { found.innerHTML = ""; return; }
    const list = find(notes, words), more = list.length - 8;
    found.innerHTML = list.length
      ? "<ul>" + list.slice(0, 8).map(n => '<li><a href="' + esc(n.u) + '">' + esc(n.t) + "</a></li>").join("") + "</ul>" +
        '<p><a href="' + esc(box.dataset.all + "?q=" + encodeURIComponent(box.value)) + '">' + (more > 0 ? "All " + list.length + " notes found" : "See where the words are") + "</a></p>"
      : "<p>Nothing found.</p>";
  };
  box.addEventListener("input", () => load(box.dataset.src).then(show));
  box.addEventListener("keydown", e => {
    if (e.key !== "Escape") return;
    box.value = ""; found.hidden = true; found.innerHTML = ""; links.classList.remove("away"); box.blur();
  });
  if (menu && nav) {
    menu.hidden = false;
    menu.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      menu.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }
}

let wired = false;
export function start() {
  Array.from(document.querySelectorAll("[data-graph]")).forEach(draw);
  searchPage();
  column();
  if (wired) return;
  wired = true;
  // "/" goes to the search box
  document.addEventListener("keydown", e => {
    if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey) return;
    const at = document.activeElement;
    if (at && (at.tagName === "INPUT" || at.tagName === "TEXTAREA" || at.isContentEditable)) return;
    const to = $("#sb-big") || $("#sb-q");
    if (!to) return;
    e.preventDefault();
    to.focus();
  });
  // a new width of the window: draw the maps again, once the dragging has stopped
  let wait = null, last = window.innerWidth;
  window.addEventListener("resize", () => {
    if (Math.abs(window.innerWidth - last) < 24) return;
    clearTimeout(wait);
    wait = setTimeout(() => { last = window.innerWidth; Array.from(document.querySelectorAll("[data-graph]")).forEach(draw); }, 160);
  });
}
