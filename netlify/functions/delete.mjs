import { getStore } from "@netlify/blobs";
import { isAuthorized, json } from "../lib/auth.mjs";

export default async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!isAuthorized(req)) return json({ error: "Brak dostępu" }, 401);

  const { id } = await req.json().catch(() => ({}));
  if (!id || typeof id !== "string") return json({ error: "Brak id" }, 400);

  await getStore("photos").delete(id);
  return json({ ok: true });
};

export const config = { path: "/api/delete" };
