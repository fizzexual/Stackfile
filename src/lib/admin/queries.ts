import { count, isNull, sum } from "drizzle-orm";
import { db } from "@/lib/db";
import { files, users } from "@/lib/db/schema";

export type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  storageQuota: number | null;
  storageUsed: number;
  fileCount: number;
  createdAt: string;
};

/** All users with their (non-trashed) storage usage + file counts. */
export async function listUsersWithUsage(): Promise<AdminUserRow[]> {
  const userRows = await db.query.users.findMany({
    orderBy: (u, { asc }) => [asc(u.createdAt)],
  });

  const usage = await db
    .select({
      ownerId: files.ownerId,
      used: sum(files.size),
      cnt: count(files.id),
    })
    .from(files)
    .where(isNull(files.deletedAt))
    .groupBy(files.ownerId);

  const byOwner = new Map(
    usage.map((u) => [
      u.ownerId,
      { used: Number(u.used ?? 0), cnt: Number(u.cnt) },
    ]),
  );

  return userRows.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    storageQuota: u.storageQuota,
    storageUsed: byOwner.get(u.id)?.used ?? 0,
    fileCount: byOwner.get(u.id)?.cnt ?? 0,
    createdAt: u.createdAt.toISOString(),
  }));
}

export async function getInstanceStats() {
  const totalUsers = await db.$count(users);
  const [agg] = await db
    .select({ used: sum(files.size), cnt: count(files.id) })
    .from(files)
    .where(isNull(files.deletedAt));
  return {
    totalUsers,
    totalStorage: Number(agg?.used ?? 0),
    totalFiles: Number(agg?.cnt ?? 0),
  };
}
