"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { fileTags, files, tags } from "@/lib/db/schema";

export type TagDTO = { id: string; name: string; color: string | null };

async function requireUserId(): Promise<string> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  return user.id;
}

async function ensureOwnFile(userId: string, fileId: string) {
  const f = await db.query.files.findFirst({
    where: and(eq(files.id, fileId), eq(files.ownerId, userId)),
    columns: { id: true },
  });
  if (!f) throw new Error("File not found");
}

export async function getTagsForFile(fileId: string): Promise<TagDTO[]> {
  const userId = await requireUserId();
  await ensureOwnFile(userId, fileId);
  return db
    .select({ id: tags.id, name: tags.name, color: tags.color })
    .from(fileTags)
    .innerJoin(tags, eq(tags.id, fileTags.tagId))
    .where(eq(fileTags.fileId, fileId))
    .orderBy(tags.name);
}

export async function addTagToFile(
  fileId: string,
  name: string,
): Promise<TagDTO> {
  const userId = await requireUserId();
  await ensureOwnFile(userId, fileId);
  const clean = name.trim().slice(0, 60);
  if (!clean) throw new Error("Tag name is required");

  let tag = await db.query.tags.findFirst({
    where: and(eq(tags.ownerId, userId), eq(tags.name, clean)),
  });
  if (!tag) {
    // Insert-or-ignore then re-select, so concurrent creates don't 500 on the
    // (owner, name) unique constraint.
    await db
      .insert(tags)
      .values({ name: clean, ownerId: userId })
      .onConflictDoNothing();
    tag = await db.query.tags.findFirst({
      where: and(eq(tags.ownerId, userId), eq(tags.name, clean)),
    });
  }
  if (!tag) throw new Error("Failed to create tag");

  await db
    .insert(fileTags)
    .values({ fileId, tagId: tag.id })
    .onConflictDoNothing();

  revalidatePath("/files");
  revalidatePath("/tags");
  return { id: tag.id, name: tag.name, color: tag.color };
}

export async function removeTagFromFile(fileId: string, tagId: string) {
  const userId = await requireUserId();
  await ensureOwnFile(userId, fileId);
  await db
    .delete(fileTags)
    .where(and(eq(fileTags.fileId, fileId), eq(fileTags.tagId, tagId)));
  revalidatePath("/files");
  revalidatePath("/tags");
}
