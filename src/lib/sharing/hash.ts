import {
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { env } from "@/lib/env";

/** Hash a share-link password as `salt:hash` (scrypt). */
export function hashSharePassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 32).toString("hex");
  return `${salt}:${hash}`;
}

export function verifySharePassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  const actual = scryptSync(password, salt, 32);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/** Unforgeable proof (HMAC) that a password-protected share was unlocked. */
export function shareUnlockToken(shareId: string): string {
  return createHmac("sha256", env.BETTER_AUTH_SECRET)
    .update(`share-unlock:${shareId}`)
    .digest("hex");
}

export function shareCookieName(shareId: string): string {
  return `sf_share_${shareId}`;
}
