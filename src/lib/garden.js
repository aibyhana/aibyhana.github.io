// The garden: a page where every note, post and project is a plant in a pot, and the robot of the site looks after them.
// A note starts as a shoot, gets leaves while it grows and flowers when it has settled. A post is grass, a project a cactus.
// This file only puts the page together. What the robot does is in scripts/garden.js.
import { esc, attr, niceDate } from "./html.js";
import { px } from "./pixel.js";

const NOTE = { seed: ["shoot", "A first thought"], growing: ["sprout", "A note, still growing"], settled: ["bloom", "A settled note"] };
const SIZE = 4;          // how many pixels of the screen one square of a drawing takes

// every plant there is, the oldest first, so the garden grows to the right and downwards
export function plantsOf(SITE, B) {
  const list = B.notes.map(n => { const k = NOTE[n.status] || ["sprout", "A note"]; return { draw: k[0], what: k[1], title: n.title, href: n.href, date: n.date }; })
    .concat(SITE.postings.filter(p => p.kind === "blog").map(p => ({ draw: "blades", what: "A blog post", title: p.title, href: p.href, date: p.date || "" })))
    .concat(SITE.postings.filter(p => p.kind === "research").map(p => ({ draw: "cactus", what: "A research project", title: p.title, href: p.href, date: p.date || "" })));
  return list.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.title.localeCompare(b.title)));
}

export function gardenPage(SITE, B) {
  const plants = plantsOf(SITE, B), name = SITE.words.garden || "Garden";
  const newest = plants.filter(p => p.date).slice(-1)[0];
  const count = plants.length === 1 ? "1 plant." : plants.length + " plants.";
  const line = plants.length ? count + (newest ? " The newest was planted on " + niceDate(newest.date) + "." : "") : "Nothing is planted yet.";
  const key = [["shoot", "A first thought"], ["sprout", "A note that is growing"], ["bloom", "A note that has settled"], ["blades", "A blog post"], ["cactus", "A research project"]];
  return {
    path: "/garden/", title: name, section: "garden",
    description: "Every note, post and project on this site, as a plant in a pot.",
    html: '<section id="z-list" class="gd" data-garden><h1 tabindex="-1">' + esc(name) + "</h1>" +
      '<p class="z-lede">Every note, post and project is a plant here. A note starts as a shoot and grows as I come back to it. The robot looks after them.</p>' +
      '<div class="gd-scene"><ol class="gd-shelf">' +
      plants.map(p => { const says = p.title + ". " + p.what + (p.date ? ", " + niceDate(p.date) : "") + "."; return '<li><a href="' + attr(p.href) + '" title="' + attr(says) + '" data-says="' + attr(says) + '">' + px(p.draw, SIZE) + '<span class="s-sr">' + esc(says) + "</span></a></li>"; }).join("") +
      '</ol><div class="gd-floor" id="gd-floor"><button type="button" class="gd-bot" id="gd-bot" aria-label="The robot. Click it and it says something."><span class="gd-says" id="gd-says" aria-hidden="true"></span><span id="gd-body">' + px("bot", SIZE) + "</span></button></div></div>" +
      '<p class="gd-line" id="gd-line" data-rest="' + attr(line) + '" aria-live="polite">' + esc(line) + "</p>" +
      '<ul class="gd-key">' + key.map(k => "<li>" + px(k[0], 2) + "<span>" + esc(k[1]) + "</span></li>").join("") + "</ul></section>",
  };
}
