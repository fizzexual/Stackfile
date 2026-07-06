"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { files, users } from "@/lib/db/schema";
import { getStorage } from "@/lib/storage";
import { assertAdmin } from "./guard";

export async function setUserRole(userId: string, role: "user" | "admin") {
  await assertAdmin();
  if (role === "user") {
    const admins = await db.$count(users, eq(users.role, "admin"));
    // Guard against locking everyone out of admin.
    const target = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { role: true },
    });
    if (admins <= 1 && target?.role === "admin") {
      throw new Error("Cannot remove the last admin");
    }
  }
  await db.update(users).set({ role }).where(eq(users.id, userId));
  revalidatePath("/admin");
}

export async function setUserQuota(userId: string, quotaBytes: number | null) {
  await assertAdmin();
  await db
    .update(users)
    .set({ storageQuota: quotaBytes })
    .where(eq(users.id, userId));
  revalidatePath("/admin");
}

export async function deleteUser(userId: string) {
  const admin = await assertAdmin();
  if (admin.id === userId) {
    throw new Error("You cannot delete your own account from here");
  }

  // Remove the user's blobs, then cascade-delete their DB rows.
  const owned = await db.query.files.findMany({
    where: eq(files.ownerId, userId),
    columns: { storageKey: true },
  });
  const storage = getStorage();
  await Promise.all(owned.map((f) => storage.delete(f.storageKey).catch(() => {})));
  await db.delete(users).where(eq(users.id, userId));
  revalidatePath("/admin");
}
