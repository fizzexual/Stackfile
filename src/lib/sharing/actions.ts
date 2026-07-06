"use server";

import { randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getServerSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { files, shares } from "@/lib/db/schema";
import { logActivity } from "@/lib/activity/log";
import {
  hashSharePassword,
  shareCookieName,
  shareUnlockToken,
  verifySharePassword,
} from "./hash";
import {
  getShareWithFile,
  listSharesForFile,
  toShareLinkDTO,
  type ShareLinkDTO,
} from "./queries";

async function requireUserId(): Promise<string> {
  const session = await getServerSession();
  if (!session) throw new Error("Unauthorized");
  return session.user.id;
}

export async function getFileShares(fileId: string): Promise<ShareLinkDTO[]> {
  const userId = await requireUserId();
  const rows = await listSharesForFile(userId, fileId);
  return rows.map(toShareLinkDTO);
}

export async function createShareLink(
  fileId: string,
  opts: { password?: string; expiresInDays?: number },
): Promise<ShareLinkDTO> {
  const userId = await requireUserId();

  const file = await db.query.files.findFirst({
    where: and(eq(files.id, fileId), eq(files.ownerId, userId)),
    columns: { id: true },
  });
  if (!file) throw new Error("File not found");

  const token = randomBytes(18).toString("base64url");
  const password = opts.password?.trim();
  const days = opts.expiresInDays ?? 0;

  const [row] = await db
    .insert(shares)
    .values({
      ownerId: userId,
      fileId,
      type: "link",
      permission: "read",
      token,
      passwordHash: password ? hashSharePassword(password) : null,
      expiresAt: days > 0 ? new Date(Date.now() + days * 86_400_000) : null,
    })
    .returning();

  if (!row) throw new Error("Failed to create share link");
  await logActivity({
    userId,
    action: "share.create",
    targetType: "file",
    targetId: fileId,
    metadata: { hasPassword: Boolean(row.passwordHash) },
  });
  revalidatePath("/files");
  revalidatePath("/activity");
  return toShareLinkDTO(row);
}

export async function revokeShare(shareId: string): Promise<void> {
  const userId = await requireUserId();
  await db
    .delete(shares)
    .where(and(eq(shares.id, shareId), eq(shares.ownerId, userId)));
  await logActivity({
    userId,
    action: "share.revoke",
    targetType: "share",
    targetId: shareId,
  });
  revalidatePath("/files");
  revalidatePath("/activity");
}

export async function unlockShare(
  token: string,
  password: string,
): Promise<{ ok: boolean }> {
  const data = await getShareWithFile(token);
  if (!data || !data.share.passwordHash) return { ok: false };
  if (data.share.expiresAt && data.share.expiresAt < new Date()) {
    return { ok: false };
  }
  if (!verifySharePassword(password, data.share.passwordHash)) {
    return { ok: false };
  }

  const jar = await cookies();
  jar.set(shareCookieName(data.share.id), shareUnlockToken(data.share.id), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 3600,
  });
  return { ok: true };
}
