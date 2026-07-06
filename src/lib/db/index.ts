import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/lib/env";
import * as schema from "./schema";

/**
 * Reuse a single postgres client across hot reloads in dev to avoid
 * exhausting connections.
 */
const globalForDb = globalThis as unknown as {
  __stackfileClient?: ReturnType<typeof postgres>;
};

const client =
  globalForDb.__stackfileClient ?? postgres(env.DATABASE_URL, { max: 10 });

if (env.NODE_ENV !== "production") {
  globalForDb.__stackfileClient = client;
}

export const db = drizzle(client, { schema });
export type DB = typeof db;

export * as schema from "./schema";
