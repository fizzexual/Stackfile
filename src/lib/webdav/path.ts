import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { files, folders } from "@/lib/db/schema";

type FolderRow = typeof folders.$inferSelect;
type FileRow = typeof files.$inferSelect;

export type Resolved =
  | { type: "root" }
  | { type: "folder"; folder: FolderRow }
  | { type: "file"; file: FileRow }
  | { type: "notfound" };

export function cleanSegments(segments: string[]): string[] {
  return segments.filter((s) => s.length > 0);
}

async function findChildFolder(
  userId: string,
  parentId: string | null,
  name: string,
) {
  return db.query.folders.findFirst({
    where: and(
      eq(folders.ownerId, userId),
      parentId ? eq(folders.parentId, parentId) : isNull(folders.parentId),
      eq(folders.name, name),
      isNull(folders.deletedAt),
    ),
  });
}

/** Resolve WebDAV path segments to a root / folder / file / notfound. */
export async function resolvePath(
  userId: string,
  segments: string[],
): Promise<Resolved> {
  const parts = cleanSegments(segments);
  if (parts.length === 0) return { type: "root" };

  let parentId: string | null = null;
  for (let i = 0; i < parts.length - 1; i++) {
    const folder = await findChildFolder(userId, parentId, parts[i]!);
    if (!folder) return { type: "notfound" };
    parentId = folder.id;
  }

  const last = parts[parts.length - 1]!;
  const folder = await findChildFolder(userId, parentId, last);
  if (folder) return { type: "folder", folder };

  const file = await db.query.files.findFirst({
    where: and(
      eq(files.ownerId, userId),
      parentId ? eq(files.folderId, parentId) : isNull(files.folderId),
      eq(files.name, last),
      isNull(files.deletedAt),
    ),
  });
  if (file) return { type: "file", file };

  return { type: "notfound" };
}

/** Resolve the parent folder id + final name for a path (for PUT/MKCOL/MOVE). */
export async function resolveParent(userId: string, segments: string[]) {
  const parts = cleanSegments(segments);
  if (parts.length === 0) return null;

  let parentId: string | null = null;
  for (let i = 0; i < parts.length - 1; i++) {
    const folder = await findChildFolder(userId, parentId, parts[i]!);
    if (!folder) return null;
    parentId = folder.id;
  }
  return { parentId, name: parts[parts.length - 1]! };
}

export async function listChildren(userId: string, folderId: string | null) {
  const childFolders = await db.query.folders.findMany({
    where: and(
      eq(folders.ownerId, userId),
      folderId ? eq(folders.parentId, folderId) : isNull(folders.parentId),
      isNull(folders.deletedAt),
    ),
    orderBy: (f, { asc }) => [asc(f.name)],
  });
  const childFiles = await db.query.files.findMany({
    where: and(
      eq(files.ownerId, userId),
      folderId ? eq(files.folderId, folderId) : isNull(files.folderId),
      isNull(files.deletedAt),
    ),
    orderBy: (f, { asc }) => [asc(f.name)],
  });
  return { folders: childFolders, files: childFiles };
}

export async function collectDescendantKeys(
  userId: string,
  rootFolderId: string,
): Promise<string[]> {
  const keys: string[] = [];
  const stack: string[] = [rootFolderId];
  while (stack.length > 0) {
    const current = stack.pop() as string;
    const cf = await db.query.folders.findMany({
      where: and(eq(folders.parentId, current), eq(folders.ownerId, userId)),
      columns: { id: true },
    });
    for (const f of cf) stack.push(f.id);
    const cff = await db.query.files.findMany({
      where: and(eq(files.folderId, current), eq(files.ownerId, userId)),
      columns: { storageKey: true },
    });
    for (const f of cff) keys.push(f.storageKey);
  }
  return keys;
}
