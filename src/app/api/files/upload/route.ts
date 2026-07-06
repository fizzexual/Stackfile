import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import type { ReadableStream as NodeWebReadableStream } from "node:stream/web";
import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { files, folders } from "@/lib/db/schema";
import { getStorage } from "@/lib/storage";
import { MaxSizeExceededError, byteLimit } from "@/lib/storage/limit";
import { getStorageUsed } from "@/lib/files/queries";
import { snapshotVersion } from "@/lib/files/versions";
import { logActivity } from "@/lib/activity/log";
import { sanitizeFilename } from "@/lib/validation";
import { extractImageMeta } from "@/lib/files/exif";
import type { ImageMeta } from "@/lib/files/image-meta";
import { env } from "@/lib/env";

export const runtime = "nodejs";

/**
 * Streaming upload: the raw file bytes are the request body; the filename comes
 * from the `x-filename` header and the destination folder from `?folderId=`.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = user.id;

  const { searchParams } = new URL(request.url);
  const folderId = searchParams.get("folderId") || null;
  const filename = decodeURIComponent(
    request.headers.get("x-filename") ?? "",
  ).trim();

  if (!filename) {
    return NextResponse.json(
      { error: "Missing x-filename header" },
      { status: 400 },
    );
  }
  if (!request.body) {
    return NextResponse.json({ error: "Empty request body" }, { status: 400 });
  }

  if (folderId) {
    const folder = await db.query.folders.findFirst({
      where: and(
        eq(folders.id, folderId),
        eq(folders.ownerId, userId),
        isNull(folders.deletedAt),
      ),
      columns: { id: true },
    });
    if (!folder) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }
  }

  const mimeType =
    request.headers.get("content-type") || "application/octet-stream";
  const storageKey = `${userId}/${randomUUID()}`;
  const storage = await getStorage();

  // Cap the write at min(max upload size, remaining quota) so a huge or
  // over-quota body can't fill the disk before a post-hoc check.
  const used = user.storageQuota != null ? await getStorageUsed(userId) : 0;
  const remainingQuota =
    user.storageQuota != null
      ? Math.max(0, user.storageQuota - used)
      : Number.POSITIVE_INFINITY;
  const effectiveMax = Math.min(env.STORAGE_MAX_UPLOAD_BYTES, remainingQuota);

  const declared = Number(request.headers.get("content-length") ?? "");
  if (Number.isFinite(declared) && declared > effectiveMax) {
    const overSize = declared > env.STORAGE_MAX_UPLOAD_BYTES;
    return NextResponse.json(
      {
        error: overSize
          ? "File exceeds the maximum allowed size"
          : "Storage quota exceeded",
      },
      { status: overSize ? 413 : 507 },
    );
  }

  let stored;
  try {
    stored = await storage.put(
      storageKey,
      Readable.fromWeb(request.body as unknown as NodeWebReadableStream).pipe(
        byteLimit(effectiveMax),
      ),
    );
  } catch (e) {
    await storage.delete(storageKey).catch(() => {});
    if (e instanceof MaxSizeExceededError) {
      return NextResponse.json(
        { error: "File exceeds the maximum allowed size or storage quota" },
        { status: 413 },
      );
    }
    return NextResponse.json({ error: "Failed to store file" }, { status: 500 });
  }

  // Extract image dimensions + EXIF for the Photos timeline (best-effort).
  let takenAt: Date | null = null;
  let metadata: ImageMeta | null = null;
  if (mimeType.startsWith("image/")) {
    try {
      const chunks: Buffer[] = [];
      for await (const c of await storage.get(storageKey)) {
        chunks.push(c as Buffer);
      }
      metadata = await extractImageMeta(Buffer.concat(chunks));
      if (metadata?.takenAt) takenAt = new Date(metadata.takenAt);
    } catch {
      /* metadata is best-effort */
    }
  }

  const cleanName = sanitizeFilename(filename);
  const existing = await db.query.files.findFirst({
    where: and(
      eq(files.ownerId, userId),
      folderId ? eq(files.folderId, folderId) : isNull(files.folderId),
      eq(files.name, cleanName),
      isNull(files.deletedAt),
    ),
  });

  let row: typeof files.$inferSelect | undefined;
  if (existing) {
    // Re-upload of a same-named file → snapshot the old blob as a version.
    await snapshotVersion(existing, userId);
    [row] = await db
      .update(files)
      .set({
        storageKey,
        size: stored.size,
        mimeType,
        takenAt,
        metadata,
        updatedAt: new Date(),
      })
      .where(eq(files.id, existing.id))
      .returning();
  } else {
    [row] = await db
      .insert(files)
      .values({
        name: cleanName,
        ownerId: userId,
        folderId,
        size: stored.size,
        mimeType,
        storageKey,
        takenAt,
        metadata,
      })
      .returning();
  }

  await logActivity({
    userId,
    action: existing ? "file.version" : "file.upload",
    targetType: "file",
    targetId: row?.id,
    metadata: { name: cleanName, size: stored.size },
  });

  return NextResponse.json({ file: row }, { status: 201 });
}
