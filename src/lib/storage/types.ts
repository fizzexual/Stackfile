import type { Readable } from "node:stream";

export interface StoredObject {
  key: string;
  size: number;
}

/**
 * Backend-agnostic blob storage. The local-disk driver is the default;
 * an S3-compatible driver can implement the same interface later without
 * touching call sites.
 */
export interface StorageProvider {
  /** Persist a buffer or stream under `key`. Overwrites if it exists. */
  put(key: string, data: Buffer | Readable): Promise<StoredObject>;
  /** Open a readable stream for `key`. Throws if missing. */
  get(key: string): Promise<Readable>;
  /** Remove `key`. No-op if it does not exist. */
  delete(key: string): Promise<void>;
  /** Whether `key` exists. */
  exists(key: string): Promise<boolean>;
  /** Size of `key` in bytes, or null if missing. */
  size(key: string): Promise<number | null>;
}
