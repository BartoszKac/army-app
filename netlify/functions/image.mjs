import { getStore } from "@netlify/blobs";

export default async (req, context) => {
  const store = getStore("photos");
  const result = await store.getWithMetadata(context.params.id, { type: "arrayBuffer" });
  if (!result) return new Response("Not found", { status: 404 });
  return new Response(result.data, {
    headers: {
      "content-type": result.metadata?.type || "image/jpeg",
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
};

export const config = { path: "/api/image/:id" };
