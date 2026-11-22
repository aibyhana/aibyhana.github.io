// The six drawings of the research projects. Each is drawn from coordinates, so the geometry is exact.
const CIRCUIT = {
  dup: [[0, 1], [0, 10], [3, 0]], prev: [[2, 2], [4, 11]], ind: [[5, 5], [5, 8], [5, 9], [6, 9]],
  sinh: [[7, 3], [7, 9], [8, 6], [8, 10]], nm: [[9, 6], [9, 9], [10, 0]], neg: [[10, 7], [11, 10]],
  backup: [[9, 0], [9, 7], [10, 1], [10, 2], [10, 6], [10, 10], [11, 2], [11, 9]]
};
const CLASS_OF = {};
Object.keys(CIRCUIT).forEach(k => CIRCUIT[k].forEach(p => { CLASS_OF[p[0] + "," + p[1]] = k; }));



const P = (x, y) => x.toFixed(1) + " " + y.toFixed(1);
const svg = inner => '<svg viewBox="0 0 240 150" aria-hidden="true">' + inner + "</svg>";
function arrow(x, y, ang, cls, size) {
  const s = size || 5.5, a1 = ang + Math.PI * 0.82, a2 = ang - Math.PI * 0.82;
  return '<path class="ln ' + (cls || "") + '" d="M' + P(x + s * Math.cos(a1), y + s * Math.sin(a1)) + "L" + P(x, y) + "L" + P(x + s * Math.cos(a2), y + s * Math.sin(a2)) + '"/>';
}
function figAblate() {
  // v is the direction being removed. u spans the plane orthogonal to it.
  const th = -35 * Math.PI / 180, v = [Math.cos(th), Math.sin(th)], u = [-v[1], v[0]], O = [118, 77];
  const at = (s, t) => [O[0] + s * u[0] + t * v[0], O[1] + s * u[1] + t * v[1]];
  const pts = [[-50, 34], [-31, -30], [-12, 47], [9, -41], [25, 29], [41, -23], [53, 43]];
  const a = at(-66, 0), b = at(66, 0), tip = at(0, 60);
  let o = '<path class="ln" d="M' + P(a[0], a[1]) + "L" + P(b[0], b[1]) + '"/>';
  pts.forEach(q => { const p = at(q[0], q[1]), r = at(q[0], 0); o += '<path class="ln fa da" d="M' + P(p[0], p[1]) + "L" + P(r[0], r[1]) + '"/>'; });
  o += '<path class="ln b" d="M' + P(O[0], O[1]) + "L" + P(tip[0], tip[1]) + '"/>' + arrow(tip[0], tip[1], th, "b");
  pts.forEach(q => {
    const p = at(q[0], q[1]), r = at(q[0], 0);
    o += '<circle class="fi" cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="2.7"/><circle class="fp" cx="' + r[0].toFixed(1) + '" cy="' + r[1].toFixed(1) + '" r="2.8"/>';
  });
  return svg(o + '<text class="tb" x="' + (tip[0] + 6).toFixed(1) + '" y="' + (tip[1] - 2).toFixed(1) + '">v</text>');
}
function figLeak() {
  const lane = (y, xs, hot, label) => {
    let o = '<text x="24" y="' + (y - 16) + '">' + label + '</text><path class="ln fa" d="M24 ' + y + 'H216"/>';
    xs.forEach((x, i) => { o += '<rect class="' + (i === hot ? "fi" : "fp") + '" x="' + x + '" y="' + (y - 6) + '" width="22" height="12"/>'; });
    return o;
  };
  // the source block in run A sits earlier in time than its copy in run B
  let o = lane(46, [40, 74, 120, 168], 1, "run A") + lane(104, [54, 100, 146, 188], 2, "run B");
  o += '<path class="ln b da" d="M85 54C90 80 152 70 157 95"/>' + arrow(157, 96, Math.atan2(25, 5), "b");
  return svg(o + '<path class="ln fa" d="M24 134H216"/>' + arrow(216, 134, 0, "fa", 4.5) + '<text x="24" y="146">time</text>');
}
/* The boundary is the perpendicular bisector of the two cluster centres. Every point stays well inside
   half the distance between the centres, so the line always separates the two groups. */
const OFF = [[0, 0], [-14, -10], [12, -14], [18, 6], [-6, 16], [-20, 8], [6, -22], [-10, -22], [20, -8], [8, 18]];
function figProbe() {
  const c1 = [78, 97], c2 = [162, 55];
  const m = [(c1[0] + c2[0]) / 2, (c1[1] + c2[1]) / 2], L = Math.hypot(c2[0] - c1[0], c2[1] - c1[1]);
  const n = [(c2[0] - c1[0]) / L, (c2[1] - c1[1]) / L], d = [-n[1], n[0]];
  const a = [m[0] - 62 * d[0], m[1] - 62 * d[1]], b = [m[0] + 62 * d[0], m[1] + 62 * d[1]];
  let o = '<path class="ln" d="M' + P(a[0], a[1]) + "L" + P(b[0], b[1]) + '"/>';
  OFF.forEach(q => { o += '<circle class="fp" cx="' + (c1[0] + q[0]) + '" cy="' + (c1[1] + q[1]) + '" r="2.9"/>'; });
  OFF.forEach(q => { o += '<circle class="fi" cx="' + (c2[0] + q[1]) + '" cy="' + (c2[1] - q[0]) + '" r="3.1"/>'; });
  const w0 = [m[0] + 47 * d[0], m[1] + 47 * d[1]], w1 = [w0[0] + 36 * n[0], w0[1] + 36 * n[1]];
  o += '<path class="ln b" d="M' + P(w0[0], w0[1]) + "L" + P(w1[0], w1[1]) + '"/>' + arrow(w1[0], w1[1], Math.atan2(n[1], n[0]), "b");
  return svg(o + '<text class="tb" x="' + (w1[0] + 5).toFixed(1) + '" y="' + (w1[1] + 4).toFixed(1) + '">w</text><text x="40" y="137">honest</text><text x="146" y="19">deceptive</text>');
}
function figIOI() {
  const X = h => 64 + h * 9.6, Y = l => 13 + (11 - l) * 9.6, S = 6.6;
  let o = "";
  for (let l = 0; l < 12; l++) for (let h = 0; h < 12; h++) {
    const k = CLASS_OF[l + "," + h], x = X(h).toFixed(1), y = Y(l).toFixed(1);
    if (k === "nm") o += '<rect class="ln" x="' + (X(h) - 2.2).toFixed(1) + '" y="' + (Y(l) - 2.2).toFixed(1) + '" width="' + (S + 4.4) + '" height="' + (S + 4.4) + '"/>';
    o += '<rect class="' + (!k ? "cell" : k === "backup" ? "fp" : "fi") + '" x="' + x + '" y="' + y + '" width="' + S + '" height="' + S + '"/>';
  }
  return svg(o + '<text x="56" y="' + (Y(0) + 6.4).toFixed(1) + '" text-anchor="end">layer 0</text><text x="56" y="' + (Y(11) + 6.4).toFixed(1) + '" text-anchor="end">layer 11</text>' +
    '<text x="64" y="141">head 0</text><text x="' + (X(11) + S).toFixed(1) + '" y="141" text-anchor="end">11</text>');
}
function figSteer() {
  const y = 60, x0 = 34, step = 15.4, xi = x0 + 5 * step + 4, top = y + 10;
  let o = '<text x="24" y="38">residual stream</text><path class="ln" d="M22 ' + y + 'H218"/>' + arrow(218, y, 0, "");
  for (let i = 0; i < 12; i++) o += '<rect class="fp" x="' + (x0 + i * step).toFixed(1) + '" y="' + (y - 6) + '" width="8" height="12"/>';
  o += '<path class="ln b" d="M' + P(xi, top + 40) + "L" + P(xi, top) + '"/>' + arrow(xi, top, -Math.PI / 2, "b");
  return svg(o + '<text class="tb" x="' + (xi + 10).toFixed(1) + '" y="' + (top + 24) + '">+ c · v</text><text x="' + (xi + 10).toFixed(1) + '" y="' + (top + 37) + '">a scaled steering vector</text>');
}
function figFlip() {
  // the probability on the professor's answer after each turn (first answer, then three users), sketched after Figure 1 of the report
  const X = i => 46 + i * 46, Y = v => 126 - (v - 0.2) * 125, last = [0.45, 0.38, 0.54, 0.85], first = [0.45, 0.86, 0.72, 0.55];
  const line = (v, cls) => '<path class="ln ' + cls + '" d="M' + v.map((q, i) => P(X(i), Y(q))).join("L") + '"/>';
  let o = '<path class="ln fa" d="M30 134H214"/>' + arrow(214, 134, 0, "fa", 4.5) + '<text x="30" y="146">turn</text>' + line(first, "da") + line(last, "b");
  first.forEach((q, i) => { if (i) o += '<circle class="' + (i === 1 ? "fi" : "fp") + '" cx="' + X(i) + '" cy="' + Y(q).toFixed(1) + '" r="3.1"/>'; });
  last.forEach((q, i) => { o += '<circle class="' + (i === 3 ? "fi" : "fp") + '" cx="' + X(i) + '" cy="' + Y(q).toFixed(1) + '" r="3.1"/>'; });
  return svg(o + '<text x="194" y="' + (Y(0.85) - 10).toFixed(1) + '" text-anchor="end">professor last</text><text x="194" y="' + (Y(0.55) + 17).toFixed(1) + '" text-anchor="end">professor first</text>');
}
export const FIG = { ablate: figAblate, leak: figLeak, probe: figProbe, ioi: figIOI, steer: figSteer, flip: figFlip };
