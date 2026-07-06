import { env } from "@/lib/env";
import { getStoragePath } from "@/lib/settings";
import { LocalDiskStorage } from "./local";
import type { StorageProvider } from "./types";

// Cache the provider, rebuilding only when the configured path changes.
let cache: { path: string; provider: StorageProvider } | null = null;

/** Construct the configured storage backend (path is admin-configurable). */
export async function getStorage(): Promise<StorageProvider> {
  const path = await getStoragePath();
  if (cache && cache.path === path) return cache.provider;

  let provider: StorageProvider;
  switch (env.STORAGE_DRIVER) {
    case "local":
      provider = new LocalDiskStorage(path);
      break;
    default:
      throw new Error(`Unknown STORAGE_DRIVER: ${env.STORAGE_DRIVER}`);
  }
  cache = { path, provider };
  return provider;
}

export type { StorageProvider, StoredObject } from "./types";
