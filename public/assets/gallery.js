const feed = document.getElementById("feed");
const viewer = document.getElementById("viewer");
const vImg = document.getElementById("v-img");
let photos = [];
let current = 0;
let lastFocus = null;

document.getElementById("year").textContent = new Date().getFullYear();

const nr = (i) => `Nr ${String(i + 1).padStart(3, "0")}`;
const year = (d) => (/^\d{4}/.exec(d || "") || [])[0];

// Photos sharing an event name sit under one heading; untitled photos stay separate.
function groupByEvent(list) {
  const groups = [];
  const byName = new Map();
  for (const p of list) {
    const name = eventName(p);
    const key = name.toLowerCase();
    if (name && byName.has(key)) { byName.get(key).items.push(p); continue; }
    const g = { name, items: [p] };
    groups.push(g);
    if (name) byName.set(key, g);
  }
  return groups;
}

function fadeIn(img) {
  const done = () => img.classList.add("loaded");
  if (img.complete && img.naturalWidth) done();
  else { img.addEventListener("load", done, { once: true }); img.addEventListener("error", done, { once: true }); }
  return img;
}

function renderIndex(groups) {
  const list = document.getElementById("index-list");
  list.innerHTML = "";
  document.getElementById("index").classList.toggle("hidden", groups.length < 2);
  document.getElementById("index-count").textContent = `${groups.length} ${plural(groups.length, "pozycja", "pozycje", "pozycji")}`;
  groups.forEach((g, gi) => {
    const years = [...new Set(g.items.map((p) => year(p.date)).filter(Boolean))];
    const info = [`${g.items.length} zdj.`, years.join(", ")].filter(Boolean).join(" · ");
    list.append(el("li", {}, el("a", { href: `#e${gi + 1}` }, [
      el("span", { class: "no mono", text: String(gi + 1).padStart(2, "0") }),
      el("span", { class: g.name ? "name" : "name untitled", text: g.name || UNTITLED }),
      el("span", { class: "info mono", text: info }),
    ])));
  });
}

function render() {
  feed.innerHTML = "";
  const groups = groupByEvent(photos);
  photos = groups.flatMap((g) => g.items); // viewer order follows page order

  const n = photos.length;
  renderIndex(groups);

  if (!n) {
    feed.append(el("p", { class: "empty", text: "Nie dodano jeszcze żadnych zdjęć." }));
    return;
  }

  let index = 0;
  groups.forEach((g, gi) => {
    const dates = [...new Set(g.items.map((p) => formatDate(p.date)).filter(Boolean))];
    const section = el("section", { class: "event", id: `e${gi + 1}`, "aria-label": g.name || UNTITLED }, [
      el("header", { class: "event-head" }, [
        el("span", { class: "event-no mono", text: String(gi + 1).padStart(2, "0") }),
        el("h2", { class: g.name ? "display" : "display untitled", text: g.name || UNTITLED }),
        el("span", { class: "event-date mono", text: dates.length === 1 ? dates[0] : `${g.items.length} zdj.` }),
      ]),
    ]);
    for (const p of g.items) {
      const i = index++;
      const img = fadeIn(el("img", { src: p.src, alt: p.description || g.name || UNTITLED, loading: i < 2 ? "eager" : "lazy", decoding: "async" }));
      section.append(
        el("figure", { class: "shot reveal" }, [
          el("button", { class: "shot-btn", type: "button", "aria-label": `Powiększ zdjęcie, ${nr(i)}`, onclick: () => open(i) }, [
            el("span", { class: "shot-frame" }, img),
            el("span", { class: "zoom mono", text: "Powiększ" }),
          ]),
          el("figcaption", {}, [
            el("span", { class: "nr mono", text: nr(i) }),
            el("span", { text: p.description || "" }),
            el("span", { class: "date mono", text: formatDate(p.date) }),
          ]),
        ])
      );
    }
    feed.append(section);
  });
  observeReveals();
}

function observeReveals() {
  const items = feed.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window)) return items.forEach((n) => n.classList.add("in"));
  const io = new IntersectionObserver((entries) => {
    for (const en of entries) if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
  }, { rootMargin: "0px 0px -8% 0px" });
  items.forEach((n) => io.observe(n));
}

function show(i) {
  current = (i + photos.length) % photos.length;
  const p = photos[current];
  const name = eventName(p);
  vImg.classList.remove("loaded");
  vImg.src = p.src;
  vImg.alt = p.description || name || UNTITLED;
  fadeIn(vImg);
  const title = document.getElementById("v-title");
  title.textContent = name || UNTITLED;
  title.classList.toggle("untitled", !name);
  document.getElementById("v-count").textContent = `${current + 1} / ${photos.length}`;
  document.getElementById("v-nr").textContent = nr(current);
  document.getElementById("v-sub").textContent = [formatDate(p.date), p.description].filter(Boolean).join(" · ");
  // Preload neighbours so arrows feel instant.
  [current - 1, current + 1].forEach((j) => { new Image().src = photos[(j + photos.length) % photos.length].src; });
}

function open(i) {
  lastFocus = document.activeElement;
  show(i);
  viewer.classList.add("open");
  viewer.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  document.getElementById("v-close").focus();
}

function close() {
  viewer.classList.remove("open");
  viewer.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  lastFocus?.focus();
}

document.getElementById("v-close").onclick = close;
document.getElementById("v-prev").onclick = () => show(current - 1);
document.getElementById("v-next").onclick = () => show(current + 1);
document.getElementById("v-stage").addEventListener("click", (e) => { if (e.target.id === "v-stage") close(); });
document.addEventListener("keydown", (e) => {
  if (!viewer.classList.contains("open")) return;
  if (e.key === "Escape") close();
  if (e.key === "ArrowLeft") show(current - 1);
  if (e.key === "ArrowRight") show(current + 1);
});

let touchX = null;
viewer.addEventListener("touchstart", (e) => { touchX = e.touches[0].clientX; }, { passive: true });
viewer.addEventListener("touchend", (e) => {
  if (touchX === null) return;
  const dx = e.changedTouches[0].clientX - touchX;
  if (Math.abs(dx) > 50) show(current + (dx < 0 ? 1 : -1));
  touchX = null;
});

loadPhotos().then((r) => {
  photos = r.photos;
  render();
});
