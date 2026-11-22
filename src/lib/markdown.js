// The formatter for posts and write-ups: Markdown with a few extras (notes, tables with captions, footnotes,
// small formulas, code coloured the Dracula way, parts that open on a click).
// Text is escaped before anything else, so it cannot inject markup. It runs when the site is built,
// and in the browser for the preview in Settings.
import { esc, attr, plain, safeUrl } from "./html.js";
import { FIG } from "./figures.js";

// where a picture and a link lead, and the word on the copy button. The site and Settings set these.
const opts = { img: u => u, link: u => u, copy: "Copy" };
export function setup(o) { Object.assign(opts, o); }

const KEYWORDS = {
  python: "and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield",
  js: "async await break case catch class const continue default delete do else export extends finally for from function if import in instanceof let new of return static super switch this throw try typeof var void while yield",
  bash: "case do done elif else esac export fi for function if in local return then until while"
};
const CONSTANTS = "True False None true false null undefined NaN Infinity";
const BUILTINS = "abs all any bool bytes dict enumerate filter float format frozenset getattr hasattr int isinstance iter len list map max min next object open print range repr reversed round set setattr sorted str sum super tuple type zip console document window Math JSON Object Array String Number Promise";
const LANG = { py: "python", python: "python", js: "js", javascript: "js", ts: "js", typescript: "js", json: "js", sh: "bash", bash: "bash", shell: "bash", zsh: "bash", yaml: "hash", yml: "hash", toml: "hash", r: "hash" };
// the typeface for code is fetched the first time a text holds code, and only if the site uses web fonts at all
// code is coloured the Dracula way: c comment, s quoted text, k keyword, n number or constant, f function, b built-in, t class, a flag, v variable.
// A mark never runs over the end of a line, so every line can stand on its own.
function tint(code, lang) {
  const L = LANG[String(lang || "").toLowerCase()];
  if (!L) return plain(code);
  const words = (KEYWORDS[L] || "").split(" "), consts = CONSTANTS.split(" "), built = BUILTINS.split(" ");
  const put = (cls, text) => text.split("\n").map(x => '<span class="' + cls + '">' + plain(x) + "</span>").join("\n");
  const re = L === "python" ? /(#[^\n]*)|((?:[rbfuRBFU]{1,2})?(?:"""[\s\S]*?"""|\'\'\'[\s\S]*?\'\'\'|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'))|(@[A-Za-z_][\w.]*)|(\b\d[\d_]*(?:\.\d+)?(?:[eE][+-]?\d+)?\b)|([A-Za-z_]\w*)/g
    : L === "js" ? /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`)|(@[A-Za-z_][\w.]*)|(\b\d[\d_]*(?:\.\d+)?\b)|([A-Za-z_$][\w$]*)/g
    : L === "bash" ? /((?<![\w$])#[^\n]*)|("(?:\\.|[^"\\\n])*"|'[^'\n]*')|(\$\{[^}\n]*\}|\$[A-Za-z_]\w*)|((?<=\s)--?[A-Za-z][\w-]*)|([.~\/]?[A-Za-z_][\w.\/-]*)/g
    : /(#[^\n]*)|("(?:\\.|[^"\\\n])*"|'[^'\n]*')|(\u0000)|(\b\d[\d_.]*\b)|([A-Za-z_][\w.-]*)/g;
  let out = "", last = 0, m, after = "";
  while ((m = re.exec(code))) {
    const gap = code.slice(last, m.index); out += plain(gap); last = re.lastIndex;
    const w = m[5], rest = code.slice(last), start = /(^|\n)[ \t]*$/.test(code.slice(0, m.index));
    if (m[1]) out += put("c", m[1]);
    else if (m[2]) out += put("s", m[2]);
    else if (m[3]) out += put(L === "bash" ? "n" : "f", m[3]);
    else if (m[4]) out += put(L === "bash" ? "a" : "n", m[4]);
    else if (L === "bash") out += words.indexOf(w) >= 0 ? put("k", w) : start ? put("f", w) : plain(w);
    else if (L === "hash") out += /^\s*[:=]/.test(rest) && start ? put("b", w) : consts.indexOf(w) >= 0 ? put("n", w) : plain(w);
    else if (words.indexOf(w) >= 0) out += put("k", w);
    else if (consts.indexOf(w) >= 0) out += put("n", w);
    else if (after === "def" || after === "function") out += put("f", w);
    else if (after === "class") out += put("t", w);
    else if (w === "self" || w === "cls" || w === "this") out += put("v", w);
    else if (built.indexOf(w) >= 0) out += put("b", w);
    else if (/^\s*\(/.test(rest)) out += put("f", w);
    else out += plain(w);
    if (w) after = w;
  }
  return out + plain(code.slice(last));
}
// small formulas without a typesetting library: single letters slanted, _ lowers, ^ raises, \name gives a symbol
const SYMBOL = { alpha: "α", beta: "β", gamma: "γ", delta: "δ", epsilon: "ε", theta: "θ", lambda: "λ", mu: "μ", pi: "π", rho: "ρ", sigma: "σ", tau: "τ", phi: "φ", omega: "ω", Delta: "Δ", Sigma: "Σ", Omega: "Ω",
  sum: "∑", prod: "∏", le: "≤", leq: "≤", ge: "≥", geq: "≥", ne: "≠", neq: "≠", approx: "≈", times: "×", cdot: "·", pm: "±", infty: "∞", to: "→", rightarrow: "→", in: "∈", partial: "∂", sqrt: "√", ldots: "…", dots: "…", half: "½", quad: " ", left: "", right: "" };
function maths(src) {
  const keep = [], hold = w => { keep.push(w); return "\u0002" + (keep.length - 1) + "\u0002"; };
  let t = plain(String(src).trim()).replace(/\\(?:text|mathrm|operatorname)\s*\{([^{}]*)\}/g, (m, w) => hold(w));
  t = t.replace(/\\frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, "($1)/($2)").replace(/\\([A-Za-z]+)/g, (m, n) => n in SYMBOL ? SYMBOL[n] : n).replace(/\\,/g, " ").replace(/-/g, "−");
  t = t.replace(/_\{([^{}]*)\}|_([A-Za-z0-9])/g, (m, a, b) => "\u0003" + (a == null ? b : a) + "\u0004").replace(/\^\{([^{}]*)\}|\^([A-Za-z0-9])/g, (m, a, b) => "\u0005" + (a == null ? b : a) + "\u0006");
  t = t.replace(/&[a-z]+;|[A-Za-z]+/g, w => w.charAt(0) === "&" || w.length > 1 ? w : "<i>" + w + "</i>");
  return t.replace(/\u0003/g, "<sub>").replace(/\u0004/g, "</sub>").replace(/\u0005/g, "<sup>").replace(/\u0006/g, "</sup>").replace(/\u0002(\d+)\u0002/g, (m, i) => keep[i]);
}
export function inline(src, ctx) {
  const keep = [];
  const hold = html => { keep.push(html); return "\u0001" + (keep.length - 1) + "\u0001"; };
  const fmt = t => esc(t).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/(^|[^*\w])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>").replace(/(^|[^\w])_([^_\s][^_]*)_(?!\w)/g, "$1<em>$2</em>")
    .replace(/==([^=\s][^=]*)==/g, "<mark>$1</mark>").replace(/~~([^~\s][^~]*)~~/g, "<s>$1</s>");
  let t = String(src).replace(/`([^`]+)`/g, (m, c) => { return hold("<code>" + plain(c) + "</code>"); });
  t = t.replace(/(^|[^\\$\w])\$([^\s$](?:[^$\n]*?[^\s$])?)\$(?![\w$])/g, (m, pre, f) => pre + hold('<span class="s-math">' + maths(f) + "</span>"));
  if (ctx) t = t.replace(/\[\^([^\]\s]+)\]/g, (m, id) => {          // a footnote mark. Its number is the order of first use.
    if (!(id in ctx.notes)) return m;
    let n = ctx.order.indexOf(id); if (n < 0) { ctx.order.push(id); n = ctx.order.length - 1; }
    const k = (ctx.used[id] = (ctx.used[id] || 0) + 1);
    return hold('<sup class="s-fn"><button type="button" data-zdo="jump" data-id="fn-' + (n + 1) + '"' + (k === 1 ? ' id="fnref-' + (n + 1) + '"' : "") + ">" + (n + 1) + "</button></sup>");
  });
  t = t.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (m, alt, url) => hold('<img src="' + attr(opts.img(safeUrl(url))) + '" alt="' + attr(alt) + '" loading="lazy">'));
  t = t.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, words, url) => hold('<a href="' + attr(opts.link(safeUrl(url))) + '">' + fmt(words) + "</a>"));
  t = t.replace(/(^|[\s(])(https?:\/\/[^\s<>()]*[^\s<>().,;:!?])/g, (m, pre, url) => pre + hold('<a href="' + attr(url) + '">' + plain(url) + "</a>"));
  return fmt(t).replace(/\u0001(\d+)\u0001/g, (m, i) => keep[i]);
}
const BLOCK = /^(```|#{1,3}\s|>\s?|\s*[-*+]\s+|\s*\d+[.)]\s+|(-{3,}|\*{3,})\s*$|:::|\$\$)/;
const ITEM = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/, RULE = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;
const cells = l => { const c = l.trim().replace(/^\|/, "").replace(/\|$/, "").split(/(?<!\\)\|/).map(x => x.trim().replace(/\\\|/g, "|")); return c; };
const CALL = { note: "Note", tip: "Tip", important: "Important", warning: "Warning", caution: "Caution" };
export function md(text, ctx) {
  const top = !ctx;
  ctx = ctx || { ids: {}, notes: {}, order: [], used: {} };
  let lines = String(text || "").replace(/\r\n?/g, "\n").split("\n");
  const blank = l => /^\s*$/.test(l);
  if (top) {          // footnotes are taken out first: "[^name]: the note", and indented lines carry it on
    const rest = []; let fence = false;
    for (let k = 0; k < lines.length; k++) {
      if (/^```/.test(lines[k])) fence = !fence;
      const d = fence ? null : /^\[\^([^\]\s]+)\]:\s*(.*)$/.exec(lines[k]);
      if (!d) { rest.push(lines[k]); continue; }
      let note = d[2];
      while (k + 1 < lines.length && /^\s{2,}\S/.test(lines[k + 1])) note += " " + lines[++k].trim();
      ctx.notes[d[1]] = note;
    }
    lines = rest;
  }
  let out = "", i = 0;
  while (i < lines.length) {
    const l = lines[i];
    if (blank(l)) { i++; continue; }
    if (/^```/.test(l)) {          // code: the first word after the marks is the language, the rest is a title
      const info = l.replace(/^`+/, "").trim(), sp = info.search(/\s/), lang = sp < 0 ? info : info.slice(0, sp), title = sp < 0 ? "" : info.slice(sp + 1).trim(), buf = []; i++;
      while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
      i++;
      out += '<figure class="s-code"><figcaption><span>' + plain(title || lang) + '</span><button type="button" class="s-copy" data-zdo="copy">' + esc(opts.copy || "Copy") + "</button></figcaption><pre><code>" + tint(buf.join("\n"), lang).split("\n").map((row, k) => '<span class="l" style="--in:' + /^\s*/.exec(buf[k] || "")[0].replace(/\t/g, "    ").length + 'ch">' + row + "</span>").join("") + "</code></pre></figure>";          // each line is its own row, so a long one can fold under itself
      continue;
    }
    if (/^\$\$/.test(l)) {          // a formula on its own line
      let f = l.replace(/^\$\$/, ""); i++;
      if (/\$\$\s*$/.test(f)) f = f.replace(/\$\$\s*$/, ""); else { while (i < lines.length && !/\$\$\s*$/.test(lines[i])) f += " " + lines[i++]; if (i < lines.length) f += " " + lines[i++].replace(/\$\$\s*$/, ""); }
      out += '<p class="s-math b">' + maths(f) + "</p>"; continue;
    }
    if (/^:::/.test(l)) {          // a part that opens on a click: "::: details Title" ... ":::"
      const title = l.replace(/^:::\s*(details)?\s*/i, "").trim(), buf = []; i++;
      while (i < lines.length && !/^:::\s*$/.test(lines[i])) buf.push(lines[i++]);
      i++;
      out += '<details class="s-fold"><summary>' + inline(title || "More", ctx) + "</summary>" + md(buf.join("\n"), ctx) + "</details>"; continue;
    }
    const h = /^(#{1,3})\s+(.*)$/.exec(l);
    if (h) {
      const n = h[1].length + 1, words = h[2].replace(/\s+#+\s*$/, "");
      let id = words.toLowerCase().replace(/[`*_=~\[\]()]/g, "").replace(/[^a-z0-9À-￿]+/g, "-").replace(/^-+|-+$/g, "") || "part";
      if (ctx.ids[id]) id += "-" + (++ctx.ids[id]); else ctx.ids[id] = 1;
      out += "<h" + n + ' id="' + attr(id) + '" tabindex="-1">' + inline(words, ctx) + "</h" + n + ">"; i++; continue;
    }
    if (/^(-{3,}|\*{3,})\s*$/.test(l)) { out += "<hr>"; i++; continue; }
    if (/^>\s?/.test(l)) {
      const buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) buf.push(lines[i++].replace(/^>\s?/, ""));
      const c = /^\[!(\w+)\]\s*(.*)$/.exec(buf[0] || "");
      if (c && CALL[c[1].toLowerCase()]) out += '<aside class="s-call ' + c[1].toLowerCase() + '"><p class="s-call-t">' + inline(c[2] || CALL[c[1].toLowerCase()], ctx) + "</p>" + md(buf.slice(1).join("\n"), ctx) + "</aside>";          // a boxed note
      else out += "<blockquote>" + md(buf.join("\n"), ctx) + "</blockquote>";
      continue;
    }
    const pic = /^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)\s*$/.exec(l);
    if (pic) {          // a picture on its own line is a figure. "fig:name" is one of the drawings.
      const draw = /^fig:(\w+)$/.exec(pic[2]);
      if (draw && FIG[draw[1]]) out += '<figure class="z-fig fig">' + FIG[draw[1]]() + (pic[1] ? "<figcaption>" + inline(pic[1], ctx) + "</figcaption>" : "") + "</figure>";
      else out += '<figure class="s-figure"><img src="' + attr(opts.img(safeUrl(pic[2]))) + '" alt="' + attr(pic[1]) + '" loading="lazy">' + (pic[3] ? "<figcaption>" + inline(pic[3], ctx) + "</figcaption>" : "") + "</figure>";
      i++; continue;
    }
    if (l.indexOf("|") >= 0 && i + 1 < lines.length && RULE.test(lines[i + 1]) && lines[i + 1].indexOf("-") >= 0) {          // a table
      const head = cells(l), side = cells(lines[i + 1]).map(c => /^:-+:$/.test(c) ? "c" : /-:$/.test(c) ? "r" : ""), rows = []; i += 2;
      while (i < lines.length && !blank(lines[i]) && lines[i].indexOf("|") >= 0) rows.push(cells(lines[i++]));
      let cap = "";
      if (i < lines.length && /^:\s+\S/.test(lines[i])) cap = lines[i++].replace(/^:\s+/, "");
      const td = (tag, c, k) => "<" + tag + (side[k] ? ' class="' + side[k] + '"' : "") + ">" + inline(c == null ? "" : c, ctx) + "</" + tag + ">";
      out += '<figure class="s-table' + (head.length > 2 && rows.every(r => String(r[0] || "").length <= 26) ? " s-keys" : "") + '"><div class="s-scroll"><table><thead><tr>' + head.map((c, k) => td("th", c, k)).join("") + "</tr></thead><tbody>" + rows.map(r => "<tr>" + head.map((c, k) => td("td", r[k], k)).join("") + "</tr>").join("") + "</tbody></table></div>" + (cap ? "<figcaption>" + inline(cap, ctx) + "</figcaption>" : "") + "</figure>";
      continue;
    }
    const first = ITEM.exec(l);
    if (first) {          // a list. Lines set further in belong to the item above them, and may be a list of their own.
      const base = first[1].length, ordered = /\d/.test(first[2]), items = [];
      while (i < lines.length) {
        const m = ITEM.exec(lines[i]);
        if (m && m[1].length <= base + 1 && /\d/.test(m[2]) === ordered) { items.push({ text: m[3], more: [] }); i++; }
        else if (items.length && !blank(lines[i]) && /^\s+/.exec(lines[i]) && /^\s+/.exec(lines[i])[0].length > base + 1) { items[items.length - 1].more.push(lines[i]); i++; }
        else break;
      }
      const start = ordered ? parseInt(first[2], 10) : 1;
      out += "<" + (ordered ? "ol" + (start !== 1 ? ' start="' + start + '"' : "") : "ul") + ">" + items.map(it => {
        const cut = Math.min.apply(null, it.more.map(x => /^\s*/.exec(x)[0].length).concat(99)), more = it.more.map(x => x.slice(cut === 99 ? 0 : cut));
        let words = it.text, k = 0;
        while (k < more.length && !BLOCK.test(more[k])) words += "\n" + more[k++].trim();
        const task = /^\[([ xX])\]\s+/.exec(words);
        return "<li" + (task ? ' class="s-task"><i class="s-dot' + (task[1] === " " ? "" : " read") + '"></i>' : ">") + inline(task ? words.slice(task[0].length) : words, ctx).replace(/\n/g, "<br>") + (k < more.length ? md(more.slice(k).join("\n"), ctx) : "") + "</li>";
      }).join("") + "</" + (ordered ? "ol" : "ul") + ">";
      continue;
    }
    const buf = [lines[i++]];      // a paragraph runs to the next blank line or the next block
    while (i < lines.length && !blank(lines[i]) && !BLOCK.test(lines[i])) buf.push(lines[i++]);
    out += "<p>" + inline(buf.join("\n"), ctx).replace(/\n/g, "<br>") + "</p>";
  }
  if (top && ctx.order.length) out += '<section class="s-notes"><ol>' + ctx.order.map((id, n) => '<li id="fn-' + (n + 1) + '" tabindex="-1">' + inline(ctx.notes[id], ctx) + ' <button type="button" class="s-back" data-zdo="jump" data-id="fnref-' + (n + 1) + '" aria-label="Back to the text">↩</button></li>').join("") + "</ol></section>";
  return out;
}
// an entry file starts with four "key: value" lines, then an empty line, then the text
// A post file: a few lines about the post, then its text.
// The lines stand between two rows of --- like in any Markdown tool. The older form, without the rows, is read too.
export function splitPost(text) {
  const lines = String(text || "").replace(/^﻿/, "").replace(/\r\n?/g, "\n").split("\n"), meta = {};
  const fenced = lines[0].trim() === "---", KEY = /^(title|date|draft|teaser|topic):/;
  let i = fenced ? 1 : 0;
  while (i < lines.length && (fenced ? lines[i].trim() !== "---" : KEY.test(lines[i]))) {
    const k = lines[i].indexOf(":");
    if (k > 0 && /^[A-Za-z_][\w-]*$/.test(lines[i].slice(0, k).trim())) {
      let v = lines[i].slice(k + 1).trim();
      if (/^".*"$/.test(v)) { try { v = JSON.parse(v); } catch (e) { v = v.slice(1, -1); } }
      else if (/^'.*'$/.test(v)) v = v.slice(1, -1).replace(/''/g, "'");
      meta[lines[i].slice(0, k).trim()] = v;
    }
    i++;
  }
  if (fenced && i < lines.length) i++;          // the closing row
  return { meta: meta, body: lines.slice(i).join("\n").replace(/^\n+/, "") };
}
// the same, the other way round: the lines about a post, written so that any Markdown tool can read them
export function joinPost(meta, body) {
  const val = v => { v = String(v === undefined || v === null ? "" : v).replace(/\s*\n\s*/g, " ").trim(); return v !== "true" && v !== "false" && /^[\s"'#>|&*!%@`\[\]{},-]|:\s|\s#|^(null|yes|no|~)?$/i.test(v) ? JSON.stringify(v) : v; };
  return "---\n" + Object.keys(meta).filter(k => meta[k] !== undefined && meta[k] !== null && !(k === "topic" && !meta[k])).map(k => k + ": " + val(meta[k])).join("\n") + "\n---\n\n" + String(body || "").replace(/\s+$/, "") + "\n";
}
