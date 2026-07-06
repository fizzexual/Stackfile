"use server";

import { cp, mkdir, rm, stat, statfs, writeFile } from "node:fs/promises";
import { join, resolve, sep } from "node:path";
import { revalidatePath } from "next/cache";
import { env } from "@/lib/env";
import { getStoragePath, setStoragePath } from "@/lib/settings";
import { assertAdmin } from "./guard";

export type StorageConfig = {
  path: string;
  resolvedPath: string;
  isDefault: boolean;
  exists: boolean;
  freeBytes: number | null;
  totalBytes: number | null;
};

export async function getStorageConfig(): Promise<StorageConfig> {
  await assertAdmin();
  const path = await getStoragePath();
  const resolvedPath = resolve(path);

  let exists = false;
  try {
    exists = (await stat(resolvedPath)).isDirectory();
  } catch {
    /* not created yet */
  }

  let freeBytes: number | null = null;
  let totalBytes: number | null = null;
  try {
    const fss = await statfs(resolvedPath);
    freeBytes = Number(fss.bavail) * Number(fss.bsize);
    totalBytes = Number(fss.blocks) * Number(fss.bsize);
  } catch {
    /* stat unavailable */
  }

  return {
    path,
    resolvedPath,
    isDefault: path === env.STORAGE_LOCAL_PATH,
    exists,
    freeBytes,
    totalBytes,
  };
}

/**
 * Change where Stackfile stores files. Validates the target is writable and
 * (optionally) copies existing blobs across so current files keep working;
 * the old folder is left untouched as a backup.
 */
export async function updateStoragePath(
  rawPath: string,
  copyExisting: boolean,
): Promise<{ ok: true; copied: boolean }> {
  await assertAdmin();
  const input = rawPath.trim();
  if (!input) throw new Error("Storage path is required");

  const oldResolved = resolve(await getStoragePath());
  const newResolved = resolve(input);
  if (newResolved === oldResolved) return { ok: true, copied: false };

  // A nested source/destination would recurse forever during the copy.
  if (
    newResolved.startsWith(oldResolved + sep) ||
    oldResolved.startsWith(newResolved + sep)
  ) {
    throw new Error(
      "The new folder can't be inside the current storage folder (or vice versa).",
    );
  }

  // Create the destination and confirm the server can write to it.
  try {
    await mkdir(newResolved, { recursive: true });
    const probe = join(newResolved, ".stackfile-write-test");
    await writeFile(probe, "ok");
    await rm(probe, { force: true });
  } catch {
    throw new Error("That folder isn't writable by the server process.");
  }

  // Copy existing blobs so current files keep working (old folder kept as backup).
  let copied = false;
  if (copyExisting) {
    const src = await stat(oldResolved).catch(() => null);
    if (src?.isDirectory()) {
      try {
        await cp(oldResolved, newResolved, { recursive: true });
        copied = true;
      } catch {
        throw new Error("Couldn't copy existing files to the new folder.");
      }
    }
  }

  await setStoragePath(newResolved);
  revalidatePath("/admin");
  return { ok: true, copied };
}
