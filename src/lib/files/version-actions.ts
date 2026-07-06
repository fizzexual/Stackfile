"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { fileVersions, files } from "@/lib/db/schema";
import { logActivity } from "@/lib/activity/log";
import { listVersionsQuery, snapshotVersion } from "./versions";

export type VersionDTO = {
  id: string;
  versionNumber: number;
  size: number;
  createdAt: string;
};

export async function getFileVersions(fileId: string): Promise<VersionDTO[]> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  const rows = await listVersionsQuery(user.id, fileId);
  return rows.map((v) => ({
    id: v.id,
    versionNumber: v.versionNumber,
    size: v.size,
    createdAt: v.createdAt.toISOString(),
  }));
}

export async function restoreVersion(fileId: string, versionId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const file = await db.query.files.findFirst({
    where: and(eq(files.id, fileId), eq(files.ownerId, user.id)),
  });
  if (!file) throw new Error("File not found");

  const version = await db.query.fileVersions.findFirst({
    where: and(eq(fileVersions.id, versionId), eq(fileVersions.fileId, fileId)),
  });
  if (!version) throw new Error("Version not found");

  // Snapshot the current state, then point the file at the restored blob.
  await snapshotVersion(file, user.id);
  await db
    .update(files)
    .set({
      storageKey: version.storageKey,
      size: version.size,
      checksum: version.checksum,
      updatedAt: new Date(),
    })
    .where(eq(files.id, fileId));

  await logActivity({
    userId: user.id,
    action: "file.restore_version",
    targetType: "file",
    targetId: fileId,
    metadata: { name: file.name, version: version.versionNumber },
  });
  revalidatePath("/files");
  revalidatePath("/activity");
}
