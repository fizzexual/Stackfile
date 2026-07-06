"use server";

import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { hashWebdavToken } from "./auth";

/** Generate a fresh WebDAV app password, store its hash, return the plaintext once. */
export async function generateWebdavToken(): Promise<{ token: string }> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  const token = randomBytes(18).toString("base64url");
  await db
    .update(users)
    .set({ webdavToken: hashWebdavToken(token) })
    .where(eq(users.id, user.id));
  revalidatePath("/settings");
  return { token };
}
