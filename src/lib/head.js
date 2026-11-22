// What stands in the head of every page, and what the script in the browser is told.
import { attr } from "./html.js";

const ICON = "<link rel=\"icon\" type=\"image/svg+xml\" href=\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 11 11' shape-rendering='crispEdges'%3E%3Cpath fill='%231d1c1a' d='M5 0h1v1h-1zM5 1h1v1h-1zM2 2h7v1h-7zM2 3h2v1h-2zM5 3h1v1h-1zM7 3h2v1h-2zM2 4h7v1h-7zM4 5h3v1h-3zM1 6h1v1h-1zM3 6h5v1h-5zM9 6h1v1h-1zM1 7h1v1h-1zM3 7h5v1h-5zM9 7h1v1h-1zM3 8h5v1h-5zM3 9h1v1h-1zM7 9h1v1h-1zM2 10h2v1h-2zM7 10h2v1h-2z'/%3E%3C/svg%3E\">";

// where the font of the site comes from, together with the one for code
export const fontHref = f => "https://fonts.googleapis.com/css2?family=" + f.css + "&family=IBM+Plex+Mono:ital,wght@0,400;0,600;1,400&display=swap";

// Google and Bing answer with AI from what their normal search has read, so robots.txt cannot keep them out.
// These tags ask instead. For Google the price is that it shows no preview text under the link. Set in Settings, under Pages.
export function aiTags(SITE) {
  const k = SITE.keepOut || {};
  return (k.google ? '<meta name="googlebot" content="nosnippet">' : "") + (k.bing ? '<meta name="bingbot" content="noarchive">' : "");
}

// the description, the icon, the feed, the fonts, the look
export function headHtml(SITE, page, FONTS) {
  const f = FONTS[SITE.look.font] || FONTS.karla, about = page.description || (SITE.name + ". " + (SITE.what || ""));
  return '<meta name="description" content="' + attr(about) + '">' + (page.desk ? '<meta name="robots" content="noindex">' : "") + aiTags(SITE) + ICON +
    '<link rel="alternate" type="application/rss+xml" title="' + attr(SITE.name) + '" href="/feed.xml">' +
    '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
    (f.css ? '<link rel="stylesheet" id="site-font" href="' + attr(fontHref(f)) + '">' : "") +
    '<link rel="stylesheet" href="/site.css">';
}
// the title in the browser tab
export const tabTitle = (SITE, page) => page.home || !page.title ? (SITE.title || SITE.name) : page.title + " | " + (SITE.words.brand || SITE.name);
// the classes of the page as a whole
export const rootClass = (SITE, page) => [page.reading ? "reading" : "", page.home ? "at-home" : "", page.desk ? "in-desk" : "", SITE.look.flipped || SITE.inks[0].dark ? "neg" : ""].filter(Boolean).join(" ");
// the colours and the font, set on the page itself so it never shows in the wrong ones first
export function rootStyle(SITE, FONTS) {
  const f = FONTS[SITE.look.font] || FONTS.karla, k = SITE.inks[0];
  const v = ["--a:" + k.ink, "--b:" + (k.paper || SITE.look.paper), "--pop:" + (SITE.look.pop || "#ffe45c"), "--font:" + f.stack, "--fs:" + f.size];
  SITE.inks.filter(x => !x.dark).slice(1, 7).forEach((x, i) => v.push("--c" + (i + 1) + ":" + x.ink));          // her own named colours are the palette
  return v.join(";");
}
// runs before the page shows: a visitor who picked another ink or the dark page sees it at once
export function earlyScript(SITE) {
  return "try{var s=JSON.parse(localStorage.getItem('ink')||'null'),k=" + JSON.stringify(SITE.inks.map(x => ({ name: x.name, ink: x.ink, paper: x.paper || "" }))).replace(/</g, "\\u003c") +
    ",r=document.documentElement;if(s&&s.first===k[0].name){for(var i=0;i<k.length;i++)if(k[i].name===s.name){r.style.setProperty('--a',k[i].ink);if(k[i].paper)r.style.setProperty('--b',k[i].paper);}r.classList.toggle('neg',!!s.neg);}}catch(e){}";
}
// what the script in the browser needs to know: the colours, the clock, a few labels, where the form sends
export function clientData(SITE, extra) {
  const W = SITE.words, pick = keys => { const o = {}; keys.forEach(k => { o[k] = W[k]; }); return o; };
  let host = ""; try { host = new URL(SITE.url).hostname; } catch (e) { /* no address set: every place counts as the real one */ }
  const data = Object.assign({ name: SITE.name, host: host, inks: SITE.inks, look: SITE.look, clock: SITE.clock, robot: SITE.robot, blueLine: SITE.blueLine, contactTo: String(SITE.contactTo || "").trim(),
    words: pick(["contents", "minutes", "smaller", "larger", "copy", "copied", "contactSending", "contactSent", "contactMail", "contactFail", "contactNeed", "contactDemo", "contactSubject"]) }, extra || {});
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
// the same for one page. Settings also gets the list of posts the site was built with: its demo starts from it.
export function pageData(SITE, page, extra) {
  const posts = page && page.desk ? { posts: SITE.posts.map(p => { const e = { id: p.id, title: p.title, date: p.date, draft: !!p.draft, teaser: p.teaser || "", words: p.words || 0 }; if (p.topic) e.topic = p.topic; return e; }) } : {};
  return clientData(SITE, Object.assign(posts, extra || {}));
}
