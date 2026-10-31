// Default hash = SHA-256("haslo123"). Override with ADMIN_HASH env var on Netlify.
const DEFAULT_HASH = "a15f8ae07675bfb96e084bfb4f52fb2c22091061aae86e0eb76a55f4e52dd74e";

export function isAuthorized(req) {
  const expected = (process.env.ADMIN_HASH || DEFAULT_HASH).trim().toLowerCase();
  const given = (req.headers.get("x-admin-hash") || "").trim().toLowerCase();
  return given.length === 64 && given === expected;
}

export const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
