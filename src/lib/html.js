// Small helpers that turn text into safe HTML. Used when the site is built, and by Settings in the browser.
export const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])).replace(/'/g, "’");
export const attr = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const plain = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const niceDate = iso => { const p = iso.split("-").map(Number); return p[2] + " " + MONTHS[p[1] - 1] + " " + p[0]; };
export const stop = t => /[.?!]$/.test(t) ? t : t + ".";
export const slugOf = t => String(t).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "x";
export const safeUrl = u => { u = String(u).trim(); return /^[a-z][a-z0-9+.-]*:/i.test(u) && !/^(https?|mailto):/i.test(u) ? "#" : u; };
export const hostOf = href => { try { return new URL(href).hostname.replace(/^www\./, ""); } catch (e) { return ""; } };
export function playerOf(href) {
  const u = String(href || "");
  let m = /^https?:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:[^#]*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{11})(?![\w-])/.exec(u);
  if (m) return "https://www.youtube-nocookie.com/embed/" + m[1] + "?autoplay=1&rel=0";
  m = /^https?:\/\/(?:www\.)?vimeo\.com\/(?:video\/)?(\d+)/.exec(u);
  if (m) return "https://player.vimeo.com/video/" + m[1] + "?autoplay=1";
  return "";
}
