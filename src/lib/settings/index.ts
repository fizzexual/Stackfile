import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { appSettings } from "@/lib/db/schema";
import { env } from "@/lib/env";

/** DB key for the configurable local storage root. */
export const STORAGE_PATH_KEY = "storage.local.path";

export async function getSetting(key: string): Promise<string | null> {
  const row = await db.query.appSettings.findFirst({
    where: eq(appSettings.key, key),
  });
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await db
    .insert(appSettings)
    .values({ key, value })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { value, updatedAt: new Date() },
    });
}

/**
 * The configured local storage root — a DB setting overrides the env default.
 * Read fresh each call (an indexed PK lookup) so a path change propagates
 * immediately across Next's separate server-action / route-handler module
 * instances; getStorage() still caches the provider by path.
 */
export async function getStoragePath(): Promise<string> {
  return (await getSetting(STORAGE_PATH_KEY)) ?? env.STORAGE_LOCAL_PATH;
}

export async function setStoragePath(path: string): Promise<void> {
  await setSetting(STORAGE_PATH_KEY, path);
}
