import { getStore } from "@netlify/blobs";
import { json } from "../lib/auth.mjs";

export default async () => {
  const store = getStore("photos");
  const { blobs } = await store.list();
  const photos = await Promise.all(
    blobs.map(async ({ key }) => {
      const meta = await store.getMetadata(key);
      return { id: key, src: `/api/image/${key}`, ...(meta?.metadata || {}) };
    })
  );
  photos.sort((a, b) => (b.created || 0) - (a.created || 0));
  return json({ photos });
};

export const config = { path: "/api/list" };
