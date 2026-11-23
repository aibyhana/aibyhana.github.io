// Settings: the page where the site is edited. It lives at /settings/ and is meant for its owner alone.
//
// It edits the files in public/content. Signed in, every save is one commit to GitHub, made with a token that
// stays in this browser. GitHub then builds the site again, which takes a minute or two.
// Not signed in, on the real address, it shows the sign-in box and nothing else.
// In a preview it is a demo: changes last until the page is reloaded.
//
// B is what the page hands over: small helpers, the content as the site reads it, and reload().
export function install(B) {
  const $ = B.$, $$ = B.$$, esc = B.esc, px = B.px;
  const el = (tag, cls, html) => { const n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; };
  const wait = ms => new Promise(ok => setTimeout(ok, ms));

  /* ---------- sprites: a plant for each day you wrote. It gets bigger as the streak gets longer. ---------- */
  Object.assign(B.PX, {
    grow1: ["..##.##..", "...###...", "....#....", "....#...."],
    grow2: ["..##.##..", "...###...", "....#....", ".##.#.##.", "..#####..", "....#....", "....#...."],
    grow3: ["...###...", "..#####..", "...###...", "....#....", ".##.#.##.", "..#####..", "....#....", "##..#..##", ".#######.", "....#....", "....#...."],
    grow4: ["....#....", "...###...", "...###...", "....#....", ".##.#.##.", "..#####..", "....#....", "##..#..##", ".#######.", "....#....", "....#....", "....#...."],
    grow5: ["...###...", "..#####..", ".###.###.", "..#####..", "...###...", "....#....", ".##.#.##.", "..#####..", "....#....", "##..#..##", ".#######.", "....#....", "....#...."],
    here: ["#####", ".###.", "..#..", ".....", "....."],
    here_b: [".....", "#####", ".###.", "..#..", "....."],
    words: ["#########", "#...#...#", "....#....", "....#....", "....#....", "....#....", "....#....", "...###..."],
    look: ["....#....", "...###...", "..#####..", ".#######.", ".#######.", ".#######.", "..#####..", "...###..."],
    face: ["...###...", "..#####..", "..#####..", "...###...", ".........", "..#####..", ".#######.", ".#######."]
  });
  const stage = n => n >= 7 ? 5 : n >= 5 ? 4 : n >= 3 ? 3 : n;
  // the plant that waits while you write: the same shapes with every other square left out. No lighter shade is used.
  [1, 2, 3, 4, 5].forEach(n => { B.PX["wait" + n] = B.PX["grow" + n].map((r, y) => r.replace(/./g, (c, x) => c === "#" && (x + y) % 2 === 0 ? "#" : ".")); });

  /* ---------- small helpers ---------- */
  const pad = n => (n < 10 ? "0" : "") + n;
  const iso = d => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  const today = () => iso(new Date());
  const dayBefore = s => { const p = s.split("-").map(Number), d = new Date(p[0], p[1] - 1, p[2]); d.setDate(d.getDate() - 1); return iso(d); };
  const slug = t => String(t).toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "entry";
  const words = t => (String(t).trim().match(/\S+/g) || []).length;
  const oneLine = t => String(t || "").replace(/\s*\n\s*/g, " ").trim();
  const sortPosts = list => list.sort((a, b) => (a.date || "") < (b.date || "") ? 1 : (a.date || "") > (b.date || "") ? -1 : 0);
  function uniqueId(date, title, list) {
    const base = date + "-" + slug(title); let id = base, n = 2;
    while (list.some(p => p.id === id)) id = base + "-" + n++;
    return id;
  }
  function grow(t) { t.style.height = "auto"; t.style.height = (t.scrollHeight + 2) + "px"; }
  // a button that asks once more before it acts
  function twice(b, label, fn) {
    if (b.dataset.armed) { delete b.dataset.armed; fn(); return; }
    const old = b.textContent; b.dataset.armed = "1"; b.textContent = label;
    setTimeout(() => { if (b.dataset.armed) { delete b.dataset.armed; b.textContent = old; } }, 4000);
  }
  // a line of feedback. A good one gets the robot beside it.
  function say(node, text, good) { node.innerHTML = (good ? px("bot", 2) : "") + "<span>" + esc(text) + "</span>"; }

  /* ---------- where things are saved ---------- */
  const KEY = "desk", UNSAVED = "desk-unsaved", SEEN = "desk-posts";
  // Paths here are written as the site serves them: content/site.json. In the repo they sit one folder deeper.
  const inRepo = path => "public/" + path;
  let memory = null;                                    // used when the browser has no storage
  function loadSession() { try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { return memory; } }
  function keepSession(s) { memory = s; try { if (s) localStorage.setItem(KEY, JSON.stringify(s)); else { localStorage.removeItem(KEY); localStorage.removeItem(SEEN); } } catch (e) { /* storage is optional */ } }

  // the demo: reads the site's own files, and keeps changes in the page only
  function demoStore() {
    return {
      demo: true,
      read: path => B.readFile(path),
      commit: async (message, changes) => { await wait(400); changes.forEach(c => B.overlay.set(c.path, c.base64 ? c.dataUrl : c.content)); }
    };
  }

  // GitHub: every save is one commit, made through the REST API
  function githubStore(s) {
    const base = "https://api.github.com/repos/" + s.repo;
    const enc = p => p.split("/").map(encodeURIComponent).join("/");
    async function gh(method, url, body, raw) {
      let r;
      try {
        r = await fetch(base + url, {
          method: method, cache: "no-store",
          headers: Object.assign({ Authorization: "Bearer " + s.token, Accept: raw ? "application/vnd.github.raw+json" : "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" }, body ? { "Content-Type": "application/json" } : {}),
          body: body ? JSON.stringify(body) : undefined
        });
      } catch (e) { const err = new Error("network"); err.status = 0; throw err; }
      if (!r.ok) { const err = new Error("GitHub " + r.status); err.status = r.status; throw err; }
      return raw ? r.text() : r.json();
    }
    return {
      demo: false,
      check: async () => (await gh("GET", "")).default_branch,
      read: path => gh("GET", "/contents/" + enc(inRepo(path)) + "?ref=" + encodeURIComponent(s.branch), null, true),
      // the files of a folder, each with the mark GitHub gives its text. A folder that is not there yet is an empty one.
      list: async dir => {
        try { const got = await gh("GET", "/contents/" + enc(inRepo(dir)) + "?ref=" + encodeURIComponent(s.branch)); return (Array.isArray(got) ? got : []).filter(f => f.type === "file").map(f => ({ name: f.name, sha: f.sha })); }
        catch (e) { if (e.status === 404) return []; throw e; }
      },
      commit: async (message, changes) => {
        for (let attempt = 0; ; attempt++) {
          try {
            const ref = await gh("GET", "/git/ref/heads/" + enc(s.branch));
            const head = await gh("GET", "/git/commits/" + ref.object.sha);
            const tree = [];
            for (const c of changes) {
              if (c.content === null) tree.push({ path: inRepo(c.path), mode: "100644", type: "blob", sha: null });
              else if (c.base64) { const blob = await gh("POST", "/git/blobs", { content: c.base64, encoding: "base64" }); tree.push({ path: inRepo(c.path), mode: "100644", type: "blob", sha: blob.sha }); }
              else tree.push({ path: inRepo(c.path), mode: "100644", type: "blob", content: c.content });
            }
            const made = await gh("POST", "/git/trees", { base_tree: head.tree.sha, tree: tree });
            const commit = await gh("POST", "/git/commits", { message: message, tree: made.sha, parents: [ref.object.sha] });
            await gh("PATCH", "/git/refs/heads/" + enc(s.branch), { sha: commit.sha });
            break;
          } catch (e) {
            if (attempt < 1 && (e.status === 409 || e.status === 422)) continue;      // someone else saved in between: try once more
            throw e;
          }
        }
        // the site itself is built again, which takes a minute or two. Until then this page shows what was just saved.
        changes.forEach(c => B.overlay.set(c.path, c.base64 ? c.dataUrl : c.content));
      }
    };
  }
  function why(e) {
    if (e && e.status === 401) return "GitHub did not accept the token. It may have expired. Sign out and paste a new one.";
    if (e && (e.status === 403 || e.status === 404)) return "The token cannot change this repo. Check that it covers the repo and that Contents is set to Read and write.";
    if (e && e.status === 0) return "GitHub could not be reached. Nothing was lost. Try again in a moment.";
    return "That did not work (" + ((e && (e.status || e.message)) || "unknown") + "). Nothing was lost.";
  }

  /* ---------- what can be written in an entry or a write-up ---------- */
  const FMT = [
    ["# Heading", "A heading. ## and ### make smaller ones. With three or more headings the text gets a list of contents at the side."],
    ["**bold**   *italic*   ==marked==   ~~struck~~", "Marks inside a sentence. Marked text gets the highlighter."],
    ["[words](https://address)", "A link."],
    ["- one\n- two\n  - inside two", "A list. Start the lines with 1. 2. 3. for a numbered one. Two spaces in front put a line inside the one above."],
    ["- [x] done\n- [ ] not yet", "A list with dots, full or empty."],
    ["> a quote", "A quote."],
    ["> [!NOTE] A title\n> The note.", "A boxed note. NOTE, TIP, IMPORTANT and WARNING work. The title is optional."],
    ["```python lorem/run.py\nprint(1)\n```", "Code with a Copy button. The first word is the language, the rest is a title. Both are optional."],
    ["`code`", "Code inside a sentence."],
    ["| Model | Shift |\n| --- | ---: |\n| A | 0.03 |\n: What the table shows.", "A table. ---: puts a column on the right, :---: in the middle. A line that starts with a colon is the caption."],
    ["A claim.[^1]\n\n[^1]: The note to it.", "A footnote. The notes are numbered and listed at the end."],
    ["![what it shows](address \"A caption.\")", "A picture on its own line, with a caption. The Picture button adds one from your computer."],
    ["![A caption.](fig:flip)", "One of the drawings: leak, ablate, probe, ioi, steer, flip."],
    ["$p_i$\n\n$$TV(p, q) = \\half \\sum_i |p_i - q_i|$$", "A small formula, inside a sentence or on its own line. _ lowers, ^ raises, \\sum \\le \\alpha and so on give symbols."],
    ["::: details A title\nText that stays folded.\n:::", "A part that opens on a click."],
    ["---", "A line across."]
  ];
  /* ---------- writing help, shared by the diary and the long text boxes ---------- */
  // where the caret stands on the screen, measured on a hidden copy of the box
  function caretXY(t) {
    const cs = getComputedStyle(t), m = document.createElement("div"), r = t.getBoundingClientRect();
    ["fontFamily", "fontSize", "fontWeight", "fontStyle", "letterSpacing", "lineHeight", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft", "borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth", "boxSizing", "tabSize", "textIndent", "wordSpacing", "textTransform"].forEach(k => { m.style[k] = cs[k]; });
    m.style.position = "absolute"; m.style.visibility = "hidden"; m.style.left = "-9999px"; m.style.top = "0"; m.style.whiteSpace = "pre-wrap"; m.style.overflowWrap = "break-word"; m.style.width = r.width + "px";
    m.textContent = t.value.slice(0, t.selectionStart);
    const s = document.createElement("span"); s.textContent = "​"; m.appendChild(s); document.body.appendChild(m);
    const at = { x: r.left + s.offsetLeft - t.scrollLeft, y: r.top + s.offsetTop - t.scrollTop, h: s.offsetHeight || parseFloat(cs.lineHeight) || 20 };
    m.remove();
    return at;
  }
  // what the "/" menu offers: name, what it puts in (¦ is where the caret lands), and how it looks in the text
  const SLASH = [
    ["Heading", "# ", "#"], ["Small heading", "## ", "##"], ["List", "- ", "-"], ["Numbered list", "1. ", "1."], ["To-do", "- [ ] ", "[ ]"], ["Quote", "> ", ">"],
    ["Code", "```python\n¦\n```", "```"], ["Table", "| ¦Model | Shift |\n| --- | ---: |\n| A | 0.03 |\n: What the table shows.", "| |"],
    ["Note", "> [!NOTE]\n> ", "[!NOTE]"], ["Tip", "> [!TIP]\n> ", "[!TIP]"], ["Warning", "> [!WARNING]\n> ", "[!WARNING]"],
    ["Fold", "::: details ¦A title\nText that stays folded.\n:::", ":::"], ["Formula", "$$¦$$", "$$"], ["Line", "---\n", "---"], ["Picture", null, "from your computer"]
  ];
  const PAIRS = { "*": "*", "`": "`", "[": "]" };
  function smart(t, opts) {
    opts = opts || {};
    const fire = () => t.dispatchEvent(new Event("input", { bubbles: true }));
    const lineAt = () => { const v = t.value, a = v.lastIndexOf("\n", t.selectionStart - 1) + 1; let b = v.indexOf("\n", t.selectionStart); if (b < 0) b = v.length; return { a: a, b: b, text: v.slice(a, b), before: v.slice(a, t.selectionStart) }; };
    const wrap = (l, r, filler) => { const a = t.selectionStart, b = t.selectionEnd, sel = t.value.slice(a, b) || filler || ""; t.setRangeText(l + sel + r, a, b, "end"); t.setSelectionRange(a + l.length, a + l.length + sel.length); t.focus(); fire(); };
    /* the menu on "/" */
    const all = SLASH.filter(s => s[1] !== null || opts.picture);
    let menu = null, items = [], at = 0, from = -1, shut = -1, asked = null;
    const close = () => { if (menu) { menu.remove(); menu = null; } };
    function pick(s) {
      const end = t.selectionStart; close();
      if (s[1] === null) { t.setRangeText("", from, end, "end"); fire(); opts.picture(); return; }
      const mark = s[1].indexOf("¦"), words = s[1].replace("¦", "");
      t.setRangeText(words, from, end, "end");
      if (mark >= 0) t.setSelectionRange(from + mark, from + mark);
      t.focus(); fire();
    }
    function draw() {
      menu.innerHTML = items.map((s, i) => '<button type="button" role="option" data-i="' + i + '"' + (i === at ? ' class="on" aria-selected="true"' : "") + "><span>" + esc(s[0]) + "</span><i>" + esc(s[2]) + "</i></button>").join("");
      const on = menu.querySelector(".on"); if (on) menu.scrollTop = Math.max(0, on.offsetTop - menu.clientHeight / 2);
    }
    function look() {
      const l = lineAt(), m = /^(\s*)\/([a-z -]{0,18})$/i.exec(l.before);
      if (!m || t.selectionStart !== t.selectionEnd) { close(); shut = -1; return; }
      from = l.a + m[1].length;
      if (shut === from) return;
      const q = m[2].trim().toLowerCase();
      items = all.filter(s => s[0].toLowerCase().indexOf(q) === 0).concat(all.filter(s => s[0].toLowerCase().indexOf(q) > 0));
      if (!items.length) { close(); return; }
      if (q !== asked) at = 0;
      asked = q;
      if (!menu) {
        menu = el("div", "slash"); menu.setAttribute("role", "listbox"); menu.setAttribute("aria-label", "Put in"); document.body.appendChild(menu);
        menu.addEventListener("mousedown", e => { e.preventDefault(); const b = e.target.closest("button"); if (b) pick(items[Number(b.dataset.i)]); });
      }
      draw(); place();
    }
    function place() {          // under the caret, or over it when there is no room below. It follows when the page moves.
      if (!menu) return;
      const c = caretXY(t), r = menu.getBoundingClientRect(), below = c.y + c.h + 6;
      if (c.y < -c.h || c.y > window.innerHeight) { close(); return; }
      menu.style.left = Math.max(8, Math.min(c.x, window.innerWidth - r.width - 8)) + "px";
      menu.style.top = (below + r.height > window.innerHeight - 8 && c.y - r.height - 6 > 8 ? c.y - r.height - 6 : below) + "px";
    }
    t.addEventListener("input", look);
    t.addEventListener("blur", () => setTimeout(close, 150));
    window.addEventListener("scroll", place, { passive: true }); window.addEventListener("resize", place);
    t.addEventListener("keydown", e => {
      if (menu) {
        if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); at = (at + (e.key === "ArrowDown" ? 1 : items.length - 1)) % items.length; draw(); return; }
        if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); e.stopImmediatePropagation(); pick(items[at]); return; }
        if (e.key === "Escape") { e.preventDefault(); e.stopImmediatePropagation(); shut = from; close(); return; }
      }
      if (e.isComposing) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && !e.shiftKey && !e.altKey) {
        const k = e.key.toLowerCase();
        if (k === "b") { e.preventDefault(); wrap("**", "**", "bold"); } else if (k === "i") { e.preventDefault(); wrap("*", "*", "italic"); } else if (k === "k") { e.preventDefault(); wrap("[", "](https://)", "words"); }
        return;
      }
      if (mod || e.altKey) return;
      if (e.key === "Enter" && !e.shiftKey && t.selectionStart === t.selectionEnd) {          // a list, a numbered list, a to-do list and a quote carry on by themselves
        const l = lineAt(), m = /^(\s*)(?:([-*+]) (\[[ xX]\] )?|(\d+)([.)]) |(> ?))/.exec(l.text);
        if (!m || t.selectionStart < l.a + m[0].length) return;
        e.preventDefault();
        if (!l.text.slice(m[0].length).trim()) { t.setRangeText("", l.a, l.b, "end"); fire(); return; }          // an empty line of it ends it
        const next = m[2] ? m[2] + " " + (m[3] ? "[ ] " : "") : m[4] ? (Number(m[4]) + 1) + m[5] + " " : "> ";
        t.setRangeText("\n" + m[1] + next, t.selectionStart, t.selectionEnd, "end"); fire();
        return;
      }
      if (e.key === "Tab") {          // inside a list, Tab moves the line in and Shift+Tab moves it out. Anywhere else Tab still goes to the next box.
        const v = t.value, a = v.lastIndexOf("\n", t.selectionStart - 1) + 1; let b = v.indexOf("\n", t.selectionEnd); if (b < 0) b = v.length;
        const lines = v.slice(a, b).split("\n");
        if (!lines.every(x => /^\s*(?:[-*+] |\d+[.)] )/.test(x))) return;
        e.preventDefault();
        const s0 = t.selectionStart, s1 = t.selectionEnd, out = lines.map(x => e.shiftKey ? x.replace(/^ {1,2}/, "") : "  " + x), d0 = out[0].length - lines[0].length, d = out.join("\n").length - (b - a);
        t.setRangeText(out.join("\n"), a, b, "preserve"); t.setSelectionRange(Math.max(a, s0 + d0), Math.max(a, s1 + d)); fire();
        return;
      }
      if (t.selectionStart !== t.selectionEnd && PAIRS[e.key]) { e.preventDefault(); wrap(e.key, PAIRS[e.key]); }          // typing * ` or [ over marked words wraps them
    });
    t.addEventListener("paste", e => {
      const cd = e.clipboardData; if (!cd) return;
      const img = Array.from(cd.files || []).find(f => /^image\//.test(f.type));
      if (img && opts.addPicture) { e.preventDefault(); opts.addPicture(img); return; }
      const s = (cd.getData("text/plain") || "").trim(), a = t.selectionStart, b = t.selectionEnd;
      if (a !== b && /^https?:\/\/\S+$/.test(s) && !/^https?:\/\//.test(t.value.slice(a, b))) { e.preventDefault(); t.setRangeText("[" + t.value.slice(a, b) + "](" + s + ")", a, b, "end"); fire(); }          // an address pasted over marked words makes them a link
    });
    t.addEventListener("dragover", e => { if (e.dataTransfer && Array.from(e.dataTransfer.types || []).indexOf("Files") >= 0) e.preventDefault(); });
    t.addEventListener("drop", e => {
      const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]; if (!f) return;
      e.preventDefault();
      if (/^image\//.test(f.type) && opts.addPicture) opts.addPicture(f); else if (/\.(md|markdown|txt)$/i.test(f.name) && opts.note) opts.note(f);
    });
    return { wrap: wrap, close: close };
  }
  // a note written somewhere else: a Markdown file from Obsidian, an export from Notion, or any text file
  function noteIn(name, raw) {
    let t = String(raw).replace(/^﻿/, "").replace(/\r\n?/g, "\n"), meta = {}, pics = [];
    const fm = /^---\n([\s\S]*?)\n---[ \t]*(?:\n|$)/.exec(t);
    if (fm) { t = t.slice(fm[0].length); fm[1].split("\n").forEach(l => { const m = /^([A-Za-z_][\w -]*):\s*(.*)$/.exec(l); if (m) meta[m[1].trim().toLowerCase()] = m[2].trim().replace(/^(["'])(.*)\1$/, "$2"); }); }
    else { const own = B.splitPost(t); if (own.meta.title !== undefined) { meta = own.meta; t = own.body; } }
    const file = f => { let n = String(f).split(/[\\/]/).pop(); try { n = decodeURIComponent(n); } catch (e) { /* the name stays as it is */ } return n; };
    t = t.replace(/%%[\s\S]*?%%/g, "");                                                                                                    // Obsidian: comments
    t = t.replace(/!\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g, (m, f) => { pics.push(file(f.trim())); return "==Picture: " + file(f.trim()) + "=="; });        // Obsidian: a picture kept in the vault
    t = t.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2").replace(/\[\[([^\]]+)\]\]/g, "$1");                                                   // Obsidian: links between notes become plain words
    t = t.replace(/<aside>\s*([\s\S]*?)\s*<\/aside>/g, (m, inner) => "> [!NOTE]\n" + inner.trim().split("\n").map(l => "> " + l).join("\n")); // Notion: a callout
    t = t.replace(/!\[([^\]]*)\]\((?!https?:|content\/|data:|fig:)([^)\s]+)[^)]*\)/g, (m, alt, f) => { pics.push(file(f)); return "==Picture: " + file(f) + "=="; });   // a picture that lies beside the note
    let lines = t.replace(/^\n+/, "").split("\n"), title = meta.title || "", fence = false;
    if (/^# +\S/.test(lines[0] || "")) {          // a first line that is the note's own title is not repeated in the text
      const h = lines[0].replace(/^# +/, "").trim();
      if (!title || h.toLowerCase() === title.toLowerCase()) { title = title || h; lines.shift(); while (lines.length && !lines[0].trim()) lines.shift(); }
    }
    if (!title) title = String(name || "").replace(/\.[^.]+$/, "").replace(/\s+[0-9a-f]{32}$/i, "").trim();
    const heads = lines.filter(l => { if (/^\s*(```|~~~)/.test(l)) fence = !fence; return !fence && /^#{1,6} /.test(l); });
    if (heads.length && !heads.some(l => /^# /.test(l))) { fence = false; lines = lines.map(l => { if (/^\s*(```|~~~)/.test(l)) fence = !fence; return !fence && /^#{2,6} /.test(l) ? l.slice(1) : l; }); }          // the note's own title took the first level: the others move up one
    const day = /\d{4}-\d{2}-\d{2}/.exec(meta.date || meta.created || "");
    return { title: title, date: day ? day[0] : "", teaser: meta.teaser || meta.description || meta.summary || "", topic: meta.topic || meta.category || "", text: lines.join("\n").replace(/\n{3,}/g, "\n\n").replace(/\s+$/, ""), pics: pics };
  }
  function fmtHelp() {
    const d = el("details", "fmt-help"), safe = t => t.replace(/&/g, "&amp;").replace(/</g, "&lt;");
    d.innerHTML = "<summary>Formatting help</summary><table>" + FMT.map(r => "<tr><td><pre>" + safe(r[0]) + "</pre></td><td>" + safe(r[1]) + "</td></tr>").join("") + "</table>";
    d.addEventListener("click", e => { if (!e.target.closest("summary")) e.preventDefault(); });          // inside a label, a click on the help must not jump to the text field
    return d;
  }
  /* ---------- forms for everything that is not the diary ---------- */
  const SIMPLE = { text: 1, area: 1, paras: 1, blocks: 1, lines: 1, select: 1, project: 1, color: 1, date: 1 };
  const PARTS = { research: "Research", books: "Reading", blog: "Blog", brain: "Second brain", bookmarks: "Bookmarks", about: "About me", now: "Now", cv: "CV", programs: "Programs", hello: "Contact" };
  function area(value) { const t = el("textarea"); t.rows = 1; t.value = value || ""; t.addEventListener("input", () => grow(t)); return t; }
  function mini(labels, handler) {
    const box = el("span", "mini");
    labels.forEach(l => { const b = el("button", "linkish", l); b.type = "button"; b.addEventListener("click", e => { e.preventDefault(); e.stopPropagation(); handler(l, b); }); box.appendChild(b); });
    return box;
  }
  const move = (node, label) => {
    if (label === "Up" && node.previousElementSibling) node.parentNode.insertBefore(node, node.previousElementSibling);
    if (label === "Down" && node.nextElementSibling) node.parentNode.insertBefore(node.nextElementSibling, node);
  };
  function build(sc, val) {
    const type = sc.type || "text";
    if (type === "text") {
      const i = el("input"); i.type = "text"; i.value = val == null ? "" : String(val);
      return { node: i, get: () => { const v = i.value.trim(); return typeof val === "number" && /^-?\d+$/.test(v) ? Number(v) : v; } };
    }
    if (type === "date") { const i = el("input"); i.type = "date"; i.value = val || ""; return { node: i, get: () => i.value }; }
    if (type === "area") { const t = area(val); return { node: t, get: () => t.value.trim() }; }
    if (type === "paras") { const t = area((val || []).join("\n\n")); return { node: t, get: () => t.value.split(/\n\s*\n/).map(oneLine).filter(Boolean) }; }
    if (type === "blocks") {
      const t = area((val || []).join("\n\n")), box = el("div", "blocks"); t.classList.add("long"); t.spellcheck = true; box.appendChild(t); smart(t);
      const lookBtn = el("button", "linkish blocks-look", "Show how it will look"), lookAt = el("div", "reader blocks-view"), paint = () => { lookAt.innerHTML = '<div class="body">' + B.md(t.value) + "</div>"; };
      lookBtn.type = "button"; lookAt.hidden = true;
      lookBtn.addEventListener("click", e => { e.preventDefault(); lookAt.hidden = !lookAt.hidden; lookBtn.textContent = lookAt.hidden ? "Show how it will look" : "Hide it"; if (!lookAt.hidden) paint(); });
      t.addEventListener("input", () => { if (!lookAt.hidden) paint(); });
      lookAt.addEventListener("click", e => { if (!e.target.closest("a")) e.preventDefault(); });          // inside a label, a click on the look must not jump to the text box
      box.appendChild(lookBtn); box.appendChild(lookAt); box.appendChild(fmtHelp());
      return { node: box, get: () => t.value.replace(/\r\n?/g, "\n").split(/\n[ \t]*\n+/).map(x => x.replace(/\s+$/, "")).filter(x => x.trim()) };
    }
    if (type === "lines") { const t = area((val || []).join("\n")); return { node: t, get: () => t.value.split("\n").map(s => s.trim()).filter(Boolean) }; }
    if (type === "select") {
      const s = el("select");
      sc.options.forEach(o => { const op = el("option"); op.value = o[0]; op.textContent = o[1]; s.appendChild(op); });
      s.value = val == null ? "" : val; if (s.selectedIndex < 0) s.selectedIndex = 0;
      return { node: s, get: () => s.value };
    }
    if (type === "project") {       // a link to one of the research projects, kept as [title, "#work-id"]
      const s = el("select"), list = B.site().research || [];
      [["", "None"]].concat(list.map(p => ["#work-" + p.id, p.title])).forEach(o => { const op = el("option"); op.value = o[0]; op.textContent = o[1]; s.appendChild(op); });
      s.value = val && val[1] ? val[1] : ""; if (s.selectedIndex < 0) s.selectedIndex = 0;
      return { node: s, get: () => s.value ? [s.options[s.selectedIndex].textContent, s.value] : undefined };
    }
    if (type === "pairs") {         // rows of two short texts, kept as [[a, b], ...]
      const box = el("div", "pairs"), rows = el("div", "pairs-rows");
      const add = (a, b) => {
        const row = el("div", "pair"), ia = el("input"), ib = area(b);
        ia.type = "text"; ia.value = a || ""; ia.placeholder = sc.a || ""; ib.placeholder = sc.b || "";
        row.append(ia, ib, mini(["Up", "Down", "Remove"], (l, btn) => { if (l === "Remove") twice(btn, "Sure?", () => row.remove()); else move(row, l); }));
        row._get = () => [ia.value.trim(), ib.value.trim()];
        rows.appendChild(row); return row;
      };
      (val || []).forEach(p => add(p[0], p[1]));
      const more = el("button", "linkish add", "Add a line"); more.type = "button";
      more.addEventListener("click", () => { $("input", add("", "")).focus(); });
      box.append(rows, more);
      return { node: box, get: () => Array.from(rows.children).map(r => r._get()).filter(p => p[0] || p[1]) };
    }
    if (type === "color") {         // a colour: pick it or type it
      const box = el("span", "color"), pick = el("input"), txt = el("input"), ok = v => /^#[0-9a-f]{6}$/i.test(v);
      pick.type = "color"; txt.type = "text"; txt.value = val || "#000000"; pick.value = ok(txt.value) ? txt.value : "#000000";
      pick.addEventListener("input", () => { txt.value = pick.value; });
      txt.addEventListener("input", () => { if (ok(txt.value.trim())) pick.value = txt.value.trim(); });
      box.append(pick, txt);
      return { node: box, get: () => txt.value.trim() };
    }
    if (type === "check") { const c = el("input"); c.type = "checkbox"; c.checked = val !== false && val !== undefined ? !!val : !!sc.on; return { node: c, get: () => c.checked }; }
    if (type === "home") {          // the parts of the home page: which column, which order, shown or not
      const box = el("div", "pairs-rows"), list = (val || []).filter(h => PARTS[h.key]).map(h => Object.assign({}, h));
      Object.keys(PARTS).forEach(k => { if (!list.some(h => h.key === k)) list.push({ key: k, col: "right", show: false }); });
      list.forEach(h => {
        const row = el("div", "part"), name = el("b", "", esc(((B.site().words || {})[h.key] || PARTS[h.key]) + ({ now: ", on the About me page", programs: ", on the CV page" }[h.key] || ""))), col = el("select"), show = el("input"), lab = el("label", "check");
        [["left", "Left column"], ["right", "Right column"]].forEach(o => { const op = el("option"); op.value = o[0]; op.textContent = o[1]; col.appendChild(op); });
        col.value = h.col === "right" ? "right" : "left"; show.type = "checkbox"; show.checked = h.show !== false;
        lab.append(show, document.createTextNode(" Show"));
        row.append(name, lab, mini(["Up", "Down"], l => move(row, l)));
        row._get = () => ({ key: h.key, col: col.value, show: show.checked });
        box.appendChild(row);
      });
      return { node: box, get: () => Array.from(box.children).map(r => r._get()) };
    }
    if (type === "object") {
      const box = el("div", "obj"), parts = [];
      sc.fields.forEach(f => {
        if (f.type === "head") { box.appendChild(el("h3", "group-h", esc(f.label))); return; }
        if (f.type === "note") { box.appendChild(el("p", "desk-note", esc(f.label))); return; }
        const p = build(f, val ? val[f.key] : undefined);
        if (f.type === "check") { const lab = el("label", "check"); lab.append(p.node, document.createTextNode(" " + f.label)); box.appendChild(lab); }
        else if (SIMPLE[f.type || "text"]) { const lab = el("label"); lab.appendChild(el("span", "lab", esc(f.label))); lab.appendChild(p.node); box.appendChild(lab); }
        else { if (f.label) box.appendChild(el("h3", "group-h", esc(f.label))); box.appendChild(p.node); }
        parts.push([f, p]);
      });
      return { node: box, get: () => {
        const o = Object.assign({}, val || {});
        parts.forEach(pair => { const f = pair[0], v = pair[1].get(); if (f.opt && (v === "" || v === undefined || v === false || (Array.isArray(v) && !v.length))) delete o[f.key]; else o[f.key] = v; });
        return o;
      } };
    }
    if (type === "list") {          // cards that open, with a form inside each
      const box = el("div", "list"), cards = el("div", "cards");
      const add = (v, open) => {
        const d = el("details", "card"), sum = el("summary"), t = el("span", "card-t"), body = el("div", "card-in");
        const inner = build({ type: "object", fields: sc.of }, v);
        const name = () => { const v = inner.get(); t.textContent = sc.title(v) || "New " + sc.name; if (sc.dot) { const c = String(sc.dot(v) || ""); if (/^#[0-9a-f]{6}$/i.test(c)) sum.style.setProperty("--dot", c); else sum.style.removeProperty("--dot"); } };
        body.appendChild(inner.node); body.addEventListener("input", name); name();
        sum.append(t, mini(["Up", "Down", "Remove"], (l, btn) => { if (l === "Remove") twice(btn, "Really remove?", () => d.remove()); else move(d, l); }));
        d.append(sum, body); d._get = inner.get; d.open = !!open;
        d.addEventListener("toggle", () => { if (d.open) $$("textarea", d).forEach(grow); });
        cards.appendChild(d); return d;
      };
      (val || []).forEach(v => add(v, false));
      const more = el("button", "linkish add", "Add a " + sc.name); more.type = "button";
      more.addEventListener("click", () => { const blank = {}; sc.of.forEach(f => { if (f.type === "date") blank[f.key] = today(); }); const d = add(blank, true), first = $("input,textarea", d); $$("textarea", d).forEach(grow); if (first) first.focus(); });
      box.append(cards, more);
      return { node: box, get: () => Array.from(cards.children).map(d => d._get()) };
    }
    throw new Error("unknown field type " + type);
  }
  const T = (key, label, more) => Object.assign({ key: key, label: label }, more || {});
  const H = label => ({ type: "head", label: label });
  const N = text => ({ type: "note", label: text });
  const job = [T("title", "Title"), T("sub", "Where"), T("when", "When"), T("points", "Points. One per line.", { type: "lines" })];
  const FORMS = {
    now: { label: "Now", file: "content/now.json", note: "The short list on the About me page. The month under it is set when you save.",
      before: d => { const n = new Date(); d.updated = B.MONTH_NAMES[n.getMonth()] + " " + n.getFullYear(); },
      schema: { type: "object", fields: [T("now", "", { type: "pairs", a: "Label", b: "What" })] } },
    books: { label: "Books", file: "content/books.json", note: "", add: "Add a book",
      schema: { type: "object", fields: [
        T("books", "Books", { type: "list", name: "book", title: b => b.title, of: [
          T("title", "Title"), T("author", "Author"), T("year", "Year"), T("date", "Date. Postings with a date are listed newest first.", { type: "date", opt: true }),
          T("status", "Status", { type: "select", options: [["read", "Read"], ["reading", "Reading now"], ["next", "Up next"]] }),
          T("about", "What it argues", { type: "area" }),
          T("aside", "A second paragraph. Optional.", { type: "area", opt: true }),
          T("note", "Your own take. Optional. It shows in italics.", { type: "area", opt: true })] }),
        T("papers", "Papers on my desk", { type: "list", name: "paper", title: p => p.title, of: [
          T("title", "Title"), T("by", "Authors"), T("year", "Year"), T("date", "Date. Postings with a date are listed newest first.", { type: "date", opt: true }), T("href", "Link"), T("why", "Why it is here")] })] } },
    research: { label: "Research", file: "content/research.json", note: "", add: "Add a project",
      before: list => { list.forEach(p => { if (!p.id) { const base = slug(p.title); let id = base, n = 2; while (list.some(q => q !== p && q.id === id)) id = base + "-" + n++; p.id = id; } }); },
      schema: { type: "list", name: "project", title: p => p.title, of: [
        T("title", "Title"), T("where", "Where and when"), T("date", "Date. Postings with a date are listed newest first.", { type: "date", opt: true }), T("short", "One line for the home page and the list of postings"),
        T("text", "The write-up. It takes the same formatting as a blog entry: headings, lists, code, tables, notes. Leave an empty line between paragraphs.", { type: "blocks" }),
        T("facts", "Facts", { type: "pairs", a: "Label", b: "What" }),
        T("fig", "Drawing", { type: "select", options: [["", "None"], ["leak", "A leak between two runs"], ["ablate", "Ablation"], ["probe", "Linear probe"], ["ioi", "The IOI circuit"], ["steer", "Activation steering"], ["flip", "Two speaker orders"]] }),
        T("caption", "Line under the drawing", { type: "area" })] } },
    bookmarks: { label: "Bookmarks", file: "content/bookmarks.json", note: "", add: "Add a bookmark", empty: () => ({ bookmarks: [] }),
      schema: { type: "object", fields: [
        T("bookmarks", "", { type: "list", name: "bookmark", title: v => v.title, of: [
          T("title", "Title"), T("href", "Link. It opens in a new tab. A video on YouTube or Vimeo can also play on your page, after a click."),
          T("kind", "What it is, in your own word: Website, Video, Article, Paper, Tool. Optional. The kinds become the filter on top of the page.", { opt: true }),
          T("by", "Who made it. Optional.", { opt: true }), T("length", "How long it is, for a video or a talk. Optional.", { opt: true }),
          T("date", "The day you added it. Bookmarks with a date are listed newest first.", { type: "date", opt: true }),
          T("why", "Why it is worth keeping. Optional.", { type: "area", opt: true })] })] } },
    programs: { label: "Programs", file: "content/programs.json", note: "", add: "Add a group",
      schema: { type: "list", name: "group", title: g => g.group, of: [
        T("group", "Group name"),
        T("items", "", { type: "list", name: "entry", title: p => p.name, of: [
          T("name", "Name"), T("host", "Run by"), T("when", "When"), T("text", "A line or two about it", { type: "area" }),
          T("led", "Project it led to", { type: "project", opt: true })] })] } },
    cv: { label: "CV", file: "content/cv.json", note: "",
      schema: { type: "object", fields: [
        T("line", "The line under the title", { type: "area" }),
        T("experience", "Experience", { type: "list", name: "job", title: j => j.title, of: job }),
        T("education", "Education", { type: "list", name: "degree", title: j => j.title, of: job }),
        T("service", "Service. One per line.", { type: "lines" }),
        T("training", "Training. One per line.", { type: "lines" }),
        T("skills", "Skills", { type: "pairs", a: "Area", b: "Skills" }),
        T("languages", "Languages", { type: "pairs", a: "Language", b: "Level" })] } },
    about: { label: "Profile", file: "content/site.json", note: "",
      schema: { type: "object", fields: [
        H("You"),
        T("name", "Your name. It stands in the footer."),
        T("title", "The title in the browser tab"),
        T("what", "One line about you. It stands on top of the About me page, and search engines and the feed use it."),
        T("intro", "About you. It is the text of the About me page. Leave an empty line between paragraphs. A {blue} in the text is not shown.", { type: "paras" }),
        H("Contact"),
        T("hello", "Your line next to the contact form", { type: "area" }),
        T("contactTo", "Where the contact form sends. Either your email address, or the address a form service gives you. It starts with https. Leave it empty and the form does not show. An email address here is public.", { opt: true }),
        T("links", "Links next to the contact form", { type: "list", name: "link", title: l => l.label, of: [T("label", "Name"), T("href", "Address")] }),
        H("Small things"),
        T("blueLine", "", { type: "object", fields: [T("plain", "The line under your photo"), T("name", "The colour that line is about"), T("same", "The line, when a visitor picks that colour"), T("other", "The line, with any other colour. {ink} becomes its name.")] }),
        T("robot", "", { type: "object", fields: [T("off", "What the robot says when it is switched off"), T("on", "And when it is switched on")] })] } },
    pages: { label: "Pages", file: "content/site.json", note: "",
      fill: d => { if (!(d.home && d.home.length)) d.home = B.defaults.home; },
      schema: { type: "object", fields: [
        H("The pages"), N("Tick what the site has. Each one is a link beside the page, in this order. The home page shows the latest three of Research, Blog and Reading. Second brain is the part with your notes: they are files in the folder brain/notes, not written here. Bookmarks shows once the list holds one. Now and Programs have no link: Now is a part of About me, Programs a part of the CV."),
        T("home", "", { type: "home" }),
        H("The line under each page title"),
        T("sections", "", { type: "object", fields: [T("research", "Research"), T("books", "Reading"), T("blog", "Blog"), T("bookmarks", "Bookmarks", { opt: true }), T("about", "About me", { opt: true }), T("contact", "Contact", { opt: true })] }),
        H("The topics of your blog"), N("One per line. A post picks one of them in its Topic box. A topic shows on the Blog page once a post has it."),
        T("topics", "", { type: "lines" }),
        H("AI crawlers"), N("This goes into robots.txt, the file crawlers read before they read your site. It is a request. The large AI companies follow it for the crawlers they name, and nothing forces a crawler to. Search engines stay welcome. So do assistants that open one page because a person asked for it."),
        T("keepOut", "", { type: "object", fields: [
          T("training", "Keep out crawlers that collect text to train AI models", { type: "check", on: true }),
          T("search", "Keep out crawlers that build an index for AI search, like those of ChatGPT, Claude and Perplexity", { type: "check", on: true }),
          N("Google and Bing answer with AI from what their normal search has read, and robots.txt cannot change that. The next two put a small tag into every page instead."),
          T("google", "Ask Google to keep your pages out of its AI answers. Google then also shows no preview text under your link in its normal results.", { type: "check" }),
          T("bing", "Ask Bing to keep your pages out of Copilot. Normal Bing results stay as they are.", { type: "check" })] })] } },
    words: { label: "Labels", file: "content/site.json", note: "",
      fill: d => { d.words = Object.assign({}, B.defaults.words, d.words); d.clock = Object.assign({}, B.defaults.clock, d.clock); },
      schema: { type: "object", fields: [
        T("words", "", { type: "object", fields: [
          H("Names of the pages, in the links and on the home page"), T("research", "Research"), T("books", "Reading"), T("blog", "Blog"), T("cv", "CV"), T("now", "Now, on the About me page"),
          H("Page titles"), T("researchTitle", "Research page"), T("booksTitle", "Reading page"), T("blogTitle", "Blog page"), T("cvTitle", "CV page"), T("contactTitle", "Contact page"),
          H("Small labels"), T("papers", "Reading page: heading over the papers"), T("booksHead", "Reading page: heading over the books"), T("rightNow", "Label of the clock line. Leave it empty to hide the clock."), T("updated", "Line under Now. {month} is filled in."),
          T("fig", "Before the number of a drawing"), T("project", "Before a project link under a program, on the CV page"), T("read", "Book status: read"), T("reading", "Book status: reading"), T("next", "Book status: next"),
          H("Posts"), T("latest", "The small flag on the newest post"), T("attn", "The word that shows when you point at the first paragraph"), T("abstract", "The word in front of your first paragraph"),
          T("kindBlog", "Kind of posting: a blog entry"), T("kindResearch", "Kind of posting: a research project"), T("kindBook", "Kind of posting: a book"), T("kindPaper", "Kind of posting: a paper"),
          T("backTo", "Link back from a project, book or paper. {kind} is the page it belongs to."), T("readPaper", "Link to a paper"), T("prevPost", "Before the previous posting"), T("nextPost", "Before the next posting"),
          H("Blog"), T("back", "Link back to the list"), T("older", "Before the older entry"), T("newer", "Before the newer entry"), T("halfWritten", "Heading over the drafts"), T("nothingYet", "When there are no entries"),
          H("CV headings"), T("experience", "Experience"), T("education", "Education"), T("cvResearch", "Research"), T("service", "Service"), T("training", "Training"), T("skills", "Skills"), T("languages", "Languages"),
          H("The pages About me and Bookmarks"), T("about", "About me, in the links"), T("aboutTitle", "Title of the About me page"),
          T("bookmarks", "Bookmarks, in the links and on the home page"), T("bookmarksTitle", "Title of the Bookmarks page"), T("allKinds", "The filter that shows every bookmark, and every post on the Blog page"),
          T("videoKind", "What a video is called when you gave it no kind"), T("play", "The link that plays a video on your page"),
          H("The links and reading"), T("brand", "The name over the links. Leave it empty to show your own name."), T("contact", "The link to the contact form, among the links. Leave it empty to hide it."), T("all", "Link from a part of the home page to its page"),
          T("contents", "Heading over the list of contents in a post"), T("minutes", "Reading time. {n} is the number of minutes."), T("copy", "Button on a code block"), T("copied", "The same button after a click"),
          T("smaller", "What a screen reader says for the A\u2212 button"), T("larger", "What a screen reader says for the A+ button"),
          H("The contact form"), T("contactName", "Over the box for the name"), T("contactEmail", "Over the box for the email"), T("contactText", "Over the box for the message"), T("contactSend", "The button"),
          T("contactSending", "While it sends"), T("contactSent", "After it was sent"), T("contactMail", "After the visitor's mail app opened"), T("contactFail", "When it could not be sent"),
          T("contactNeed", "When a box is empty or the email is not one"), T("contactDemo", "In a preview, where nothing is sent"), T("contactSubject", "Subject of the email. {name} is the visitor's name."),
          H("Footer and the rest"), T("copyright", "Footer line. {year} and {name} are filled in."), T("flip", "The flip button"), T("write", "The link to this page. Only you see it."),
          T("skip", "Skip link for keyboard users"), T("portrait", "What a screen reader says for the pixel portrait. {name} is filled in."), T("photo", "What a screen reader says for your photo. {name} is filled in.")] }),
        T("clock", "The clock under Now", { type: "object", fields: [
          T("place", "Place"), T("zone", "Time zone, like Europe/Paris"), T("line", "The line. {time} and {place} are filled in."),
          T("asleep", "From 23:00 to 6:00"), T("run", "From 6:00 to 8:00"), T("morning", "From 8:00 to 9:00 on weekdays"), T("work", "From 9:00 to 18:00 on weekdays"), T("evening", "After 18:00 on weekdays"), T("weekend", "On weekends")] })] } },
    look: { label: "Appearance", file: "content/site.json", note: "",
      fill: d => { const old = d.look || {}; d.look = Object.assign({}, B.defaults.look, d.paper ? { paper: d.paper } : {}, old.side ? {} : { side: old.portrait === false ? "none" : "portrait" }, old); delete d.look.portrait; if (d.look.side !== "portrait" && d.look.side !== "photo") d.look.side = "none"; d.look.photoAs = old.photoAs === "plain" || (!old.photoAs && old.photoDots === false) ? "plain" : "dots"; delete d.look.photoDots; if (!(d.home && d.home.length)) d.home = B.defaults.home; },
      saved: () => { try { localStorage.removeItem("ink"); } catch (e) { /* storage is optional */ } B.resetInk(); },      // so you see the site as a new visitor does
      schema: { type: "object", fields: [
        H("Colours"), N("The first one is what visitors see first. The second one is the colour of the thin lines: the line under a link, and the marks here in Settings. With only one colour here, they are black. The others are for the colour list in the footer."),
        T("inks", "", { type: "list", name: "colour", title: k => k.name, dot: k => k.ink, of: [T("name", "Name"), T("ink", "Colour", { type: "color" }),
          T("dark", "A dark page: this colour is the page and the text is light", { type: "check", opt: true }), T("stars", "Pixel stars on the dark page", { type: "check", opt: true })] }),
        T("look", "", { type: "object", fields: [
          H("Paper and type"), T("paper", "Paper colour", { type: "color" }), T("pop", "Highlighter colour", { type: "color" }),
          T("font", "Font", { type: "select", options: Object.keys(B.fonts).map(k => [k, B.fonts[k].name]) }),
          T("flipped", "Start as a dark page, with ink and paper flipped", { type: "check" }),
          H("Your photo"), T("side", "On the About me page, beside your description", { type: "select", options: [["photo", "Your photo"], ["none", "Nothing. The description runs across the page."]] }),
          T("photoAs", "How the photo is shown", { type: "select", options: [["dots", "As dots, in the colour of the page"], ["plain", "As it is, in its own colours"]] }),
          H("Small things"), T("robot", "The robot that walks on the line above the footer", { type: "check" }), T("inkPicker", "The colour list and the Flip button in the footer", { type: "check" })] })] } }
  };

  /* ---------- how the write page looks ---------- */
  const CSS = `
/* ================= Settings: a workspace of its own =================
   A grey panel on the left lists the parts. The open part stands beside it on the paper of the site.
   Forms are set in a plain sans-serif so they read as tools. What you write and how it will look stay in the type of the site.
   The colours are the site's own: its ink, its paper, its highlighter for the box you are typing in. */
html.in-desk main{max-width:none;padding:0}
.desk,.slash{--ui:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;--edge:color-mix(in srgb,var(--ink) 20%,var(--paper));--soft:color-mix(in srgb,var(--ink) 72%,var(--paper));--rad:calc(var(--u)*0.625)}
.desk{
  display:grid;grid-template-columns:calc(var(--u)*16.5) minmax(0,1fr);align-items:start;min-height:100vh;font:400 calc(var(--u)*0.9375)/1.5 var(--ui);color:var(--ink)}
.desk .reader{font-family:var(--font)}
.desk h1,.desk h2,.desk h3{font-family:var(--ui)}

/* the panel on the left */
.set-side{position:sticky;top:0;display:flex;flex-direction:column;height:100vh;padding:calc(var(--u)*1.5) calc(var(--u)*0.875) calc(var(--u)*1.125);background:var(--panel)}
.set-brand{margin:0;padding:0 calc(var(--u)*0.75)}
.set-brand a{color:var(--ink);font:600 calc(var(--u)*1.0625)/1.25 var(--ui);letter-spacing:-.01em;text-decoration:none}
.set-brand a:hover{color:var(--ink);text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:.2em}
.set-title{margin:calc(var(--u)*0.125) 0 calc(var(--u)*1.375);padding:0 calc(var(--u)*0.75);font-size:calc(var(--u)*0.8438);color:var(--dim)}
.desk-tabs{display:flex;flex-direction:column;gap:calc(var(--u)*0.125);min-height:0;margin:0;overflow:auto;scrollbar-width:thin}
.set-group{margin:calc(var(--u)*1.125) 0 calc(var(--u)*0.25);padding:0 calc(var(--u)*0.75);font-size:calc(var(--u)*0.7812);font-weight:600;color:var(--dim)}
.set-group:first-child{margin-top:0}
.desk-tabs button{display:flex;align-items:center;width:100%;margin:0;padding:calc(var(--u)*0.4062) calc(var(--u)*0.75) calc(var(--u)*0.4375);border:0;border-radius:var(--rad);background:none;color:var(--soft);font:500 calc(var(--u)*0.9375)/1.3 var(--ui);text-align:left;cursor:pointer}
.desk-tabs button[hidden]{display:none}
.desk-tabs button:hover{background:color-mix(in srgb,var(--ink) 6%,transparent);color:var(--ink)}
.desk-tabs button[aria-selected="true"]{background:var(--paper);color:var(--ink);font-weight:600;box-shadow:0 0 0 1px var(--hair),0 1px 2px color-mix(in srgb,var(--ink) 8%,transparent)}
.set-foot{margin-top:auto;padding:calc(var(--u)*1) calc(var(--u)*0.75) 0;font-size:calc(var(--u)*0.8125);line-height:1.45;color:var(--dim)}
.desk-status{margin:0 0 calc(var(--u)*0.75)}
.set-back{display:block;padding:calc(var(--u)*0.4062) calc(var(--u)*0.75) calc(var(--u)*0.4375);margin:0 calc(var(--u)*-0.75);border-radius:var(--rad);color:var(--soft);font-weight:500;font-size:calc(var(--u)*0.9375);text-decoration:none}
.set-back::before{content:"\\2039";display:inline-block;margin-right:calc(var(--u)*0.5)}
.set-back:hover{background:color-mix(in srgb,var(--ink) 6%,transparent);color:var(--ink);text-decoration:none}

/* the open part: its name, one line about it, and what can be done at once */
.set-main{min-width:0;max-width:calc(var(--u)*72);padding:calc(var(--u)*2.25) clamp(calc(var(--u)*1.25),4vw,calc(var(--u)*3.5)) 0}
.set-head{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:calc(var(--u)*0.875) calc(var(--u)*1.5);margin:0 0 calc(var(--u)*1.75)}
.set-head[hidden],.desk-panel[hidden],.set-act:empty{display:none}
.set-head h1{margin:0;font:600 calc(var(--u)*1.75)/1.15 var(--ui);letter-spacing:-.022em !important}
.set-head h1:focus{outline:none}
.set-head p{max-width:calc(var(--u)*38);margin:calc(var(--u)*0.375) 0 0;font-size:calc(var(--u)*0.9375);color:var(--dim)}
.desk-panel{padding-bottom:calc(var(--u)*1.5)}

/* buttons, messages, and the bar at the bottom that saves */
.desk .linkish{color:var(--soft);font:inherit;text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:.2em;text-decoration-color:var(--edge)}
.desk .linkish:hover{background:none;color:var(--ink);text-decoration-color:var(--ink)}
.primary{padding:calc(var(--u)*0.4688) calc(var(--u)*1.125) calc(var(--u)*0.5);border:1px solid var(--ink);border-radius:999px;background:var(--ink);color:var(--paper);font:600 calc(var(--u)*0.9062)/1.3 var(--ui);cursor:pointer}
.primary:hover{background:color-mix(in srgb,var(--ink) 84%,var(--paper));border-color:color-mix(in srgb,var(--ink) 84%,var(--paper))}
.desk button[disabled]{opacity:.5;cursor:default}
.c-actions{display:flex;flex-wrap:wrap;align-items:center;gap:calc(var(--u)*0.5) calc(var(--u)*0.75)}
.c-msg{display:flex;align-items:center;gap:calc(var(--u)*0.5);min-height:1.5em;margin:0;font-size:calc(var(--u)*0.875);color:var(--dim)}
.c-msg .ani .f1{animation:none;visibility:visible}
.c-msg .ani .f2{animation:none;visibility:hidden}
.c-foot{position:sticky;bottom:0;z-index:5;display:flex;flex-wrap:wrap;align-items:center;gap:calc(var(--u)*0.5) calc(var(--u)*0.75);margin-top:calc(var(--u)*2);padding:calc(var(--u)*0.8125) 0 calc(var(--u)*0.9375);border-top:1px solid var(--hair);background:var(--paper)}
.c-foot.due .c-msg{color:var(--ink);font-weight:500}
.c-foot.due .c-msg:not(:empty)::before{content:"";width:calc(var(--u)*0.5);height:calc(var(--u)*0.5);border-radius:50%;background:var(--ink)}
.c-foot #c-delete{margin-left:auto}
/* the second choices beside a main button are quiet round buttons */
.desk .c-foot .linkish,.desk .c-actions .linkish,.desk .set-act .linkish{padding:calc(var(--u)*0.4688) calc(var(--u)*1) calc(var(--u)*0.5);border:1px solid var(--edge);border-radius:999px;color:var(--ink);font:500 calc(var(--u)*0.9062)/1.3 var(--ui);text-decoration:none}
.desk .c-foot .linkish:hover,.desk .c-actions .linkish:hover,.desk .set-act .linkish:hover{background:var(--panel);border-color:var(--soft)}

/* boxes to fill in */
.desk input[type=text],.desk input[type=password],.desk input[type=date],.desk input[type=search],.desk textarea,.desk select{box-sizing:border-box;width:100%;min-width:0;margin:0;padding:calc(var(--u)*0.5) calc(var(--u)*0.75) calc(var(--u)*0.5312);border:1px solid var(--edge);border-radius:var(--rad);background:var(--paper);box-shadow:none;color:var(--ink);font:400 calc(var(--u)*0.9375)/1.45 var(--ui);-webkit-appearance:none;appearance:none}
.desk select{width:auto;max-width:100%;padding-right:calc(var(--u)*2.25);background-image:linear-gradient(45deg,transparent 50%,var(--ink) 50%),linear-gradient(135deg,var(--ink) 50%,transparent 50%);background-position:calc(100% - calc(var(--u)*1.0625)) 55%,calc(100% - calc(var(--u)*0.75)) 55%;background-size:calc(var(--u)*0.3125) calc(var(--u)*0.3125),calc(var(--u)*0.3125) calc(var(--u)*0.3125);background-repeat:no-repeat;cursor:pointer}
.desk textarea{display:block;resize:none;overflow:hidden}
.desk input:hover,.desk textarea:hover,.desk select:hover{border-color:var(--soft)}
.desk input:focus-visible,.desk textarea:focus-visible,.desk select:focus-visible{outline:0;border-color:var(--ink);box-shadow:0 0 0 3px var(--s-mark)}
.desk ::placeholder{color:inherit;opacity:.4}
:root.neg .desk input,:root.neg .desk select{color-scheme:dark}
.desk label{display:block}
.desk .lab{display:block;margin:calc(var(--u)*1.125) 0 calc(var(--u)*0.375);font-size:calc(var(--u)*0.8438);font-weight:500;line-height:1.4;color:var(--soft)}
.desk label.check{display:flex;align-items:center;gap:calc(var(--u)*0.625);margin:calc(var(--u)*0.625) 0;cursor:pointer}
.desk input[type=checkbox]{flex:none;width:calc(var(--u)*1.0625);height:calc(var(--u)*1.0625);margin:0;accent-color:var(--ink);cursor:pointer}
.desk input[type=range]{width:100%;accent-color:var(--ink)}
.desk .color{display:flex;align-items:center;gap:calc(var(--u)*0.5)}
.desk .color input[type=color]{flex:none;width:calc(var(--u)*2.5);height:calc(var(--u)*2.4375);padding:calc(var(--u)*0.1875);border:1px solid var(--edge);border-radius:var(--rad);background:var(--paper);cursor:pointer}
.desk .color input[type=text]{width:8.5em;font-family:var(--s-mono);font-size:calc(var(--u)*0.875)}
.form{max-width:calc(var(--u)*44)}
.desk-note{max-width:calc(var(--u)*40);margin:0 0 calc(var(--u)*0.875);font-size:calc(var(--u)*0.9062);color:var(--dim)}
.group-h{margin:calc(var(--u)*2.25) 0 calc(var(--u)*0.125);padding-top:calc(var(--u)*1.75);border-top:1px solid var(--hair);font:600 calc(var(--u)*1.0625)/1.3 var(--ui) !important;letter-spacing:-.005em !important}
.obj>.group-h:first-child,.form>.list:first-child{margin-top:0;padding-top:0;border-top:0}
.group-h + .desk-note{margin-top:calc(var(--u)*0.3125)}
.list + .obj > .group-h:first-child{margin-top:calc(var(--u)*2.25);padding-top:calc(var(--u)*1.75);border-top:1px solid var(--hair)}

/* a list of things that each open into a form */
.cards{border:1px solid var(--edge);border-radius:calc(var(--u)*0.75);background:var(--paper);overflow:hidden}
.card + .card{border-top:1px solid var(--hair)}
.card summary{display:flex;justify-content:space-between;align-items:center;gap:calc(var(--u)*1);padding:calc(var(--u)*0.6875) calc(var(--u)*1) calc(var(--u)*0.7188);cursor:pointer;list-style:none}
.card summary::-webkit-details-marker{display:none}
.card summary:hover{background:var(--panel)}
.card[open]>summary{background:var(--panel)}
.card-t{display:inline-flex;align-items:center;gap:calc(var(--u)*0.625);min-width:0;font-size:calc(var(--u)*0.9688);font-weight:600}
.card-t::before{content:"";flex:none;width:calc(var(--u)*0.375);height:calc(var(--u)*0.375);border-right:1.5px solid var(--soft);border-bottom:1.5px solid var(--soft);rotate:-45deg;transition:rotate .15s}
.card[open]>summary .card-t::before{rotate:45deg}
.card summary[style*="--dot"] .card-t::after{content:"";flex:none;width:calc(var(--u)*0.875);height:calc(var(--u)*0.875);border:1px solid var(--edge);border-radius:50%;background:var(--dot)}
.card-in{padding:calc(var(--u)*0.125) calc(var(--u)*1.125) calc(var(--u)*1.375);border-top:1px solid var(--hair)}
.card-in .cards{margin-top:calc(var(--u)*0.5)}
.card-in .group-h{margin-top:calc(var(--u)*1.625);padding-top:0;border-top:0;font-size:calc(var(--u)*0.9688) !important}
/* Up, Down and Remove: small and quiet until you point at their row */
.mini{display:flex;gap:calc(var(--u)*0.125);font-size:calc(var(--u)*0.8125);white-space:nowrap}
.desk .mini .linkish{padding:calc(var(--u)*0.1562) calc(var(--u)*0.5) calc(var(--u)*0.1875);border-radius:calc(var(--u)*0.375);color:var(--dim);text-decoration:none}
.desk .mini .linkish:hover{background:color-mix(in srgb,var(--ink) 9%,transparent);color:var(--ink)}
.desk .add{display:inline-block;margin-top:calc(var(--u)*0.75);padding:calc(var(--u)*0.375) calc(var(--u)*0.9375) calc(var(--u)*0.4062);border:1px dashed var(--edge);border-radius:999px;color:var(--soft);font-size:calc(var(--u)*0.875);font-weight:500;text-decoration:none}
.desk .add::before{content:"+";margin-right:calc(var(--u)*0.4375)}
.desk .add:hover{border-style:solid;border-color:var(--soft);color:var(--ink)}
.pairs-rows{display:grid;gap:calc(var(--u)*0.5)}
.pair{display:grid;grid-template-columns:minmax(0,calc(var(--u)*11.25)) minmax(0,1fr) auto;gap:0 calc(var(--u)*0.5);align-items:start}
.pair .mini{padding-top:calc(var(--u)*0.5)}
.pairs-rows:has(> .part){gap:0;border:1px solid var(--edge);border-radius:calc(var(--u)*0.75);overflow:hidden}
.part{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:0 calc(var(--u)*1.25);align-items:center;padding:calc(var(--u)*0.5625) calc(var(--u)*1)}
.part + .part{border-top:1px solid var(--hair)}
.part:hover{background:var(--panel)}
.part b{font-weight:500}
.part label.check{margin:0;font-size:calc(var(--u)*0.875);color:var(--soft)}
.blocks textarea.long{min-height:calc(var(--u)*16.25);max-height:70vh;overflow-y:auto;font:400 calc(var(--u)*0.875)/1.6 var(--s-mono)}
.blocks-look{margin:calc(var(--u)*0.5) 0 0;font-size:calc(var(--u)*0.875)}
.blocks-view{margin:calc(var(--u)*0.75) 0 calc(var(--u)*0.25);padding:calc(var(--u)*1.375) calc(var(--u)*1.625) calc(var(--u)*0.5);border-radius:calc(var(--u)*0.75);background:var(--panel)}
.blocks-view[hidden]{display:none}
.desk .blocks-view.reader{max-width:calc(var(--u)*43.75)}
.fmt-help{margin:calc(var(--u)*0.625) 0 calc(var(--u)*0.375);font-size:calc(var(--u)*0.875)}
.fmt-help summary{display:inline-block;cursor:pointer;color:var(--soft);text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:.2em;text-decoration-color:var(--edge);list-style:none}
.fmt-help summary::-webkit-details-marker{display:none}
.fmt-help summary:hover{color:var(--ink)}
.fmt-help table{width:100%;margin-top:calc(var(--u)*0.625);border-collapse:collapse}
.fmt-help td{padding:calc(var(--u)*0.4375) calc(var(--u)*0.875) calc(var(--u)*0.4375) 0;border-top:1px solid var(--hair);vertical-align:top}
.fmt-help pre{margin:0;font:400 calc(var(--u)*0.7812)/1.45 var(--s-mono);white-space:pre-wrap}

/* posts: the list */
.p-list{max-width:calc(var(--u)*54)}
.p-list .c-msg:empty{display:none}
.p-list .c-msg{margin-bottom:calc(var(--u)*0.75)}
.desk #e-find{max-width:calc(var(--u)*20);margin:0 0 calc(var(--u)*1);border-radius:999px;padding-left:calc(var(--u)*1)}
#e-find[hidden]{display:none}
.e-list{list-style:none;margin:0;padding:0;border:1px solid var(--edge);border-radius:calc(var(--u)*0.75);background:var(--paper);overflow:hidden}
.e-list li{display:grid;grid-template-columns:minmax(0,1fr) auto calc(var(--u)*6.25) auto;gap:calc(var(--u)*0.125) calc(var(--u)*1.25);align-items:baseline;padding:calc(var(--u)*0.75) calc(var(--u)*1) calc(var(--u)*0.8125)}
.e-list li + li{border-top:1px solid var(--hair)}
.e-list li[hidden]{display:none}
.e-list li:hover{background:var(--panel)}
.e-main{min-width:0}
.e-open{display:inline;margin:0;padding:0;border:0;background:none;color:var(--ink);font:600 calc(var(--u)*0.9688)/1.35 var(--ui);text-align:left;cursor:pointer}
.e-open:hover{text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:.2em}
.e-teaser{display:block;margin-top:calc(var(--u)*0.125);font-size:calc(var(--u)*0.875);color:var(--dim)}
.e-state{padding:calc(var(--u)*0.0625) calc(var(--u)*0.5625) calc(var(--u)*0.0938);border-radius:999px;background:var(--panel);font-size:calc(var(--u)*0.75);font-weight:500;white-space:nowrap;color:var(--soft)}
.e-state.draft{background:var(--s-mark);color:var(--ink)}
.e-list .when{font-size:calc(var(--u)*0.8438);white-space:nowrap;color:var(--dim);font-variant-numeric:tabular-nums}
.e-do{font-size:calc(var(--u)*0.8125)}
.desk .e-do .linkish{padding:calc(var(--u)*0.1562) calc(var(--u)*0.5) calc(var(--u)*0.1875);border-radius:calc(var(--u)*0.375);color:var(--dim);text-decoration:none}
.desk .e-do .linkish:hover{background:color-mix(in srgb,var(--ink) 9%,transparent);color:var(--ink)}
.p-empty{margin:0;padding:calc(var(--u)*2.25) calc(var(--u)*1.25);border:1px dashed var(--edge);border-radius:calc(var(--u)*0.75);text-align:center;color:var(--dim)}

/* posts: one post being written. The sheet you write on is in the type of the site. */
.desk[data-edit="1"][data-tab="diary"] #head-diary{display:none}
.c-bar{display:flex;flex-wrap:wrap;align-items:center;gap:calc(var(--u)*0.5) calc(var(--u)*1);margin:0 0 calc(var(--u)*1.125);font-size:calc(var(--u)*0.875)}
.desk .c-bar .linkish{color:var(--soft);font-weight:500;text-decoration:none}
.desk .c-bar .linkish:hover{color:var(--ink);text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:.2em}
.c-back::before{content:"\\2039";display:inline-block;margin-right:calc(var(--u)*0.4375);text-decoration:none}
.c-mode{margin:0 auto 0 0;padding:calc(var(--u)*0.0625) calc(var(--u)*0.5625) calc(var(--u)*0.0938);border-radius:999px;background:var(--panel);font-size:calc(var(--u)*0.75);font-weight:500;color:var(--soft)}
.c-views{display:inline-flex;gap:2px;padding:2px;border-radius:999px;background:var(--panel)}
.c-views button{margin:0;padding:calc(var(--u)*0.2188) calc(var(--u)*0.75) calc(var(--u)*0.25);border:0;border-radius:999px;background:none;color:var(--soft);font:500 calc(var(--u)*0.8438)/1.3 var(--ui);cursor:pointer}
.c-views button:hover{color:var(--ink)}
.c-views button[aria-pressed="true"]{background:var(--paper);color:var(--ink);box-shadow:0 0 0 1px var(--hair),0 1px 2px color-mix(in srgb,var(--ink) 8%,transparent)}
.c-io{display:inline-flex;flex-wrap:wrap;gap:calc(var(--u)*0.25) calc(var(--u)*1)}
.composer{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);gap:0 calc(var(--u)*1.75);align-items:start}
.composer[data-view="write"],.composer[data-view="read"]{grid-template-columns:minmax(0,1fr)}
.composer[data-view="write"] .c-preview,.composer[data-view="read"] .sheet{display:none}
.composer[data-view="write"] .sheet{max-width:calc(var(--u)*48)}
.composer[data-view="read"] .c-preview{position:static;max-width:calc(var(--u)*46)}
.sheet{padding:calc(var(--u)*1.625) calc(var(--u)*1.875) calc(var(--u)*1.75);border:1px solid var(--edge);border-radius:calc(var(--u)*0.875);background:var(--paper)}
.sheet:focus-within{border-color:color-mix(in srgb,var(--ink) 38%,var(--paper))}
.desk textarea.c-title{padding:0;border:0;border-radius:0;font:400 calc(var(--u)*2)/1.15 var(--font);letter-spacing:-.02em}
.desk textarea.c-title:focus-visible,.desk textarea.c-text:focus-visible{box-shadow:none}
.c-row{display:flex;flex-wrap:wrap;align-items:center;gap:calc(var(--u)*0.25) calc(var(--u)*1.125);margin:calc(var(--u)*0.625) 0 calc(var(--u)*0.75);font-size:calc(var(--u)*0.8438);color:var(--dim)}
.c-row label{display:inline-flex;align-items:center;gap:calc(var(--u)*0.5)}
.desk .c-row input[type=date],.desk .c-row select{width:auto;padding:calc(var(--u)*0.1875) calc(var(--u)*0.5625) calc(var(--u)*0.2188);font-size:calc(var(--u)*0.8438)}
.desk .c-row select{padding-right:calc(var(--u)*1.875)}
.c-tools{position:sticky;top:0;z-index:4;display:flex;flex-wrap:wrap;gap:calc(var(--u)*0.3125);margin:0 0 calc(var(--u)*0.375);padding:calc(var(--u)*0.5) 0;background:var(--paper);font-size:calc(var(--u)*0.8125)}
.desk .c-tools .linkish{padding:calc(var(--u)*0.1875) calc(var(--u)*0.625) calc(var(--u)*0.2188);border-radius:calc(var(--u)*0.4375);background:var(--panel);color:var(--ink);font-weight:500;text-decoration:none}
.desk .c-tools .linkish:hover{background:var(--s-mark);color:var(--ink)}
.c-hint{margin:calc(var(--u)*0.375) 0 calc(var(--u)*0.25);font-size:calc(var(--u)*0.8438);color:var(--dim)}
.c-hint kbd{padding:0 calc(var(--u)*0.3125) calc(var(--u)*0.0625);border:1px solid var(--edge);border-radius:calc(var(--u)*0.25);font:400 calc(var(--u)*0.7812) var(--s-mono);color:var(--ink)}
.desk textarea.c-text{min-height:16em;margin-top:calc(var(--u)*0.875);padding:0;border:0;border-radius:0;font:400 calc(var(--u)*1.125)/1.75 var(--font)}
.sheet > .lab,.sheet label > .lab{margin-top:calc(var(--u)*1.25)}
.c-preview{position:sticky;top:calc(var(--u)*1.5);padding:calc(var(--u)*1.5) calc(var(--u)*1.75) calc(var(--u)*1.25);border-radius:calc(var(--u)*0.875);background:var(--panel)}
.c-label{margin:0 0 calc(var(--u)*1);font-size:calc(var(--u)*0.75);font-weight:600;color:var(--dim)}
.c-preview .reader{max-width:none}
.c-preview .reader h1{font-size:calc(var(--u)*2) !important;margin-bottom:calc(var(--u)*0.375) !important}
.c-preview .reader > .meta{margin-bottom:calc(var(--u)*1.375) !important}
.c-preview .reader .s-size{display:none}
.p-edit .c-foot{margin-top:calc(var(--u)*1.5)}
/* the menu that opens on "/" */
.slash{position:fixed;z-index:60;min-width:calc(var(--u)*15);max-height:calc(var(--u)*18.25);overflow:auto;padding:calc(var(--u)*0.3125);border:1px solid var(--edge);border-radius:calc(var(--u)*0.75);background:var(--paper);box-shadow:0 calc(var(--u)*0.75) calc(var(--u)*2) calc(var(--u)*-0.75) color-mix(in srgb,var(--ink) 45%,transparent)}
.slash button{display:flex;justify-content:space-between;align-items:baseline;gap:calc(var(--u)*1.25);width:100%;padding:calc(var(--u)*0.3438) calc(var(--u)*0.625) calc(var(--u)*0.375);border:0;border-radius:calc(var(--u)*0.4375);background:none;color:var(--ink);font:400 calc(var(--u)*0.9062)/1.3 var(--ui);text-align:left;cursor:pointer}
.slash button i{font:400 calc(var(--u)*0.75)/1.3 var(--s-mono);font-style:normal;color:var(--dim);white-space:nowrap}
.slash button.on,.slash button:hover{background:var(--panel)}
/* focus: nothing on the page but the post */
html.desk-focus .set-side,html.desk-focus .set-head,html.desk-focus #sample-note,html.desk-focus .c-views,html.desk-focus .c-io,html.desk-focus .c-mode,html.desk-focus .c-back,html.desk-focus .c-preview,html.desk-focus .fmt-help{display:none}
html.desk-focus .desk{display:block}
html.desk-focus .set-main{max-width:none}
html.desk-focus .composer{grid-template-columns:minmax(0,1fr)}
html.desk-focus .composer .sheet{display:block;max-width:calc(var(--u)*45);margin:0 auto;padding:calc(var(--u)*2.5) 0 calc(var(--u)*1.25);border:0}
html.desk-focus .c-bar{position:fixed;z-index:20;top:calc(var(--u)*0.875);right:calc(var(--u)*1.375);margin:0}
html.desk-focus .p-edit .c-foot{max-width:calc(var(--u)*45);margin-left:auto;margin-right:auto}
html.desk-focus .desk textarea.c-text{min-height:60vh;font-size:calc(var(--u)*1.25)}
/* the photo */
.ph-now img{display:block;width:calc(var(--u)*11.25);height:auto;margin:0 0 calc(var(--u)*0.875);border-radius:calc(var(--u)*0.75)}
.ph-now canvas{display:block;margin:0 0 calc(var(--u)*0.875);image-rendering:pixelated}
.pix-tools{display:inline-flex;flex-wrap:wrap;align-items:center;gap:2px;margin:0 0 calc(var(--u)*0.875);padding:2px;border-radius:999px;background:var(--panel)}
.pix-tools[hidden],.pix-old[hidden]{display:none}
.pix-tools button{margin:0;padding:calc(var(--u)*0.25) calc(var(--u)*0.8125) calc(var(--u)*0.2812);border:0;border-radius:999px;background:none;color:var(--soft);font:500 calc(var(--u)*0.8438)/1.3 var(--ui);cursor:pointer}
.pix-tools button:hover{color:var(--ink)}
.pix-tools button[aria-pressed="true"]{background:var(--paper);color:var(--ink);box-shadow:0 0 0 1px var(--hair),0 1px 2px color-mix(in srgb,var(--ink) 8%,transparent)}
.ph-as span{margin-right:calc(var(--u)*0.875);font-size:calc(var(--u)*0.875);color:var(--dim)}
/* signing in */
.sign{max-width:calc(var(--u)*34);padding:calc(var(--u)*1.375) calc(var(--u)*1.625) calc(var(--u)*1.5);border:1px solid var(--edge);border-radius:calc(var(--u)*0.875);background:var(--paper)}
.sign p{margin:0 0 calc(var(--u)*0.75)}
.sign ol{margin:0 0 calc(var(--u)*0.5);padding-left:1.3em;list-style:decimal;color:var(--soft)}
.sign li{margin-bottom:calc(var(--u)*0.25)}
.sign a{color:var(--ink);text-decoration-thickness:1px;text-underline-offset:.2em}
.sign .c-actions{margin-top:calc(var(--u)*1.125)}
.sign .c-msg{margin-top:calc(var(--u)*0.625)}
.sign .aside{margin:calc(var(--u)*1) 0 0;font-size:calc(var(--u)*0.8438);font-style:normal;color:var(--dim)}
.desk:has(> .set-lock){display:block;background:var(--panel)}
.set-lock{width:100%;max-width:calc(var(--u)*34);margin:0 auto;padding:8vh calc(var(--u)*1.25) calc(var(--u)*3)}
.set-lock .set-brand{padding:0}
.set-lock h1{margin:calc(var(--u)*1.5) 0 calc(var(--u)*0.25);font:600 calc(var(--u)*1.75)/1.15 var(--ui);letter-spacing:-.022em !important}
.desk-day{margin:0 0 calc(var(--u)*1.125);color:var(--dim)}
/* narrower screens: the two columns of a post stack, then the panel of parts becomes a row on top */
@media (max-width:1180px){ .c-views button[data-view="both"]{display:none} .composer{grid-template-columns:minmax(0,1fr)} .c-preview{position:static;margin-top:calc(var(--u)*1.5)} }
@media (max-width:860px){
  .desk{display:block}
  .set-side{position:static;height:auto;padding:calc(var(--u)*1) 0 calc(var(--u)*0.75)}
  .set-brand,.set-foot{padding-left:calc(var(--u)*1.25);padding-right:calc(var(--u)*1.25)}
  .set-title,.set-group{display:none}
  .desk-tabs{flex-direction:row;gap:calc(var(--u)*0.25);margin-top:calc(var(--u)*0.75);padding:2px calc(var(--u)*1.25) calc(var(--u)*0.5);scrollbar-width:none}
  .desk-tabs button{flex:none;width:auto;white-space:nowrap}
  .set-foot{display:flex;flex-wrap:wrap;align-items:baseline;gap:calc(var(--u)*0.25) calc(var(--u)*1);margin-top:calc(var(--u)*0.25);padding-top:calc(var(--u)*0.5)}
  .desk-status{margin:0}
  .set-back{margin:0;padding:0;font-size:inherit;text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:.2em}
  .set-back:hover{background:none}
  .set-main{padding-top:calc(var(--u)*1.5)}
  .set-head{margin-bottom:calc(var(--u)*1.25)}
  .set-head h1{font-size:calc(var(--u)*1.5)}
  .e-list li{grid-template-columns:minmax(0,1fr) auto;gap:calc(var(--u)*0.25) calc(var(--u)*0.875)}
  .e-main{grid-column:1 / -1}
  .e-list .when{justify-self:start;order:2}
  .e-state{order:1;justify-self:start}
  .e-do{order:3;grid-column:1 / -1}
  .pair{grid-template-columns:minmax(0,1fr);gap:calc(var(--u)*0.375);padding-bottom:calc(var(--u)*0.625)}
  .part{grid-template-columns:minmax(0,1fr) auto;gap:calc(var(--u)*0.375) calc(var(--u)*0.875)}
  .sheet{padding:calc(var(--u)*1.125) calc(var(--u)*1) calc(var(--u)*1.25)}
  .c-preview{padding:calc(var(--u)*1.125) calc(var(--u)*1)}
  .c-mode{flex-basis:auto}
}
`;

  // what Settings holds: the group, then for each part its key, its name, the pattern it once had on the site (not shown any more) and one line about it
  const NAV = [
    ["Writing", [
      ["diary", "Posts", "p-hatch", "Blog entries. A draft stays here until you publish it."],
      ["research", "Research", "p-dots", "Projects and their write-ups."],
      ["books", "Reading", "p-lines", "Papers and books. The Reading page lists the papers first."],
      ["bookmarks", "Bookmarks", "p-marks", "Links you find worth keeping: websites, videos, articles, papers. Each can have a line on why."],
      ["programs", "Programs", "p-grid", "Courses, programs and events."],
      ["cv", "CV", "p-cross", "Everything on the CV page."],
      ["now", "Now", "p-bars", "What you are doing these days. It shows on the About me page, under your description. The month under it is set when you save."]]],
    ["Site", [
      ["about", "Profile", "", "Who you are, and how people reach you. The description is the text of the About me page."],
      ["portrait", "Photo", "", "The photo on the About me page."],
      ["pages", "Pages", "", "Which pages the site has, and the line under each page title."],
      ["look", "Appearance", "", "Colours, paper and type."],
      ["words", "Labels", "", "Every label on the site. Change any of them."]]],
    ["Account", [
      ["account", "Sign in", "", "Saving goes to GitHub, with a token that stays in this browser."]]]
  ];
  const TABS = NAV.reduce((all, g) => all.concat(g[1]), []);
  const PROMPTS = ["What did you read today?", "What did you try today?", "What surprised you today?", "What are you stuck on?", "What do you want to remember from today?"];

  /* ---------- the page ---------- */
  B.desk = function (root) {
    if (root.dataset.ready) { $$("textarea", root).forEach(t => { if (t.offsetParent) grow(t); }); return; }
    root.dataset.ready = "1";
    root.className = "desk";
    if (!$("#desk-css")) { const st = el("style"); st.id = "desk-css"; st.textContent = CSS; document.head.appendChild(st); }

    let session = loadSession(), store = session ? githubStore(session) : demoStore(), posts = [];
    // The posts there are. Signed in, the folder on GitHub says so: every .md file in content/posts is one post.
    // A file is only read again when its text changed. In the demo the list is the one the site was built with.
    const entryOf = (id, text) => { const p = B.readPost(id, text), e = { id: id, title: p.title, date: p.date, draft: p.draft, teaser: p.teaser, words: p.words }; if (p.topic) e.topic = p.topic; return e; };
    async function readIndex() {
      if (!store.list) return sortPosts(posts.slice());
      const files = (await store.list("content/posts")).filter(f => /\.md$/.test(f.name));
      let seen = {}; try { seen = JSON.parse(localStorage.getItem(SEEN) || "{}") || {}; } catch (e) { seen = {}; }
      const keep = {};
      const list = await Promise.all(files.map(async f => {
        const id = f.name.slice(0, -3), old = seen[id];
        if (old && old.sha === f.sha && old.post) { keep[id] = old; return old.post; }
        const post = entryOf(id, await store.read("content/posts/" + f.name));
        keep[id] = { sha: f.sha, post: post };
        return post;
      }));
      try { localStorage.setItem(SEEN, JSON.stringify(keep)); } catch (e) { /* storage is optional */ }
      return sortPosts(list);
    }
    const locked = !session && !B.preview, brand = (B.site().words || {}).brand || B.site().name || "";
    const steps =
      "<ol><li>Open <a href=\"https://github.com/settings/personal-access-tokens/new\" target=\"_blank\" rel=\"noopener\">GitHub’s new token page</a>.</li>" +
      "<li>Give the token a name and an expiry date.</li>" +
      "<li>Under Repository access, pick Only select repositories. Then pick this site’s repo.</li>" +
      "<li>Under Permissions, set Contents to Read and write.</li>" +
      "<li>Create the token, copy it, and paste it here.</li></ol>" +
      '<label><span class="lab">Repo</span><input type="text" id="s-repo" autocomplete="off" spellcheck="false"></label>' +
      '<label><span class="lab">Token</span><input type="password" id="s-token" autocomplete="off" spellcheck="false"></label>' +
      '<div class="c-actions"><button class="primary" type="button" id="s-go">Sign in</button></div><p class="c-msg" id="s-msg" role="status"></p>' +
      '<p class="aside">The token stays in this browser. It is sent to GitHub and nowhere else. Signing out forgets it.</p>';
    const home = '<p class="set-brand"><a href="/">' + esc(brand) + "</a></p>";
    root.innerHTML = locked
      ? '<div class="set-lock">' + home + '<h1 tabindex="-1">Settings</h1><p class="desk-day">This page is private.</p><p class="desk-status" id="desk-status" hidden></p>' +
        '<div class="sign locked" id="desk-sign"><p><b>Sign in with your GitHub token.</b> If you do not have one yet:</p>' + steps + "</div></div>"
      : '<aside class="set-side">' + home + '<p class="set-title">Settings</p>' +
        '<nav class="desk-tabs" role="tablist" aria-label="Settings">' + NAV.map(g => '<p class="set-group">' + g[0] + "</p>" + g[1].map(t => '<button type="button" role="tab" id="tab-' + t[0] + '" data-tab="' + t[0] + '" aria-selected="false"><span>' + t[1] + "</span></button>").join("")).join("") + "</nav>" +
        '<div class="set-foot"><p class="desk-status" id="desk-status"></p><a class="set-back" href="/">Back to the site</a></div></aside>' +
        '<div class="set-main">' + TABS.map(t => '<header class="set-head" id="head-' + t[0] + '" hidden><div><h1 tabindex="-1">' + t[1] + "</h1><p>" + t[3] + '</p></div><div class="set-act" id="act-' + t[0] + '"></div></header>' +
          '<section class="desk-panel" id="panel-' + t[0] + '" role="tabpanel" aria-labelledby="tab-' + t[0] + '" hidden></section>').join("") + "</div>";

    /* signing in and out */
    const status = $("#desk-status", root);
    async function restart() { root.dataset.ready = ""; document.documentElement.classList.remove("desk-focus"); B.overlay.clear(); try { await B.reload(); } catch (e) { /* keeps what is on screen */ } B.desk(root); const link = $("#desk-link"); if (link) link.hidden = !(loadSession() || B.preview); }
    const signOut = b => twice(b, "Sign out and forget the token?", () => { keepSession(null); restart(); });
    if (!locked) {          // the Account part: the sign-in box, or a line that says where saves go
      const acc = $("#panel-account", root);
      if (store.demo) acc.innerHTML = '<div class="sign" id="desk-sign">' + (B.preview ? "<p><b>This is a preview.</b> Signing in works on the real site.</p>" : "") + steps + "</div>";
      else {
        acc.innerHTML = '<div class="sign"><p>You are signed in on this browser. Every save is one commit to <b>' + esc(session.repo) + '</b>.</p><p class="aside">The token stays in this browser. It is sent to GitHub and nowhere else. Signing out forgets it.</p><div class="c-actions"><button class="linkish" type="button" id="s-out2">Sign out</button></div></div>';
        $("#s-out2", acc).addEventListener("click", e => signOut(e.currentTarget));
        $("#tab-account span", root).textContent = "Account"; $("#head-account h1", root).textContent = "Account";
      }
    }
    const sign = $("#desk-sign", root);
    function drawStatus(extra) {
      if (store.demo) status.innerHTML = "This is a demo. Nothing you do here is saved." + (extra ? " " + esc(extra) : "") + ' <button class="linkish" type="button" id="s-open">Sign in to save</button>';
      else status.innerHTML = "Signed in. Saves go to " + esc(session.repo) + "." + (extra ? " " + esc(extra) : "") + ' <button class="linkish" type="button" id="s-out">Sign out</button>';
      const open = $("#s-open", status), out = $("#s-out", status);
      if (open) open.addEventListener("click", () => { openTab("account"); const t = $("#s-token", root); if (t) t.focus(); });
      if (out) out.addEventListener("click", () => signOut(out));
    }
    if (sign) {
      $("#s-repo", sign).value = (B.site().repo || "");
      $("#s-go", sign).addEventListener("click", async () => {
        const repo = $("#s-repo", sign).value.trim().replace(/^https?:\/\/github\.com\//, "").replace(/\/+$/, ""), token = $("#s-token", sign).value.trim(), m = $("#s-msg", sign);
        if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) return say(m, "The repo looks like name/repo.");
        if (!token) return say(m, "Paste the token first.");
        const s = { repo: repo, token: token, branch: "main" };
        say(m, "Checking with GitHub.");
        try { s.branch = await githubStore(s).check(); } catch (e) { return say(m, e.status === 404 ? "GitHub does not show that repo to this token. Check the repo name and the token’s Repository access." : e.status === 401 ? "GitHub did not accept the token. Check that you copied all of it and that it has not expired." : why(e)); }
        keepSession(s); restart();
      });
    }
    if (locked) return;            // nothing else is built until the token is in
    drawStatus();

    /* the parts */
    const built = { account: true }, ready = {};
    const syncTabs = () => {};          // every part is always listed
    syncTabs();
    function openTab(name) {
      TABS.forEach(t => { const on = t[0] === name; $("#tab-" + t[0], root).setAttribute("aria-selected", on ? "true" : "false"); $("#panel-" + t[0], root).hidden = !on; $("#head-" + t[0], root).hidden = !on; });
      root.dataset.tab = name;
      const panel = $("#panel-" + name, root);
      if (!built[name]) { built[name] = true; if (name === "diary") openDiary(panel); else if (name === "portrait") openPortrait(panel); else ready[name] = openForm(name, panel); }
      else $$("textarea", panel).forEach(t => { if (t.offsetParent) grow(t); });
    }
    $(".desk-tabs", root).addEventListener("click", e => {
      const b = e.target.closest("button[data-tab]"); if (!b) return;
      if (document.documentElement.classList.contains("desk-focus")) document.documentElement.classList.remove("desk-focus");
      openTab(b.dataset.tab); window.scrollTo(0, 0);
    });

    /* a part that is a form: the boxes, and one bar at the bottom that saves them */
    async function openForm(name, panel) {
      const sc = FORMS[name], act = $("#act-" + name, root);
      panel.innerHTML = '<p class="c-msg">Loading.</p>';
      let data;
      try { data = JSON.parse(await store.read(sc.file)); } catch (e) { if (sc.empty && e && e.status === 404) data = sc.empty(); else { built[name] = false; panel.innerHTML = ""; say(panel.appendChild(el("p", "c-msg")), why(e)); return; } }
      if (sc.fill) sc.fill(data);
      const form = build(sc.schema, data), holder = el("div", "form"), foot = el("div", "c-foot"), actions = el("div", "c-actions"), saveBtn = el("button", "primary", "Save"), m = el("p", "c-msg");
      panel.innerHTML = "";
      saveBtn.type = "button"; m.setAttribute("role", "status");
      holder.appendChild(form.node); actions.appendChild(saveBtn); foot.append(actions, m); panel.append(holder, foot);
      const due = () => { m.textContent = "Not saved yet."; foot.classList.add("due"); };
      holder.addEventListener("input", due);
      holder.addEventListener("click", e => { if (e.target.closest(".mini button, .add")) setTimeout(due, 0); });          // moving, removing and adding change the form too
      // the button beside the title adds one to the first list of the part
      const first = $$(".list", holder).filter(l => !l.parentNode.closest(".card"))[0];
      if (act && first && sc.add) {
        act.innerHTML = '<button class="primary" type="button">' + esc(sc.add) + "</button>";
        act.firstChild.addEventListener("click", () => { first.lastElementChild.click(); const card = first.firstElementChild.lastElementChild; if (card) card.scrollIntoView({ block: "center" }); });
      }
      saveBtn.addEventListener("click", async () => {
        let out = form.get();
        saveBtn.disabled = true; say(m, "Saving.");
        try {
          if (sc.schema.type === "object") {       // other parts may have changed the same file: take it fresh and replace only what this part holds
            let fresh;
            try { fresh = JSON.parse(await store.read(sc.file)); } catch (e) { if (sc.empty && e && e.status === 404) fresh = sc.empty(); else throw e; }
            sc.schema.fields.forEach(f => { if (!f.key) return; if (f.key in out) fresh[f.key] = out[f.key]; else delete fresh[f.key]; });
            if (sc.file === "content/site.json") delete fresh.paper;       // the paper colour lives under look now
            out = fresh;
          }
          if (sc.before) sc.before(out);
          await store.commit("Update " + sc.label.toLowerCase(), [{ path: sc.file, content: JSON.stringify(out, null, 2) + "\n" }]);
          if (sc.saved) sc.saved();
          await B.reload();
          syncTabs();
          foot.classList.remove("due");
          say(m, store.demo ? "Saved in the demo. Reload the page and it is gone." : "Saved. The site shows it in a minute or two.", true);
          B.say("saved");
        } catch (e) { say(m, why(e)); }
        saveBtn.disabled = false;
      });
      $$("textarea", panel).forEach(t => { if (t.offsetParent) grow(t); });
    }

    /* ---------- the portrait: a small pixel editor. Every square is ink, light or empty. ---------- */
    async function openPortrait(panel) {
      const N = 65, CELL = 8;
      panel.innerHTML = '<p class="c-msg">Loading.</p>';
      let rows;
      try { rows = JSON.parse(await store.read("content/portrait.json")).rows; } catch (e) { rows = null; }
      if (!rows || rows.length !== N) rows = Array.from({ length: N }, () => "-".repeat(N));
      let g = rows.map(r => r.split("")), tool = "1", brush = 1, undo = [], photo = null;
      panel.innerHTML =
        '<p class="desk-note">It is made smaller before it is saved, and nothing the camera wrote into the file is kept. It stands on the About me page.</p>' +
        '<div class="ph-now" id="ph-now"></div>' +
        '<div class="pix-tools ph-as" id="ph-as" role="group" aria-label="How the photo is shown"><span>Show it</span><button type="button" data-as="dots">As dots</button><button type="button" data-as="plain">As it is</button></div>' +
        '<p><button class="linkish" type="button" id="ph-pick">Choose a photo</button><input type="file" id="ph-file" accept="image/*" hidden></p><p class="c-msg" id="ph-msg" role="status"></p>' +
        '<div class="pix-old" hidden><h2 class="group-h">The pixel portrait</h2>' +
        '<p class="desk-note">Every square is ink, light or empty. Empty squares are outside the figure. Draw with the mouse or a finger. Under Look you choose which of the two shows.</p>' +
        '<div class="pix"><div><canvas id="pix" width="' + N * CELL + '" height="' + N * CELL + '" aria-label="The portrait, square by square"></canvas></div><div>' +
        '<div class="pix-tools" id="pix-tool" role="group" aria-label="What to draw"><button type="button" data-t="1">Ink</button><button type="button" data-t="0">Light</button><button type="button" data-t="-">Empty</button></div>' +
        '<div class="pix-tools" id="pix-brush" role="group" aria-label="Brush size"><button type="button" data-b="1">Fine</button><button type="button" data-b="3">Wide</button><button type="button" id="pix-undo">Undo</button></div>' +
        '<div class="pix-views" aria-hidden="true"><div class="pv-a" id="pv-a"></div><div class="pv-b" id="pv-b"></div></div>' +
        '<p><button class="linkish" type="button" id="pix-pick">Start from a photo</button><input type="file" id="pix-file" accept="image/*" hidden></p>' +
        '<div id="pix-photo" hidden><label><span class="lab">Lighter or darker</span><input type="range" id="pix-t" min="25" max="75" value="50"></label>' +
        '<label class="check"><input type="checkbox" id="pix-cut" checked> Cut out the background</label></div>' +
        '</div></div><div class="c-actions"><button class="primary" type="button" id="pix-save">Save</button></div><p class="c-msg" id="pix-msg" role="status"></p></div>';
      const cv = $("#pix", panel), ctx = cv.getContext("2d"), m = $("#pix-msg", panel);
      /* the photo: picked, made smaller, saved next to the other pictures, and switched on */
      const pm = $("#ph-msg", panel), showPhoto = () => {          // the photo the way the site shows it now, and which of the two buttons is on
        const at = B.site().photo, look = B.site().look || {}, on = !!at && look.side === "photo", dots = !(look.photoAs ? look.photoAs === "plain" : look.photoDots === false);
        $("#ph-now", panel).innerHTML = !at ? "" : on && dots ? '<canvas data-photo width="4" height="5" role="img" aria-label="The photo that is saved now, as dots"></canvas>' : '<img src="' + B.attr(B.imgSrc(at)) + '" alt="The photo that is saved now">';
        if (on && dots) B.inkPhoto();
        $("#ph-as", panel).hidden = !at;
        $$("#ph-as button", panel).forEach(b => b.setAttribute("aria-pressed", on && (b.dataset.as === "dots") === dots ? "true" : "false"));
      };
      const small = file => new Promise((ok, no) => {
        const fr = new FileReader();
        fr.onerror = () => no(new Error("could not read the picture"));
        fr.onload = () => {
          const img = new Image();
          img.onerror = () => no(new Error("that file is not a picture"));
          img.onload = () => {
            const k = Math.min(1, 900 / Math.max(img.naturalWidth, img.naturalHeight)), c = document.createElement("canvas");
            c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
            c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
            ok({ url: c.toDataURL("image/jpeg", 0.86), w: c.width, h: c.height });
          };
          img.src = fr.result;
        };
        fr.readAsDataURL(file);
      });
      showPhoto();
      $("#ph-as", panel).addEventListener("click", async e => {          // one click saves it, and puts the photo beside the description
        const b = e.target.closest("button[data-as]");
        if (!b) return;
        say(pm, "Saving.");
        try {
          const site = JSON.parse(await store.read("content/site.json"));
          site.look = Object.assign({}, site.look, { side: "photo", photoAs: b.dataset.as }); delete site.look.photoDots;
          await store.commit(b.dataset.as === "dots" ? "Show the photo as dots" : "Show the photo as it is", [{ path: "content/site.json", content: JSON.stringify(site, null, 2) + "\n" }]);
          built.look = false;
          await B.reload(); showPhoto();
          say(pm, store.demo ? "Saved in the demo. Reload the page and it is gone." : "Saved. The site shows it in a minute or two.", true);
        } catch (err) { say(pm, err.status === undefined ? "That did not work: " + err.message + "." : why(err)); }
      });
      $("#ph-pick", panel).addEventListener("click", () => $("#ph-file", panel).click());
      $("#ph-file", panel).addEventListener("change", async e => {
        const file = e.target.files[0]; e.target.value = "";
        if (!file) return;
        say(pm, "Saving the photo.");
        try {
          const pic = await small(file), site = JSON.parse(await store.read("content/site.json")), path = "content/img/me-" + Date.now().toString(36) + ".jpg";
          site.photo = path; site.photoSize = [pic.w, pic.h]; site.look = Object.assign({}, site.look, { side: "photo" });
          await store.commit("Change the photo", [{ path: path, base64: pic.url.split(",")[1], dataUrl: pic.url }, { path: "content/site.json", content: JSON.stringify(site, null, 2) + "\n" }]);
          built.look = false;          // the Look tab reads the file again, so it knows the photo is showing
          await B.reload(); showPhoto();
          say(pm, store.demo ? "Saved in the demo. Reload the page and it is gone." : "Saved. The site shows it in a minute or two.", true);
        } catch (err) { say(pm, err.status === undefined ? "That did not work: " + err.message + "." : why(err)); }
      });
      function paint() {
        const cs = getComputedStyle(document.documentElement), ink = cs.getPropertyValue("--a").trim(), paper = cs.getPropertyValue("--b").trim();
        ctx.fillStyle = paper; ctx.fillRect(0, 0, cv.width, cv.height);
        ctx.fillStyle = ink;
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          if (g[y][x] === "1") ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
          else if (g[y][x] === "-") ctx.fillRect(x * CELL + 3, y * CELL + 3, 2, 2);          // a dot marks an empty square
        }
        const svg = B.portraitSvg(g.map(r => r.join("")));
        $("#pv-a", panel).innerHTML = svg; $("#pv-b", panel).innerHTML = svg;
        $$("#pix-tool button", panel).forEach(b => b.setAttribute("aria-pressed", b.dataset.t === tool ? "true" : "false"));
        $$("#pix-brush button[data-b]", panel).forEach(b => b.setAttribute("aria-pressed", Number(b.dataset.b) === brush ? "true" : "false"));
      }
      const keepUndo = () => { undo.push(g.map(r => r.join(""))); if (undo.length > 40) undo.shift(); };
      function dab(e) {
        const r = cv.getBoundingClientRect(), cx = Math.floor((e.clientX - r.left) / r.width * N), cy = Math.floor((e.clientY - r.top) / r.height * N), h = (brush - 1) / 2;
        for (let y = cy - h; y <= cy + h; y++) for (let x = cx - h; x <= cx + h; x++) if (y >= 0 && y < N && x >= 0 && x < N) g[y][x] = tool;
        paint(); m.textContent = "Not saved yet.";
      }
      let down = false;
      cv.addEventListener("pointerdown", e => { e.preventDefault(); down = true; keepUndo(); try { cv.setPointerCapture(e.pointerId); } catch (err) { /* not needed */ } dab(e); });
      cv.addEventListener("pointermove", e => { if (down) dab(e); });
      ["pointerup", "pointercancel"].forEach(t => cv.addEventListener(t, () => { down = false; }));
      $("#pix-tool", panel).addEventListener("click", e => { const b = e.target.closest("button[data-t]"); if (b) { tool = b.dataset.t; paint(); } });
      $("#pix-brush", panel).addEventListener("click", e => {
        const b = e.target.closest("button"); if (!b) return;
        if (b.id === "pix-undo") { const last = undo.pop(); if (last) { g = last.map(r => r.split("")); m.textContent = "Not saved yet."; } } else brush = Number(b.dataset.b);
        paint();
      });

      /* a photo becomes squares: the background is cut away, then each square is ink or light */
      function convert() {
        const K = 4, S = N * K, c = document.createElement("canvas"); c.width = c.height = S;
        const x2 = c.getContext("2d"), w = photo.naturalWidth, h = photo.naturalHeight, k = Math.max(S / w, S / h);
        x2.fillStyle = "#fff"; x2.fillRect(0, 0, S, S); x2.drawImage(photo, (S - w * k) / 2, (S - h * k) / 2, w * k, h * k);
        const d = x2.getImageData(0, 0, S, S).data, gray = new Float32Array(S * S), bg = new Uint8Array(S * S);
        for (let i = 0; i < S * S; i++) gray[i] = (0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]) / 255;
        const sorted = Array.from(gray).sort((a, b) => a - b), lo = sorted[Math.floor(S * S * 0.02)], hi = sorted[Math.floor(S * S * 0.98)], span = Math.max(0.05, hi - lo);
        if ($("#pix-cut", panel).checked) {           // squares like the top corners, reached from the edges, are background
          let r0 = 0, g0 = 0, b0 = 0, n = 0;
          [[2, 2], [S - 3, 2], [2, 12], [S - 3, 12], [12, 2], [S - 13, 2]].forEach(p => { const i = (p[1] * S + p[0]) * 4; r0 += d[i]; g0 += d[i + 1]; b0 += d[i + 2]; n++; });
          r0 /= n; g0 /= n; b0 /= n;
          const like = i => Math.abs(d[i * 4] - r0) + Math.abs(d[i * 4 + 1] - g0) + Math.abs(d[i * 4 + 2] - b0) < 60, stack = [];
          const seed = i => { if (!bg[i] && like(i)) { bg[i] = 1; stack.push(i); } };
          for (let x = 0; x < S; x++) seed(x);
          for (let y = 0; y < S; y++) { seed(y * S); seed(y * S + S - 1); }
          while (stack.length) { const i = stack.pop(), x = i % S, y = (i - x) / S; if (x > 0) seed(i - 1); if (x < S - 1) seed(i + 1); if (y > 0) seed(i - S); if (y < S - 1) seed(i + S); }
        }
        const dark = [], fig = [];
        for (let cy = 0; cy < N; cy++) { dark.push([]); fig.push([]); for (let cx = 0; cx < N; cx++) {
          let sum = 0, n = 0;
          for (let y = 0; y < K; y++) for (let x = 0; x < K; x++) { const i = (cy * K + y) * S + cx * K + x; if (!bg[i]) { sum += 1 - Math.min(1, Math.max(0, (gray[i] - lo) / span)); n++; } }
          fig[cy].push(n >= K * K / 2); dark[cy].push(n ? sum / n : 0);
        } }
        const t = Number($("#pix-t", panel).value) / 100;
        g = dark.map((row, cy) => row.map((v, cx) => {
          if (!fig[cy][cx]) return "-";
          let sum = 0, n = 0;           // a square a good deal darker than what is around it is ink too: that keeps eyes and mouth
          for (let y = cy - 2; y <= cy + 2; y++) for (let x = cx - 2; x <= cx + 2; x++) if (y >= 0 && y < N && x >= 0 && x < N && fig[y][x]) { sum += dark[y][x]; n++; }
          return v >= 1 - t || v - sum / n > 0.11 ? "1" : "0";
        }));
        paint(); m.textContent = "Not saved yet.";
      }
      $("#pix-pick", panel).addEventListener("click", () => $("#pix-file", panel).click());
      $("#pix-file", panel).addEventListener("change", e => {
        const file = e.target.files[0]; e.target.value = ""; if (!file) return;
        const fr = new FileReader();
        fr.onload = () => { const img = new Image(); img.onload = () => { photo = img; keepUndo(); $("#pix-photo", panel).hidden = false; convert(); }; img.onerror = () => say(m, "That file is not a picture."); img.src = fr.result; };
        fr.readAsDataURL(file);
      });
      $("#pix-t", panel).addEventListener("input", () => { if (photo) convert(); });
      $("#pix-cut", panel).addEventListener("change", () => { if (photo) convert(); });
      $("#pix-save", panel).addEventListener("click", async () => {
        const btn = $("#pix-save", panel); btn.disabled = true; say(m, "Saving.");
        try {
          await store.commit("Update the portrait", [{ path: "content/portrait.json", content: JSON.stringify({ rows: g.map(r => r.join("")) }, null, 1) + "\n" }]);
          await B.reload();
          say(m, store.demo ? "Saved in the demo. Reload the page and it is gone." : "Saved. The site shows it in a minute or two.", true);
        } catch (e) { say(m, why(e)); }
        btn.disabled = false;
      });
      paint();
    }

    /* ---------- the diary ---------- */
    function openDiary(panel) {
      panel.innerHTML =
        '<div class="garden" id="garden" hidden></div><p class="garden-says" id="garden-says" hidden></p>' +
        '<div class="p-list" id="p-list"><p class="c-msg" id="p-msg" role="status"></p><div id="entries"></div></div>' +
        '<div class="p-edit" id="p-edit" hidden>' +
        '<div class="c-bar"><button class="linkish c-back" type="button" id="p-back">All posts</button><p class="c-mode" id="c-mode"></p>' +
        '<span class="c-views" role="group" aria-label="How the post is shown"><button type="button" data-view="write">Write</button><button type="button" data-view="both">Side by side</button><button type="button" data-view="read">Read</button></span>' +
        '<button class="linkish" type="button" id="c-focus" aria-pressed="false">Focus</button>' +
        '<span class="c-io"><button class="linkish" type="button" id="c-import">Bring in a note</button><input type="file" id="c-note" accept=".md,.markdown,.txt,text/markdown,text/plain" hidden><button class="linkish" type="button" id="c-export">Save as a note</button></span></div>' +
        '<div class="composer" data-view="both"><div class="sheet">' +
        '<textarea class="c-title" id="c-title" rows="1" placeholder="Title" aria-label="Title"></textarea>' +
        '<div class="c-row"><label>Date <input id="c-date" type="date" aria-label="Date"></label><label>Topic <select id="c-topic" aria-label="Topic"></select></label><span id="c-count"></span><span id="c-kept"></span></div>' +
        '<div class="c-tools" role="toolbar" aria-label="Formatting">' + ["Bold", "Italic", "Mark", "Link", "Heading", "List", "Quote", "Code", "Table", "Note", "Footnote", "Picture"].map(t => '<button class="linkish" type="button" data-tool="' + t + '">' + t + "</button>").join("") + '<input type="file" id="c-file" accept="image/png,image/jpeg,image/gif,image/webp" hidden></div>' +
        '<p class="c-hint">Type <kbd>/</kbd> on a new line to put something in. A picture can be pasted or dropped into the text.</p>' +
        '<textarea class="c-text" id="c-text" aria-label="The post" placeholder="' + PROMPTS[Math.floor(Date.now() / 864e5) % PROMPTS.length] + '"></textarea>' +
        '<label><span class="lab">One line under the title in the list of posts. Optional. A draft with this line shows on the Blog page under Half written.</span><input id="c-teaser" type="text" autocomplete="off"></label>' +
        '</div><div class="c-preview"><p class="c-label">How it will look</p><article class="reader"><h1 id="p-title"></h1><p class="meta" id="p-date"></p><div class="body" id="p-body"></div></article></div></div>' +
        '<div class="c-foot"><div class="c-actions"><button class="primary" type="button" id="c-publish">Publish</button><button class="linkish" type="button" id="c-draft">Save as draft</button><button class="linkish" type="button" id="c-new">Start over</button><button class="linkish" type="button" id="c-delete" hidden>Delete</button></div><p class="c-msg" id="c-msg" role="status"></p></div>' +
        "</div>";
      const garden = $("#garden", panel), gardenSays = $("#garden-says", panel), entries = $("#entries", panel);
      const title = $("#c-title", panel), date = $("#c-date", panel), text = $("#c-text", panel), teaser = $("#c-teaser", panel), topic = $("#c-topic", panel);
      // the topics come from Settings, Pages. A post keeps a topic that is no longer in that list.
      const setTopics = v => { const list = (B.site().topics || []).map(t => String(t || "").trim()).filter(Boolean); if (v && list.indexOf(v) < 0) list.push(v); topic.innerHTML = '<option value="">None</option>' + list.map(t => '<option value="' + B.attr(t) + '">' + esc(t) + "</option>").join(""); topic.value = v || ""; };
      const pub = $("#c-publish", panel), dr = $("#c-draft", panel), fresh = $("#c-new", panel), del = $("#c-delete", panel), msg = $("#c-msg", panel), mode = $("#c-mode", panel);
      let cur = { id: null, wasDraft: true }, dirty = false, keepTimer = null;

      /* the garden */
      function drawGarden(celebrate) {
        const have = new Set(posts.filter(p => !p.draft && p.date).map(p => p.date));
        const streakAt = d => { let n = 0; while (have.has(d) && n < 400) { n++; d = dayBefore(d); } return n; };
        const days = []; let d = today();
        for (let i = 0; i < 28; i++) { days.unshift(d); d = dayBefore(d); }
        garden.innerHTML = '<div class="plots">' + days.map((day, i) => {
          const n = streakAt(day), isToday = i === days.length - 1, nice = B.niceDate(day);
          const inner = (n ? px("grow" + stage(n), 3) : isToday ? px("here", 3) : "") + "<i>" + Number(day.slice(8)) + "</i>";
          return n || isToday
            ? '<button type="button" class="plot' + (isToday ? " today" : "") + '" data-d="' + day + '"' + (n ? ' data-has="1"' : "") + ' aria-label="' + (n ? "Open the entry of " + nice : "Write today’s entry") + '">' + inner + "</button>"
            : '<span class="plot" data-d="' + day + '">' + inner + "</span>";
        }).join("") + '</div><span class="gbot" id="gbot" aria-hidden="true"><span class="bot-says" id="gbot-says"></span>' + px("bot", 3) + "</span>";
        const t = today(), run = streakAt(t) || streakAt(dayBefore(t)), count = posts.filter(p => !p.draft && p.date).length;
        gardenSays.textContent = (have.has(t) ? "Today is written." : "Nothing written today yet.") + (run > 1 ? " " + run + " days in a row." : "") + " " + count + (count === 1 ? " entry" : " entries") + " so far.";
        garden.dataset.next = stage(streakAt(dayBefore(t)) + 1);
        if (celebrate) water(celebrate); else seed();
      }
      // while today's entry is being written, its plant waits in today's plot, dotted
      function seed() {
        const plot = $(".plot.today", garden);
        if (!plot || plot.dataset.has) return;
        const want = words(text.value) > 0 && date.value === today() && (!cur.id || cur.wasDraft);
        if (!!plot.dataset.ghost === want) return;
        plot.dataset.ghost = want ? "1" : ""; plot.classList.toggle("ghost", want);
        $("svg", plot).outerHTML = want ? px("wait" + garden.dataset.next, 3) : px("here", 3);
      }
      function cheer(line) {
        const bot = $("#gbot", garden), bubble = $("#gbot-says", garden);
        if (!bot || bot.classList.contains("walk")) return;
        bubble.textContent = line; bubble.classList.add("on"); bot.classList.add("glad");
        setTimeout(() => { bubble.classList.remove("on"); bot.classList.remove("glad"); }, 2200);
      }
      // after publishing, the robot walks to that day's plot and the plant comes up
      async function water(day) {
        const bot = $("#gbot", garden), bubble = $("#gbot-says", garden), plot = $('.plot[data-d="' + day + '"]', garden);
        const speak = t => { bubble.textContent = t; bubble.classList.add("on"); setTimeout(() => bubble.classList.remove("on"), 2400); };
        if (!plot || !plot.offsetParent || B.REDUCED) { speak("posted"); return; }
        plot.classList.add("new");
        const far = Math.max(0, bot.getBoundingClientRect().left - plot.getBoundingClientRect().right - 2), ms = Math.max(250, far / 260 * 1000);
        bot.classList.add("walk", "left"); bot.style.transitionDuration = ms + "ms"; bot.style.transform = "translateX(-" + far + "px)";
        await wait(ms + 60);
        bot.classList.remove("walk"); bot.classList.add("glad"); speak("posted");
        plot.classList.remove("new"); plot.classList.add("grow");
        await wait(1700);
        bot.classList.remove("glad", "left"); bot.classList.add("walk"); bot.style.transform = "translateX(0)";
        await wait(ms + 60);
        bot.classList.remove("walk");
      }
      garden.addEventListener("click", e => {
        const b = e.target.closest("button.plot"); if (!b) return;
        const p = posts.find(q => !q.draft && q.date === b.dataset.d);
        if (p) open(p.id, b); else { title.focus(); title.scrollIntoView({ block: "center", behavior: B.REDUCED ? "auto" : "smooth" }); }
      });

      /* the entry being written */
      function preview() {
        $("#p-title", panel).textContent = title.value.trim() || "Title";
        $("#p-date", panel).textContent = /^\d{4}-\d{2}-\d{2}$/.test(date.value) ? B.niceDate(date.value) : "";
        $("#p-body", panel).innerHTML = B.md(text.value) || "<p>Your words show up here as you write.</p>";
        const n = words(text.value); $("#c-count", panel).textContent = n + (n === 1 ? " word" : " words") + (n >= 230 ? ", " + Math.round(n / 230) + " min to read" : "");
      }
      function buttons() {
        const old = !!cur.id, live = old && !cur.wasDraft;
        mode.textContent = old ? (live ? "Published" : "Draft") : "New post";
        pub.textContent = live ? "Publish the changes" : "Publish";
        dr.textContent = live ? "Move back to drafts" : "Save as draft";
        del.hidden = !old;
      }
      function fill(e) {
        cur = { id: e.id || null, wasDraft: e.draft !== false };
        title.value = e.title || ""; date.value = e.date || today(); text.value = e.text || ""; teaser.value = e.teaser || ""; setTopics(String(e.topic || "").trim());
        dirty = false; counted = words(text.value); grow(text); grow(title); preview(); buttons(); seed();
      }
      function keep() {            // unsaved text is kept on this device
        clearTimeout(keepTimer);
        keepTimer = setTimeout(() => {
          try {
            localStorage.setItem(UNSAVED, JSON.stringify({ id: cur.id, wasDraft: cur.wasDraft, title: title.value, date: date.value, text: text.value, teaser: teaser.value, topic: topic.value }));
            const n = new Date(); $("#c-kept", panel).textContent = "Kept on this device at " + pad(n.getHours()) + ":" + pad(n.getMinutes()) + ".";
          } catch (e) { /* storage is optional */ }
        }, 500);
      }
      const forget = () => { clearTimeout(keepTimer); try { localStorage.removeItem(UNSAVED); } catch (e) { /* storage is optional */ } $("#c-kept", panel).textContent = ""; };
      let counted = 0;
      [title, date, text, teaser, topic].forEach(n => n.addEventListener("input", () => {
        dirty = true; grow(text); grow(title); preview(); keep(); seed();
        const n2 = words(text.value);
        [100, 250, 500, 1000].forEach(m => { if (counted < m && n2 >= m) cheer(m + " words"); });
        counted = n2;
      }));
      title.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); text.focus(); } });
      title.addEventListener("input", () => { if (/\n/.test(title.value)) title.value = title.value.replace(/\s*\n\s*/g, " "); });

      /* formatting */
      function wrap(before, after, filler) {
        const a = text.selectionStart, b = text.selectionEnd, sel = text.value.slice(a, b) || filler;
        text.setRangeText(before + sel + after, a, b, "end");
        text.setSelectionRange(a + before.length, a + before.length + sel.length);
        text.focus(); text.dispatchEvent(new Event("input", { bubbles: true }));
      }
      function prefix(mark) {
        const v = text.value, a = v.lastIndexOf("\n", text.selectionStart - 1) + 1, b = text.selectionEnd;
        const block = v.slice(a, b).split("\n").map(l => mark + l).join("\n");
        text.setRangeText(block, a, b, "end"); text.focus(); text.dispatchEvent(new Event("input", { bubbles: true }));
      }
      function insert(s) { text.setRangeText(s, text.selectionStart, text.selectionEnd, "end"); text.focus(); text.dispatchEvent(new Event("input", { bubbles: true })); }
      const TOOL = { Bold: () => wrap("**", "**", "bold"), Italic: () => wrap("*", "*", "italic"), Link: () => wrap("[", "](https://)", "words"), Heading: () => prefix("# "), List: () => prefix("- "), Quote: () => prefix("> "), Picture: () => $("#c-file", panel).click(),
        Mark: () => wrap("==", "==", "marked"), Code: () => wrap("\n```python\n", "\n```\n", "print(1)"), Table: () => insert("\n| Model | Shift |\n| --- | ---: |\n| A | 0.03 |\n: What the table shows.\n"), Note: () => insert("\n> [!NOTE]\n> The note.\n"),
        Footnote: () => { let n = 1; while (text.value.indexOf("[^" + n + "]") >= 0) n++; insert("[^" + n + "]"); const at = text.selectionStart; text.value = text.value.replace(/\s*$/, "") + "\n\n[^" + n + "]: The note.\n"; text.setSelectionRange(at, at); text.dispatchEvent(new Event("input", { bubbles: true })); } };
      $(".c-hint", panel).insertAdjacentElement("afterend", fmtHelp());
      $(".c-tools", panel).addEventListener("click", e => { const b = e.target.closest("button[data-tool]"); if (b) TOOL[b.dataset.tool](); });
      text.addEventListener("keydown", e => {
        if (!(e.ctrlKey || e.metaKey)) return;
        const k = e.key.toLowerCase();
        if (k === "s") { e.preventDefault(); save(true); } else if (k === "enter") { e.preventDefault(); save(false); }
      });

      /* pictures: made smaller if they are large, then saved next to the entries */
      function shrink(file) {
        return new Promise((ok, no) => {
          const fr = new FileReader();
          fr.onerror = () => no(new Error("could not read the picture"));
          fr.onload = () => {
            const img = new Image();
            img.onerror = () => no(new Error("that file is not a picture"));
            img.onload = () => {
              const max = 1600, big = Math.max(img.naturalWidth, img.naturalHeight);
              if (file.type === "image/gif" || (big <= max && file.size < 900000)) return ok(fr.result);
              const k = Math.min(1, max / big), c = document.createElement("canvas");
              c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
              c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
              const png = file.type === "image/png" ? c.toDataURL("image/png") : "";
              ok(png && png.length < 1600000 ? png : c.toDataURL("image/jpeg", 0.86));
            };
            img.src = fr.result;
          };
          fr.readAsDataURL(file);
        });
      }
      $("#c-file", panel).addEventListener("change", e => { const file = e.target.files[0]; e.target.value = ""; if (file) addPicture(file); });
      async function addPicture(file) {
        busy(true); say(msg, "Adding the picture.");
        try {
          const dataUrl = await shrink(file), ext = dataUrl.indexOf("data:image/png") === 0 ? ".png" : dataUrl.indexOf("data:image/gif") === 0 ? ".gif" : dataUrl.indexOf("data:image/webp") === 0 ? ".webp" : ".jpg";
          const stem = file.name.replace(/\.[^.]+$/, ""), path = "content/img/" + (date.value || today()) + "-" + slug(stem) + "-" + Date.now().toString(36).slice(-4) + ext;
          await store.commit("Add a picture", [{ path: path, base64: dataUrl.split(",")[1], dataUrl: dataUrl }]);
          insert((text.value && !/\n\n$/.test(text.value.slice(0, text.selectionStart)) ? "\n\n" : "") + "![" + stem.replace(/[-_]+/g, " ") + "](" + path + ")\n\n");
          say(msg, "Picture added.", true);
        } catch (err) { say(msg, err.status === undefined ? "That did not work: " + err.message + "." : why(err)); }
        busy(false);
      }

      /* saving */
      function busy(on) { [pub, dr, fresh, del].forEach(b => { b.disabled = on; }); }
      async function save(asDraft) {
        const t = title.value.trim(), body = text.value.replace(/\s+$/, "");
        if (!t && !body) return say(msg, "Write something first.");
        if (!asDraft && !t) { title.focus(); return say(msg, "Give it a title before you publish."); }
        const day = /^\d{4}-\d{2}-\d{2}$/.test(date.value) ? date.value : today();
        busy(true); say(msg, asDraft ? "Saving the draft." : "Publishing.");
        try {
          const list = await readIndex();
          const id = cur.id || uniqueId(day, t || "entry", list);
          const entry = { id: id, title: t || "Untitled", date: day, draft: asDraft, teaser: oneLine(teaser.value), words: words(body) };
          if (topic.value) entry.topic = oneLine(topic.value);
          const at = list.findIndex(p => p.id === id);
          if (at >= 0) list[at] = entry; else list.unshift(entry);      // a new entry goes above older ones of the same day
          sortPosts(list);
          await store.commit((asDraft ? "Draft: " : "Publish: ") + entry.title, [
            { path: "content/posts/" + id + ".md", content: B.joinPost({ title: oneLine(entry.title), date: day, draft: asDraft, teaser: entry.teaser, topic: entry.topic || "" }, body) }
          ]);
          posts = list; cur = { id: id, wasDraft: asDraft }; dirty = false; forget();
          await B.reload();
          drawGarden(asDraft ? null : day); drawEntries(); buttons();
          say(msg, asDraft ? (store.demo ? "Saved as a draft in the demo." : "Saved as a draft.") : store.demo ? "Published in the demo. Reload the page and it is gone." : "Published. The site shows it in a minute or two.", true);
          if (!asDraft) B.say("posted");
        } catch (e) { say(msg, why(e)); }
        busy(false);
      }
      async function remove(id, where) {
        busy(true); say(where, "Deleting.");
        try {
          const list = await readIndex(), gone = list.find(p => p.id === id), rest = list.filter(p => p.id !== id);
          await store.commit("Delete: " + (gone ? gone.title : id), [
            { path: "content/posts/" + id + ".md", content: null }
          ]);
          posts = rest;
          if (cur.id === id) { fill({}); forget(); show("list"); }
          await B.reload(); drawGarden(); drawEntries();
          say(editBox.hidden ? lmsg : msg, "Deleted.", true);
        } catch (e) { say(where, why(e)); }
        busy(false);
      }
      async function open(id, from) {
        const go = async () => {
          const p = posts.find(q => q.id === id); if (!p) return;
          say(msg, "Opening.");
          try {
            const got = B.splitPost(await store.read("content/posts/" + id + ".md"));
            fill({ id: id, title: p.title, date: p.date, text: got.body.replace(/\s+$/, ""), teaser: p.teaser, topic: p.topic, draft: p.draft });
            forget(); msg.textContent = ""; show("edit");
            title.scrollIntoView({ block: "center", behavior: B.REDUCED ? "auto" : "smooth" }); text.focus({ preventScroll: true });
          } catch (e) { say(msg, why(e)); }
        };
        if (dirty && from && from.matches(".plot")) say(msg, "The text here is not saved yet. Save it, or start a new entry, then open that day.");
        else if (dirty && from) twice(from, "Open it and lose the unsaved text?", go);
        else go();
      }
      pub.addEventListener("click", () => save(false));
      dr.addEventListener("click", () => save(true));
      fresh.addEventListener("click", () => { const go = () => { fill({}); forget(); msg.textContent = ""; title.focus(); }; if (dirty) twice(fresh, "Start over and lose the unsaved text?", go); else go(); });
      del.addEventListener("click", () => twice(del, "Really delete this entry?", () => remove(cur.id, msg)));

      /* writing help: the "/" menu, lists that carry on, pictures pasted or dropped in */
      const pen = smart(text, { picture: () => $("#c-file", panel).click(), addPicture: addPicture, note: bringIn });
      /* three views of the entry, and a focus view with nothing but the text */
      const composer = $(".composer", panel), views = $(".c-views", panel), focusBtn = $("#c-focus", panel);
      function view(v, keepIt) {
        composer.dataset.view = v; $$("button", views).forEach(b => b.setAttribute("aria-pressed", b.dataset.view === v ? "true" : "false"));
        if (keepIt) { try { localStorage.setItem("desk-view", v); } catch (e) { /* storage is optional */ } }
        grow(text); grow(title);
      }
      views.addEventListener("click", e => { const b = e.target.closest("button[data-view]"); if (b) view(b.dataset.view, true); });
      let first = "both"; try { first = localStorage.getItem("desk-view") || "both"; } catch (e) { /* storage is optional */ }
      if (["write", "both", "read"].indexOf(first) < 0) first = "both";
      if (first === "both" && window.matchMedia && matchMedia("(max-width:1020px)").matches) first = "write";          // a narrow screen has no room for two columns
      view(first);
      const focusOn = () => document.documentElement.classList.contains("desk-focus");
      function focus(on) {
        document.documentElement.classList.toggle("desk-focus", on); focusBtn.textContent = on ? "Leave focus" : "Focus"; focusBtn.setAttribute("aria-pressed", on ? "true" : "false");
        grow(text); grow(title); if (on) { window.scrollTo(0, 0); (title.value ? text : title).focus(); }
      }
      focusBtn.addEventListener("click", () => focus(!focusOn()));
      document.addEventListener("keydown", e => { if (e.key === "Escape" && focusOn()) focus(false); });
      /* a note from somewhere else comes in, and an entry goes out as a note */
      function bringIn(file) {
        const go = () => {
          const fr = new FileReader();
          fr.onerror = () => say(msg, "That file could not be read.");
          fr.onload = () => {
            const n = noteIn(file.name, fr.result);
            fill({ title: n.title, date: n.date || today(), text: n.text, teaser: n.teaser, topic: n.topic, draft: true });
            dirty = true; keep(); if (composer.dataset.view === "read") view("write");
            say(msg, "Brought in as a new entry. Read it through, then publish." + (n.pics.length ? " It names " + n.pics.length + (n.pics.length === 1 ? " picture" : " pictures") + ". Add them with Picture, where the marked lines are." : ""), true);
            title.scrollIntoView({ block: "center" });
          };
          fr.readAsText(file);
        };
        if (dirty) twice($("#c-import", panel), "Bring it in and lose the unsaved text?", go); else go();
      }
      $("#c-import", panel).addEventListener("click", () => $("#c-note", panel).click());
      $("#c-note", panel).addEventListener("change", e => { const f = e.target.files[0]; e.target.value = ""; if (f) bringIn(f); });
      $("#c-export", panel).addEventListener("click", () => {
        if (!title.value.trim() && !text.value.trim()) return say(msg, "Write something first.");
        const day = /^\d{4}-\d{2}-\d{2}$/.test(date.value) ? date.value : today();
        const note = B.joinPost({ title: oneLine(title.value), date: day, teaser: oneLine(teaser.value), topic: oneLine(topic.value) }, text.value);
        const a = el("a"); a.href = URL.createObjectURL(new Blob([note], { type: "text/markdown" })); a.download = day + "-" + slug(title.value || "entry") + ".md";
        a.hidden = true; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
        say(msg, B.preview ? "Saved as a note. If no file came down, this preview blocked it. On the real site it works." : "Saved as a note on this device.", true);
      });
      /* finding an entry in a long list */
      const find = el("input"); find.type = "search"; find.id = "e-find"; find.placeholder = "Find a post"; find.setAttribute("aria-label", "Find a post"); entries.insertAdjacentElement("beforebegin", find);
      function sift() { const q = find.value.trim().toLowerCase(); $$(".e-list li", entries).forEach(li => { li.hidden = !!q && $(".t", li).textContent.toLowerCase().indexOf(q) < 0; }); find.hidden = posts.length < 7 && !q; }
      find.addEventListener("input", sift);

      /* the list of posts, or one post being written: one of the two shows */
      const listBox = $("#p-list", panel), editBox = $("#p-edit", panel), lmsg = $("#p-msg", panel), act = $("#act-diary", root);
      function show(m) {
        if (m !== "edit" && focusOn()) focus(false);
        listBox.hidden = m !== "list"; editBox.hidden = m !== "edit"; root.dataset.edit = m === "edit" ? "1" : "";
        if (m === "edit") { grow(text); grow(title); } else lmsg.textContent = "";
      }
      act.innerHTML = '<button class="primary" type="button" id="p-new">New post</button>';
      $("#p-new", act).addEventListener("click", () => {
        if (!dirty) { fill({}); forget(); msg.textContent = ""; } else say(msg, "This is the text you had not saved. Save it, or start over.");
        show("edit"); window.scrollTo(0, 0); (title.value ? text : title).focus();
      });
      $("#p-back", panel).addEventListener("click", () => { show("list"); window.scrollTo(0, 0); });

      /* the list of entries */
      function drawEntries() {
        const row = p => '<li><span class="e-main"><button class="e-open t" type="button" data-open="' + B.attr(p.id) + '">' + esc(p.title) + "</button>" + (p.teaser || p.topic ? '<span class="e-teaser">' + esc([p.topic, p.teaser].filter(Boolean).join(". ")) + "</span>" : "") + '</span>' + (p.draft ? '<span class="e-state draft">Draft</span>' : "<span></span>") + '<span class="when">' + (p.date ? B.niceDate(p.date) : "No date") + '</span><span class="e-do"><button class="linkish" type="button" data-del="' + B.attr(p.id) + '">Delete</button></span></li>';
        const d = posts.filter(p => p.draft), live = posts.filter(p => !p.draft);
        entries.innerHTML = posts.length ? '<ul class="e-list">' + d.map(row).join("") + live.map(row).join("") + "</ul>" : '<p class="p-empty">No posts yet. New post starts the first one.</p>';
        sift();
      }
      entries.addEventListener("click", e => {
        const o = e.target.closest("button[data-open]"), x = e.target.closest("button[data-del]");
        if (o) open(o.dataset.open, o);
        if (x) twice(x, "Really delete?", () => remove(x.dataset.del, lmsg));
      });

      /* start */
      posts = sortPosts((B.site().posts || []).slice());
      fill({});
      try {
        const left = JSON.parse(localStorage.getItem(UNSAVED) || "null");
        if (left && (left.title || left.text)) { fill({ id: left.id, title: left.title, date: left.date, text: left.text, teaser: left.teaser, topic: left.topic, draft: left.wasDraft }); dirty = true; say(msg, "This is the text you had not saved."); }
      } catch (e) { /* storage is optional */ }
      drawGarden(); drawEntries(); show(dirty ? "edit" : "list");
      readIndex().then(list => { posts = list; drawGarden(); drawEntries(); })
        .catch(e => { drawStatus(why(e)); posts = sortPosts((B.site().posts || []).slice()); drawGarden(); drawEntries(); });
    }

    openTab("diary");
  };
  B.deskTools = { build: build, FORMS: FORMS };
}
