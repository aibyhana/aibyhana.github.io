// The RSS feed: the published posts, newest first.
const x = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[c]));
export function feedXml(SITE, origin) {
  const items = SITE.published.map(p => "  <item>\n    <title>" + x(p.title) + "</title>\n    <link>" + origin + "/blog/" + p.id + "/</link>\n    <guid>" + origin + "/blog/" + p.id + "/</guid>\n" +
    "    <pubDate>" + new Date(p.date + "T12:00:00Z").toUTCString() + "</pubDate>\n" + (p.teaser ? "    <description>" + x(p.teaser) + "</description>\n" : "") + (p.topic ? "    <category>" + x(p.topic) + "</category>\n" : "") + "  </item>").join("\n");
  return '<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0">\n<channel>\n  <title>' + x(SITE.title || SITE.name) + "</title>\n  <link>" + origin + "/</link>\n  <description>" + x(SITE.what || "") + "</description>\n" + items + "\n</channel>\n</rss>\n";
}
