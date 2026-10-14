import { createHash, scryptSync, timingSafeEqual } from "node:crypto";
import { getUser } from "@netlify/identity";
import { and, eq, gt } from "drizzle-orm";
import { getDatabase } from "./index.js";
import { adminSessions } from "./schema.js";
import { isAdmin } from "./validation.js";

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function sessionToken(request: Request) {
  const token = request.headers.get("cookie")?.split(";")
    .map(part => part.trim()).find(part => part.startsWith("cms_admin_session="))
    ?.slice("cms_admin_session=".length);
  return token && /^[a-f0-9]{64}$/.test(token) ? token : null;
}

export function sessionCookie(request: Request, token: string, maxAge: number) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `cms_admin_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure}`;
}

export async function hasAdminAccess(request: Request) {
  const token = sessionToken(request);
  if (token) {
    const [session] = await getDatabase().select({ tokenHash: adminSessions.tokenHash })
      .from(adminSessions).where(and(eq(adminSessions.tokenHash, hashToken(token)), gt(adminSessions.expiresAt, new Date())));
    if (session) return true;
  }
  return isAdmin(await getUser());
}

export function verifyAdminCredentials(username: unknown, password: unknown) {
  if (typeof username !== "string" || typeof password !== "string" || password.length > 256) return false;
  const expected = Buffer.from("ff1a316eb2a9bb38a502159aed5b79649c21042ed20d7151feaa9c07bb2dbeac29f1882f3de5c1e68c38e46554cd8e6ed5a5ea1a868a540deb30551a1014d208", "hex");
  const actual = scryptSync(password, "1ee8fc888c1edb84aab957a2b69b481397eafd493879460870e93660e0458a12", expected.length);
  return timingSafeEqual(actual, expected) && username.trim() === "admin";
}
