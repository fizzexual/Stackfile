import { env } from "@/lib/env";
import { LocalDiskStorage } from "./local";
import type { StorageProvider } from "./types";

let instance: StorageProvider | null = null;

/** Lazily construct the configured storage backend (singleton). */
export function getStorage(): StorageProvider {
  if (instance) return instance;

  switch (env.STORAGE_DRIVER) {
    case "local":
      instance = new LocalDiskStorage(env.STORAGE_LOCAL_PATH);
      break;
    default:
      throw new Error(`Unknown STORAGE_DRIVER: ${env.STORAGE_DRIVER}`);
  }

  return instance;
}

export type { StorageProvider, StoredObject } from "./types";
