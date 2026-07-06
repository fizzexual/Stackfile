import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, rm, stat, writeFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { StorageProvider, StoredObject } from "./types";

/**
 * Stores blobs on the server filesystem, rooted at `baseDir`
 * (configurable via STORAGE_LOCAL_PATH — any disk/folder).
 */
export class LocalDiskStorage implements StorageProvider {
  private readonly baseDir: string;

  constructor(baseDir: string) {
    this.baseDir = resolve(baseDir);
  }

  /** Resolve a key to an absolute path, rejecting path traversal. */
  private resolveKey(key: string): string {
    const target = resolve(this.baseDir, key);
    if (target !== this.baseDir && !target.startsWith(this.baseDir + sep)) {
      throw new Error(`Invalid storage key (path traversal): ${key}`);
    }
    return target;
  }

  async put(key: string, data: Buffer | Readable): Promise<StoredObject> {
    const target = this.resolveKey(key);
    await mkdir(dirname(target), { recursive: true });

    if (Buffer.isBuffer(data)) {
      await writeFile(target, data);
    } else {
      await pipeline(data, createWriteStream(target));
    }

    const s = await stat(target);
    return { key, size: s.size };
  }

  async get(key: string): Promise<Readable> {
    return createReadStream(this.resolveKey(key));
  }

  async delete(key: string): Promise<void> {
    await rm(this.resolveKey(key), { force: true });
  }

  async exists(key: string): Promise<boolean> {
    try {
      await stat(this.resolveKey(key));
      return true;
    } catch {
      return false;
    }
  }

  async size(key: string): Promise<number | null> {
    try {
      return (await stat(this.resolveKey(key))).size;
    } catch {
      return null;
    }
  }
}
