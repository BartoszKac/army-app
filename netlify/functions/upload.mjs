import { getStore } from "@netlify/blobs";
import { isAuthorized, json } from "../lib/auth.mjs";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

export default async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!isAuthorized(req)) return json({ error: "Brak dostępu" }, 401);

  const form = await req.formData();
  const file = form.get("file");
  if (!file || typeof file === "string") return json({ error: "Brak pliku" }, 400);
  if (!ALLOWED.includes(file.type)) return json({ error: "Nieobsługiwany format" }, 400);
  if (file.size > MAX_BYTES) return json({ error: "Plik za duży" }, 413);

  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const metadata = {
    event: String(form.get("event") || "").trim().slice(0, 200),
    date: String(form.get("date") || "").slice(0, 40),
    description: String(form.get("description") || "").slice(0, 1000),
    type: file.type,
    created: Date.now(),
  };

  await getStore("photos").set(id, await file.arrayBuffer(), { metadata });
  return json({ ok: true, id });
};

export const config = { path: "/api/upload" };
