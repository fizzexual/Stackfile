"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getServerSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { files, folders } from "@/lib/db/schema";
import { getStorage } from "@/lib/storage";
import { logActivity } from "@/lib/activity/log";
import { versionStorageKeys } from "./versions";

type Kind = "file" | "folder";

async function requireUserId(): Promise<string> {
  const session = await getServerSession();
  if (!session) throw new Error("Unauthorized");
  return session.user.id;
}

function revalidate() {
  revalidatePath("/files");
  revalidatePath("/trash");
  revalidatePath("/activity");
}

/** A folder id plus every descendant folder id (for cascade operations). */
async function descendantFolderIds(
  userId: string,
  rootId: string,
): Promise<string[]> {
  const ids: string[] = [rootId];
  const stack: string[] = [rootId];
  while (stack.length > 0) {
    const current = stack.pop() as string;
    const kids = await db.query.folders.findMany({
      where: and(eq(folders.parentId, current), eq(folders.ownerId, userId)),
      columns: { id: true },
    });
    for (const k of kids) {
      ids.push(k.id);
      stack.push(k.id);
    }
  }
  return ids;
}

export async function createFolder(name: string, parentId: string | null) {
  const userId = await requireUserId();
  const clean = name.trim().slice(0, 255);
  if (!clean) throw new Error("Folder name is required");
  await db.insert(folders).values({
    name: clean,
    ownerId: userId,
    parentId: parentId ?? null,
  });
  await logActivity({
    userId,
    action: "folder.create",
    targetType: "folder",
    metadata: { name: clean },
  });
  revalidate();
}

export async function renameItem(kind: Kind, id: string, name: string) {
  const userId = await requireUserId();
  const clean = name.trim().slice(0, 255);
  if (!clean) throw new Error("Name is required");
  const table = kind === "folder" ? folders : files;
  await db
    .update(table)
    .set({ name: clean, updatedAt: new Date() })
    .where(and(eq(table.id, id), eq(table.ownerId, userId)));
  await logActivity({
    userId,
    action: `${kind}.rename`,
    targetType: kind,
    targetId: id,
    metadata: { name: clean },
  });
  revalidate();
}

export async function toggleFavorite(id: string) {
  const userId = await requireUserId();
  const file = await db.query.files.findFirst({
    where: and(eq(files.id, id), eq(files.ownerId, userId)),
    columns: { id: true, isFavorite: true, name: true },
  });
  if (!file) throw new Error("File not found");
  await db
    .update(files)
    .set({ isFavorite: !file.isFavorite })
    .where(and(eq(files.id, id), eq(files.ownerId, userId)));
  await logActivity({
    userId,
    action: file.isFavorite ? "file.unfavorite" : "file.favorite",
    targetType: "file",
    targetId: id,
    metadata: { name: file.name },
  });
  revalidate();
}

export async function trashItem(kind: Kind, id: string) {
  const userId = await requireUserId();
  const now = new Date();
  if (kind === "folder") {
    // Cascade: trash the folder and everything inside it.
    const folderIds = await descendantFolderIds(userId, id);
    await db
      .update(folders)
      .set({ deletedAt: now })
      .where(and(inArray(folders.id, folderIds), eq(folders.ownerId, userId)));
    await db
      .update(files)
      .set({ deletedAt: now })
      .where(
        and(inArray(files.folderId, folderIds), eq(files.ownerId, userId)),
      );
  } else {
    await db
      .update(files)
      .set({ deletedAt: now })
      .where(and(eq(files.id, id), eq(files.ownerId, userId)));
  }
  await logActivity({ userId, action: `${kind}.trash`, targetType: kind, targetId: id });
  revalidate();
}

export async function restoreItem(kind: Kind, id: string) {
  const userId = await requireUserId();
  if (kind === "folder") {
    const folderIds = await descendantFolderIds(userId, id);
    await db
      .update(folders)
      .set({ deletedAt: null })
      .where(and(inArray(folders.id, folderIds), eq(folders.ownerId, userId)));
    await db
      .update(files)
      .set({ deletedAt: null })
      .where(
        and(inArray(files.folderId, folderIds), eq(files.ownerId, userId)),
      );
  } else {
    await db
      .update(files)
      .set({ deletedAt: null })
      .where(and(eq(files.id, id), eq(files.ownerId, userId)));
  }
  await logActivity({
    userId,
    action: `${kind}.restore`,
    targetType: kind,
    targetId: id,
  });
  revalidate();
}

export async function deleteItemForever(kind: Kind, id: string) {
  const userId = await requireUserId();
  const storage = getStorage();

  if (kind === "file") {
    const file = await db.query.files.findFirst({
      where: and(eq(files.id, id), eq(files.ownerId, userId)),
      columns: { id: true, storageKey: true, name: true },
    });
    if (!file) throw new Error("File not found");
    const vKeys = await versionStorageKeys(id);
    await Promise.all(vKeys.map((k) => storage.delete(k).catch(() => {})));
    await storage.delete(file.storageKey).catch(() => {});
    await db.delete(files).where(eq(files.id, id));
    await logActivity({
      userId,
      action: "file.delete",
      targetType: "file",
      targetId: id,
      metadata: { name: file.name },
    });
  } else {
    const owned = await db.query.folders.findFirst({
      where: and(eq(folders.id, id), eq(folders.ownerId, userId)),
      columns: { id: true },
    });
    if (!owned) throw new Error("Folder not found");
    const keys = await collectDescendantStorageKeys(userId, id);
    await Promise.all(keys.map((k) => storage.delete(k).catch(() => {})));
    await db.delete(folders).where(eq(folders.id, id));
    await logActivity({
      userId,
      action: "folder.delete",
      targetType: "folder",
      targetId: id,
    });
  }
  revalidate();
}

/** Walk a folder subtree collecting the storage keys of every descendant file
 *  (including their versions), for blob cleanup on permanent delete. */
async function collectDescendantStorageKeys(
  userId: string,
  rootId: string,
): Promise<string[]> {
  const keys: string[] = [];
  const stack: string[] = [rootId];
  while (stack.length > 0) {
    const current = stack.pop() as string;
    const childFolders = await db.query.folders.findMany({
      where: and(eq(folders.parentId, current), eq(folders.ownerId, userId)),
      columns: { id: true },
    });
    for (const f of childFolders) stack.push(f.id);
    const childFiles = await db.query.files.findMany({
      where: and(eq(files.folderId, current), eq(files.ownerId, userId)),
      columns: { id: true, storageKey: true },
    });
    for (const f of childFiles) {
      keys.push(f.storageKey);
      keys.push(...(await versionStorageKeys(f.id)));
    }
  }
  return keys;
}
