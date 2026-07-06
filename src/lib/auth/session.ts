import { cache } from "react";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { auth } from "./index";

/**
 * Request-deduped server-side session lookup. Safe to call from multiple
 * server components in the same render.
 */
export const getServerSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

/** Full user row (incl. role + storageQuota) for the current session, or null. */
export const getCurrentUser = cache(async () => {
  const session = await getServerSession();
  if (!session) return null;
  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });
  return user ?? null;
});
