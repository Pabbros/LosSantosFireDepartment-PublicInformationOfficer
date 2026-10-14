import { hasAdminAccess } from "../../db/auth.js";
import { isTrustedMutation } from "../../db/request.js";
import { and, eq, sql } from "drizzle-orm";
import { getDatabase } from "../../db/index.js";
import { posts, siteSettings } from "../../db/schema.js";
import { validateSnapshot, type Post } from "../../db/validation.js";

function response(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export default async (request: Request) => {
  if (!["GET", "PUT"].includes(request.method)) return response({ error: "Metode tidak tersedia." }, 405);
  try {
    if (request.method === "PUT") {
      if (!isTrustedMutation(request)) return response({ error: "Permintaan tidak valid. Muat ulang halaman lalu coba lagi." }, 403);
      if (!await hasAdminAccess(request)) return response({ error: "Silakan login sebagai admin kembali." }, 401);
      if (!request.headers.get("content-type")?.includes("application/json")) return response({ error: "Format data tidak valid." }, 415);
      const raw = await request.text();
      if (Buffer.byteLength(raw) > 4000000) return response({ error: "Data terlalu besar. Kurangi isi postingan." }, 413);
      let body;
      try { body = validateSnapshot(JSON.parse(raw)); }
      catch (error) { return response({ error: error instanceof Error ? error.message : "Data tidak valid." }, 400); }
      const db = getDatabase();
      const saved = await db.transaction(async transaction => {
        const [settings] = await transaction.update(siteSettings)
          .set({ config: body.cfg, revision: body.revision + 1 })
          .where(and(eq(siteSettings.id, 1), eq(siteSettings.revision, body.revision)))
          .returning();
        if (!settings) return false;
        await transaction.delete(posts);
        if (body.items.length) await transaction.insert(posts).values(body.items.map(post => ({ id: post.id, data: post })));
        return true;
      });
      if (!saved) return response({ error: "Data telah berubah dari perangkat lain. Muat data terbaru sebelum menyimpan lagi." }, 409);
      return response({ ...body, revision: body.revision + 1 });
    }
    const db = getDatabase();
    const [snapshot] = await db.select({
      cfg: siteSettings.config,
      revision: siteSettings.revision,
      items: sql<Post[]>`coalesce((select jsonb_agg(data order by id) from cms_posts), '[]'::jsonb)`,
    }).from(siteSettings).where(eq(siteSettings.id, 1));
    if (!snapshot) return response({ error: "Penyimpanan belum siap. Coba lagi setelah deploy selesai." }, 503);
    return response(snapshot);
  } catch {
    return response({ error: "Penyimpanan belum bisa dihubungi. Perubahan belum tersimpan; coba lagi." }, 503);
  }
};

export const config = { path: "/api/content" };
