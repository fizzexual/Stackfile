import { and, desc, eq, ilike, isNotNull, isNull, sql, sum } from "drizzle-orm";
import { db } from "@/lib/db";
import { fileVersions, files, folders } from "@/lib/db/schema";

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

/** Total bytes stored by a user — current files + their versions (excludes trash). */
export async function getStorageUsed(userId: string): Promise<number> {
  const [current] = await db
    .select({ total: sum(files.size) })
    .from(files)
    .where(and(eq(files.ownerId, userId), isNull(files.deletedAt)));
  const [versions] = await db
    .select({ total: sum(fileVersions.size) })
    .from(fileVersions)
    .innerJoin(files, eq(files.id, fileVersions.fileId))
    .where(and(eq(files.ownerId, userId), isNull(files.deletedAt)));
  return Number(current?.total ?? 0) + Number(versions?.total ?? 0);
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

/** All of a user's images, newest first — EXIF date-taken, else upload date. */
export async function listImages(userId: string): Promise<FileRow[]> {
  return db.query.files.findMany({
    where: and(
      eq(files.ownerId, userId),
      isNull(files.deletedAt),
      ilike(files.mimeType, "image/%"),
    ),
    orderBy: [desc(sql`coalesce(${files.takenAt}, ${files.createdAt})`)],
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
  // Only show top-level trashed items (hide children of a trashed folder).
  const trashedFolderIds = new Set(trashedFolders.map((f) => f.id));
  return {
    folders: trashedFolders.filter(
      (f) => !f.parentId || !trashedFolderIds.has(f.parentId),
    ),
    files: trashedFiles.filter(
      (f) => !f.folderId || !trashedFolderIds.has(f.folderId),
    ),
  };
}

/** Search a user's (non-trashed) files + folders by name, case-insensitive. */
export async function searchItems(userId: string, query: string) {
  const q = query.trim();
  if (!q) return { folders: [], files: [] };
  const like = `%${q}%`;
  const folderRows = await db.query.folders.findMany({
    where: and(
      eq(folders.ownerId, userId),
      isNull(folders.deletedAt),
      ilike(folders.name, like),
    ),
    orderBy: (f, { asc }) => [asc(f.name)],
    limit: 50,
  });
  const fileRows = await db.query.files.findMany({
    where: and(
      eq(files.ownerId, userId),
      isNull(files.deletedAt),
      ilike(files.name, like),
    ),
    orderBy: (f, { asc }) => [asc(f.name)],
    limit: 100,
  });
  return { folders: folderRows, files: fileRows };
}
