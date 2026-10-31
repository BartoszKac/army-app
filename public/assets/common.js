// Shared helpers for gallery and admin pages.
const UNTITLED = "Wydarzenie bez tytułu";

async function loadPhotos() {
  const res = await fetch("/api/list", { cache: "no-store" });
  if (!res.ok) throw new Error(`api ${res.status}`);
  return (await res.json()).photos;
}

// Older uploads stored the name as "title".
const eventName = (p) => (p.event ?? p.title ?? "").trim();

function formatDate(value) {
  if (!value) return "";
  const m = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(value);
  if (!m) return value;
  const months = ["stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca", "lipca", "sierpnia", "września", "października", "listopada", "grudnia"];
  const monthsNom = ["Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec", "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"];
  const mi = Number(m[2]) - 1;
  return m[3] ? `${Number(m[3])} ${months[mi]} ${m[1]}` : `${monthsNom[mi]} ${m[1]}`;
}

function plural(n, one, few, many) {
  if (n === 1) return one;
  const d = n % 10, t = n % 100;
  return d >= 2 && d <= 4 && (t < 12 || t > 14) ? few : many;
}

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "text") node.textContent = v;
    else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  }
  for (const c of [].concat(children)) if (c) node.append(c);
  return node;
}
