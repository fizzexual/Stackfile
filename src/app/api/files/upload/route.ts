import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import type { ReadableStream as NodeWebReadableStream } from "node:stream/web";
import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { files, folders } from "@/lib/db/schema";
import { getStorage } from "@/lib/storage";
import { getStorageUsed } from "@/lib/files/queries";
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
  const storage = getStorage();

  const nodeStream = Readable.fromWeb(
    request.body as unknown as NodeWebReadableStream,
  );

  let stored;
  try {
    stored = await storage.put(storageKey, nodeStream);
  } catch {
    return NextResponse.json(
      { error: "Failed to store file" },
      { status: 500 },
    );
  }

  if (stored.size > env.STORAGE_MAX_UPLOAD_BYTES) {
    await storage.delete(storageKey).catch(() => {});
    return NextResponse.json(
      { error: "File exceeds the maximum allowed size" },
      { status: 413 },
    );
  }

  if (user.storageQuota != null) {
    const used = await getStorageUsed(userId);
    if (used + stored.size > user.storageQuota) {
      await storage.delete(storageKey).catch(() => {});
      return NextResponse.json(
        { error: "Storage quota exceeded" },
        { status: 507 },
      );
    }
  }

  const [row] = await db
    .insert(files)
    .values({
      name: filename.slice(0, 255),
      ownerId: userId,
      folderId,
      size: stored.size,
      mimeType,
      storageKey,
    })
    .returning();

  return NextResponse.json({ file: row }, { status: 201 });
}
