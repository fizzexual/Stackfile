import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { fileVersions, files } from "@/lib/db/schema";

type VersionableFile = {
  id: string;
  storageKey: string;
  size: number;
  checksum: string | null;
};

/** Snapshot a file's current blob as the next version (keeps the old blob). */
export async function snapshotVersion(
  file: VersionableFile,
  createdBy: string | null,
): Promise<void> {
  const [row] = await db
    .select({ max: sql<number>`coalesce(max(${fileVersions.versionNumber}), 0)` })
    .from(fileVersions)
    .where(eq(fileVersions.fileId, file.id));
  await db.insert(fileVersions).values({
    fileId: file.id,
    versionNumber: (row?.max ?? 0) + 1,
    storageKey: file.storageKey,
    size: file.size,
    checksum: file.checksum,
    createdBy,
  });
}

export async function listVersionsQuery(userId: string, fileId: string) {
  const file = await db.query.files.findFirst({
    where: and(eq(files.id, fileId), eq(files.ownerId, userId)),
    columns: { id: true },
  });
  if (!file) return [];
  return db.query.fileVersions.findMany({
    where: eq(fileVersions.fileId, fileId),
    orderBy: (v, { desc }) => [desc(v.versionNumber)],
  });
}

/** Storage keys of all versions of a file (for blob cleanup on delete). */
export async function versionStorageKeys(fileId: string): Promise<string[]> {
  const rows = await db.query.fileVersions.findMany({
    where: eq(fileVersions.fileId, fileId),
    columns: { storageKey: true },
  });
  return rows.map((r) => r.storageKey);
}
