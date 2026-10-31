// Front-end login: the SHA-256 of the password is sent as a header and verified
// by the Netlify Function against ADMIN_HASH. Not strong security, by design.
const KEY = "adminHash";
const MAX_SIDE = 2000;

const $ = (id) => document.getElementById(id);
const getHash = () => { try { return sessionStorage.getItem(KEY); } catch { return null; } };
const setHash = (h) => { try { h ? sessionStorage.setItem(KEY, h) : sessionStorage.removeItem(KEY); } catch {} };

async function sha256(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function setMsg(node, text, kind = "") {
  node.textContent = text;
  node.className = `msg ${kind}`;
}

async function checkHash(hash) {
  const res = await fetch("/api/auth", { method: "POST", headers: { "x-admin-hash": hash } });
  if (res.status !== 200 && res.status !== 401) throw new Error(`api ${res.status}`);
  return res.ok;
}

function showAdmin(on) {
  $("login-view").classList.toggle("hidden", on);
  $("admin-view").classList.toggle("hidden", !on);
  $("logout").classList.toggle("hidden", !on);
  $("status").textContent = on ? "Zalogowano" : "Wymagane logowanie";
  if (on) refreshList();
}

$("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = e.submitter;
  btn.disabled = true;
  setMsg($("login-msg"), "Sprawdzanie…");
  try {
    const hash = await sha256($("password").value);
    if (await checkHash(hash)) {
      setHash(hash);
      $("password").value = "";
      setMsg($("login-msg"), "");
      showAdmin(true);
    } else {
      setMsg($("login-msg"), "Nieprawidłowe hasło.", "error");
    }
  } catch {
    setMsg($("login-msg"), "Serwer logowania niedostępny. Strona musi działać na Netlify albo przez netlify dev.", "error");
  } finally {
    btn.disabled = false;
  }
});

$("logout").onclick = () => { setHash(null); showAdmin(false); };

// --- File picking & preview ---
let selected = null;
const drop = $("drop");
const DROP_HTML = drop.innerHTML;

function pick(file) {
  if (!file || !file.type.startsWith("image/")) {
    setMsg($("upload-msg"), "To nie jest plik graficzny.", "error");
    return;
  }
  selected = file;
  drop.innerHTML = "";
  drop.append(el("img", { src: URL.createObjectURL(file), alt: "Podgląd" }));
  setMsg($("upload-msg"), "");
}

drop.onclick = () => $("file").click();
drop.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); $("file").click(); } };
$("file").onchange = (e) => pick(e.target.files[0]);
["dragenter", "dragover"].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.add("over"); }));
["dragleave", "drop"].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.remove("over"); }));
drop.addEventListener("drop", (e) => pick(e.dataTransfer.files[0]));

// Downscale to keep uploads well under the Netlify Function body limit.
function resize(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const iw = img.naturalWidth || MAX_SIDE;
      const ih = img.naturalHeight || Math.round(MAX_SIDE * 0.75);
      const scale = Math.min(1, MAX_SIDE / Math.max(iw, ih));
      const w = Math.round(iw * scale);
      const h = Math.round(ih * scale);
      const canvas = Object.assign(document.createElement("canvas"), { width: w, height: h });
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("resize"))), "image/jpeg", 0.85);
    };
    img.onerror = () => reject(new Error("nie można odczytać pliku"));
    img.src = URL.createObjectURL(file);
  });
}

function resetForm() {
  selected = null;
  $("upload-form").reset();
  drop.innerHTML = DROP_HTML;
}

$("upload-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!selected) return setMsg($("upload-msg"), "Najpierw wybierz zdjęcie.", "error");
  const btn = $("upload-btn");
  btn.disabled = true;
  setMsg($("upload-msg"), "Wysyłanie…");
  try {
    const blob = await resize(selected);
    const form = new FormData();
    form.append("file", blob, "photo.jpg");
    form.append("event", $("event").value.trim());
    form.append("date", $("date").value.trim());
    form.append("description", $("description").value.trim());
    const res = await fetch("/api/upload", { method: "POST", headers: { "x-admin-hash": getHash() }, body: form });
    if (res.status === 401) { setHash(null); showAdmin(false); return; }
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.status);
    resetForm();
    setMsg($("upload-msg"), "Zdjęcie dodane.", "ok");
    refreshList();
  } catch (err) {
    setMsg($("upload-msg"), `Nie udało się dodać zdjęcia (${err.message}).`, "error");
  } finally {
    btn.disabled = false;
  }
});

// --- List & delete ---
async function refreshList() {
  const list = $("admin-list");
  let photos;
  try {
    photos = await loadPhotos();
  } catch {
    list.replaceChildren(el("p", { class: "notice", text: "Nie udało się pobrać listy zdjęć." }));
    return;
  }
  list.innerHTML = "";
  if (!photos.length) {
    $("admin-count").textContent = "";
    list.append(el("p", { class: "notice", text: "Nie dodano jeszcze żadnych zdjęć." }));
    return;
  }
  $("admin-count").textContent = `${photos.length} ${plural(photos.length, "zdjęcie", "zdjęcia", "zdjęć")}`;
  const names = [...new Set(photos.map(eventName).filter(Boolean))];
  $("events").replaceChildren(...names.map((n) => el("option", { value: n })));
  for (const p of photos) {
    const name = eventName(p);
    list.append(
      el("div", { class: "admin-item" }, [
        el("img", { src: p.src, alt: "", loading: "lazy", width: "120", height: "90" }),
        el("div", {}, [
          el("div", { class: name ? "name" : "name untitled", text: name || UNTITLED }),
          el("div", { class: "meta", text: [formatDate(p.date), p.description].filter(Boolean).join(" · ") }),
        ]),
        el("button", { class: "btn danger", type: "button", text: "Usuń", onclick: () => remove(p) }),
      ])
    );
  }
}

async function remove(p) {
  if (!confirm(`Usunąć to zdjęcie (${eventName(p) || UNTITLED})?`)) return;
  const res = await fetch("/api/delete", {
    method: "POST",
    headers: { "x-admin-hash": getHash(), "content-type": "application/json" },
    body: JSON.stringify({ id: p.id }),
  });
  if (res.status === 401) { setHash(null); showAdmin(false); return; }
  refreshList();
}

// Restore session on reload.
(async () => {
  const h = getHash();
  if (h && (await checkHash(h).catch(() => false))) showAdmin(true);
})();
