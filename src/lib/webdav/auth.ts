import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

/** WebDAV app-password tokens are stored as a plain sha-256 (they are already
 *  high-entropy random tokens, so a fast hash is sufficient). */
export function hashWebdavToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Authenticate a WebDAV request via `Authorization: Basic email:token`. */
export async function authenticateWebdav(authHeader: string | null) {
  if (!authHeader || !authHeader.startsWith("Basic ")) return null;

  let decoded: string;
  try {
    decoded = Buffer.from(authHeader.slice(6), "base64").toString("utf8");
  } catch {
    return null;
  }

  const idx = decoded.indexOf(":");
  if (idx < 0) return null;
  const email = decoded.slice(0, idx).trim();
  const token = decoded.slice(idx + 1);
  if (!email || !token) return null;

  const user = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (!user || !user.webdavToken) return null;
  if (hashWebdavToken(token) !== user.webdavToken) return null;

  return user;
}
