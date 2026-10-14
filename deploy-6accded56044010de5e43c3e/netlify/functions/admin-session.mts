import { randomBytes } from "node:crypto";
import { isTrustedMutation } from "../../db/request.js";
import type { Context } from "@netlify/functions";
import { eq, lt, sql } from "drizzle-orm";
import { getDatabase } from "../../db/index.js";
import { adminLoginAttempts, adminSessions } from "../../db/schema.js";
import { hasAdminAccess, hashToken, sessionCookie, sessionToken, verifyAdminCredentials } from "../../db/auth.js";

function response(data: unknown, status = 200, headers: HeadersInit = {}) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

export default async (request: Request, context: Context) => {
  if (!["GET", "POST", "DELETE"].includes(request.method)) return response({ error: "Metode tidak tersedia." }, 405);
  if (request.method !== "GET" && !isTrustedMutation(request)) {
    return response({ error: "Permintaan tidak valid. Muat ulang halaman lalu coba lagi." }, 403);
  }
  try {
    if (request.method === "GET") return response({ admin: await hasAdminAccess(request) });
    const db = getDatabase();
    if (request.method === "DELETE") {
      const token = sessionToken(request);
      if (token) await db.delete(adminSessions).where(eq(adminSessions.tokenHash, hashToken(token)));
      const headers = new Headers({ "Cache-Control": "no-store" });
      headers.append("Set-Cookie", sessionCookie(request, "", 0));
      headers.append("Set-Cookie", "nf_jwt=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0");
      return Response.json({ admin: false }, { headers });
    }
    if (!request.headers.get("content-type")?.includes("application/json")) return response({ error: "Format data tidak valid." }, 415);
    const raw = await request.text();
    if (Buffer.byteLength(raw) > 2048) return response({ error: "Data login terlalu besar." }, 413);
    let body;
    try { body = JSON.parse(raw); }
    catch { return response({ error: "Format data tidak valid." }, 400); }
    if (!body || typeof body.username !== "string" || typeof body.password !== "string") return response({ error: "Isi username dan password." }, 400);
    const now = new Date();
    await db.delete(adminSessions).where(lt(adminSessions.expiresAt, now));
    await db.delete(adminLoginAttempts).where(lt(adminLoginAttempts.expiresAt, now));
    const [attempt] = await db.insert(adminLoginAttempts).values({
      id: hashToken(context.ip || "unknown"), attempts: 1, expiresAt: new Date(now.getTime() + 15 * 60 * 1000),
    }).onConflictDoUpdate({ target: adminLoginAttempts.id, set: { attempts: sql`${adminLoginAttempts.attempts} + 1` } }).returning();
    if (attempt.attempts > 10) return response({ error: "Terlalu banyak percobaan login. Tunggu 15 menit lalu coba lagi." }, 429, { "Retry-After": String(Math.max(1, Math.ceil((attempt.expiresAt.getTime() - now.getTime()) / 1000))) });
    if (!verifyAdminCredentials(body.username, body.password)) return response({ error: "Username atau password salah." }, 401);
    const token = randomBytes(32).toString("hex");
    const maxAge = 12 * 60 * 60;
    const previousToken = sessionToken(request);
    await db.transaction(async transaction => {
      if (previousToken) await transaction.delete(adminSessions).where(eq(adminSessions.tokenHash, hashToken(previousToken)));
      await transaction.insert(adminSessions).values({ tokenHash: hashToken(token), expiresAt: new Date(now.getTime() + maxAge * 1000) });
    });
    return response({ admin: true }, 200, { "Set-Cookie": sessionCookie(request, token, maxAge) });
  } catch {
    return response({ error: "Login belum bisa dihubungi. Coba lagi setelah deploy selesai." }, 503);
  }
};

export const config = { path: "/api/admin-session" };
