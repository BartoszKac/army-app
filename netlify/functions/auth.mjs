import { isAuthorized, json } from "../lib/auth.mjs";

export default async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  return isAuthorized(req) ? json({ ok: true }) : json({ ok: false }, 401);
};

export const config = { path: "/api/auth" };
