import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { files, shares } from "@/lib/db/schema";

export type ShareLinkDTO = {
  id: string;
  token: string;
  url: string;
  hasPassword: boolean;
  expiresAt: string | null;
  createdAt: string;
};

type ShareRow = typeof shares.$inferSelect;

export function toShareLinkDTO(row: ShareRow): ShareLinkDTO {
  const token = row.token ?? "";
  return {
    id: row.id,
    token,
    url: `/s/${token}`,
    hasPassword: Boolean(row.passwordHash),
    expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  };
}

/** All public link shares a user created for a given file. */
export async function listSharesForFile(userId: string, fileId: string) {
  return db.query.shares.findMany({
    where: and(
      eq(shares.ownerId, userId),
      eq(shares.fileId, fileId),
      eq(shares.type, "link"),
    ),
    orderBy: (s, { desc }) => [desc(s.createdAt)],
  });
}

/** Resolve a public link token to its share + (non-deleted) file. */
export async function getShareWithFile(token: string) {
  const share = await db.query.shares.findFirst({
    where: and(eq(shares.token, token), eq(shares.type, "link")),
  });
  if (!share || !share.fileId) return null;

  const file = await db.query.files.findFirst({
    where: and(eq(files.id, share.fileId), isNull(files.deletedAt)),
  });
  if (!file) return null;

  return { share, file };
}
