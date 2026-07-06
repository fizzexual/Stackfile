import { and, eq, isNotNull, isNull, sum } from "drizzle-orm";
import { db } from "@/lib/db";
import { files, folders } from "@/lib/db/schema";

export type FolderRow = typeof folders.$inferSelect;
export type FileRow = typeof files.$inferSelect;

/** Direct children (folders + files) of a folder (or root when folderId is null). */
export async function listFolder(userId: string, folderId: string | null) {
  const folderRows = await db.query.folders.findMany({
    where: and(
      eq(folders.ownerId, userId),
      folderId ? eq(folders.parentId, folderId) : isNull(folders.parentId),
      isNull(folders.deletedAt),
    ),
    orderBy: (f, { asc }) => [asc(f.name)],
  });
  const fileRows = await db.query.files.findMany({
    where: and(
      eq(files.ownerId, userId),
      folderId ? eq(files.folderId, folderId) : isNull(files.folderId),
      isNull(files.deletedAt),
    ),
    orderBy: (f, { asc }) => [asc(f.name)],
  });
  return { folders: folderRows, files: fileRows };
}

/** Breadcrumb from root down to the given folder. */
export async function getBreadcrumb(userId: string, folderId: string | null) {
  const crumbs: { id: string; name: string }[] = [];
  let current: string | null = folderId;
  for (let i = 0; i < 64 && current; i++) {
    const folder: { id: string; name: string; parentId: string | null } | undefined =
      await db.query.folders.findFirst({
        where: and(eq(folders.id, current), eq(folders.ownerId, userId)),
        columns: { id: true, name: true, parentId: true },
      });
    if (!folder) break;
    crumbs.unshift({ id: folder.id, name: folder.name });
    current = folder.parentId;
  }
  return crumbs;
}

/** Total bytes stored by a user (excluding trash). */
export async function getStorageUsed(userId: string): Promise<number> {
  const [row] = await db
    .select({ total: sum(files.size) })
    .from(files)
    .where(and(eq(files.ownerId, userId), isNull(files.deletedAt)));
  return Number(row?.total ?? 0);
}

/** Favorited files. */
export async function listFavorites(userId: string) {
  return db.query.files.findMany({
    where: and(
      eq(files.ownerId, userId),
      eq(files.isFavorite, true),
      isNull(files.deletedAt),
    ),
    orderBy: (f, { asc }) => [asc(f.name)],
  });
}

/** Recently modified files. */
export async function listRecent(userId: string, limit = 50) {
  return db.query.files.findMany({
    where: and(eq(files.ownerId, userId), isNull(files.deletedAt)),
    orderBy: (f, { desc }) => [desc(f.updatedAt)],
    limit,
  });
}

/** Trashed folders + files. */
export async function listTrash(userId: string) {
  const trashedFolders = await db.query.folders.findMany({
    where: and(eq(folders.ownerId, userId), isNotNull(folders.deletedAt)),
    orderBy: (f, { desc }) => [desc(f.deletedAt)],
  });
  const trashedFiles = await db.query.files.findMany({
    where: and(eq(files.ownerId, userId), isNotNull(files.deletedAt)),
    orderBy: (f, { desc }) => [desc(f.deletedAt)],
  });
  return { folders: trashedFolders, files: trashedFiles };
}
