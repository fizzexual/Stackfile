import { and, count, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { fileTags, files, tags } from "@/lib/db/schema";

export async function listTagsWithCounts(userId: string) {
  const rows = await db
    .select({
      id: tags.id,
      name: tags.name,
      color: tags.color,
      fileCount: count(files.id),
    })
    .from(tags)
    .leftJoin(fileTags, eq(fileTags.tagId, tags.id))
    .leftJoin(files, and(eq(files.id, fileTags.fileId), isNull(files.deletedAt)))
    .where(eq(tags.ownerId, userId))
    .groupBy(tags.id, tags.name, tags.color)
    .orderBy(tags.name);
  return rows.map((r) => ({ ...r, fileCount: Number(r.fileCount) }));
}

export async function getTagById(userId: string, tagId: string) {
  return db.query.tags.findFirst({
    where: and(eq(tags.id, tagId), eq(tags.ownerId, userId)),
  });
}

export async function listFilesByTag(userId: string, tagId: string) {
  const rows = await db
    .select({ file: files })
    .from(fileTags)
    .innerJoin(files, eq(files.id, fileTags.fileId))
    .where(
      and(
        eq(fileTags.tagId, tagId),
        eq(files.ownerId, userId),
        isNull(files.deletedAt),
      ),
    )
    .orderBy(files.name);
  return rows.map((r) => r.file);
}
