import { getStore } from "@netlify/blobs";
import { hasAdminAccess } from "../../db/auth.js";
import { isTrustedMutation } from "../../db/request.js";
import { imageFormat } from "../../db/validation.js";

export default async (request: Request) => {
  const url = new URL(request.url);
  try {
    if (request.method === "POST" && url.pathname === "/api/media") {
      if (!isTrustedMutation(request)) return Response.json({ error: "Permintaan tidak valid. Muat ulang halaman lalu coba lagi." }, { status: 403 });
      if (!await hasAdminAccess(request)) return Response.json({ error: "Silakan login sebagai admin kembali." }, { status: 401 });
      const bytes = new Uint8Array(await request.arrayBuffer());
      if (bytes.length > 3500000) return Response.json({ error: "Foto maksimal 3,5 MB setelah diproses. Pilih foto lebih kecil." }, { status: 413 });
      const format = imageFormat(bytes);
      if (!format) return Response.json({ error: "Gunakan foto JPG, PNG, atau WebP." }, { status: 400 });
      const key = `${crypto.randomUUID()}.${format}`;
      await getStore({ name: "cms-images", consistency: "strong" }).set(key, bytes.buffer);
      return Response.json({ url: `/api/media/${key}` }, { status: 201, headers: { "Cache-Control": "no-store" } });
    }
    if (request.method === "GET") {
      const key = url.pathname.slice("/api/media/".length);
      if (!/^[a-f0-9-]{36}\.(png|jpg|webp)$/.test(key)) return new Response("Not found", { status: 404 });
      const file = await getStore({ name: "cms-images", consistency: "strong" }).get(key, { type: "arrayBuffer" });
      if (!file) return new Response("Not found", { status: 404 });
      const format = key.split(".").pop();
      return new Response(file, { headers: { "Content-Type": format === "jpg" ? "image/jpeg" : `image/${format}`, "X-Content-Type-Options": "nosniff", "Cache-Control": "public, max-age=31536000, immutable" } });
    }
    return new Response("Method not allowed", { status: 405 });
  } catch {
    return Response.json({ error: "Foto gagal disimpan atau dimuat. Coba lagi." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
};

export const config = { path: ["/api/media", "/api/media/*"] };
