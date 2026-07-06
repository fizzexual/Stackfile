import { redis } from "./redis";

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfter: number;
};

/**
 * Fixed-window rate limit backed by Redis. Fails **open** if Redis is
 * unavailable (availability over strictness for a self-hosted app).
 */
export async function rateLimit(
  key: string,
  max: number,
  windowSec: number,
): Promise<RateLimitResult> {
  if (!redis) return { allowed: true, remaining: max, retryAfter: 0 };
  try {
    const k = `rl:${key}`;
    const count = await redis.incr(k);
    if (count === 1) await redis.expire(k, windowSec);
    if (count > max) {
      const ttl = await redis.ttl(k);
      return { allowed: false, remaining: 0, retryAfter: ttl > 0 ? ttl : windowSec };
    }
    return { allowed: true, remaining: Math.max(0, max - count), retryAfter: 0 };
  } catch {
    return { allowed: true, remaining: max, retryAfter: 0 };
  }
}

/** Best-effort client IP from proxy headers. */
export function clientIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "unknown"
  );
}
