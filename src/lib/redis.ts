import Redis from "ioredis";
import { env } from "@/lib/env";

const globalForRedis = globalThis as unknown as { __redis?: Redis | null };

function createClient(): Redis | null {
  if (!env.REDIS_URL) return null;
  const client = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    lazyConnect: false,
  });
  // Swallow connection errors — callers (rate limiting) fail open if Redis is down.
  client.on("error", () => {});
  return client;
}

export const redis: Redis | null =
  globalForRedis.__redis ?? createClient();

if (env.NODE_ENV !== "production") globalForRedis.__redis = redis;
