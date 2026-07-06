import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { activityLogs } from "@/lib/db/schema";

export async function listActivity(userId: string, limit = 100) {
  return db.query.activityLogs.findMany({
    where: eq(activityLogs.userId, userId),
    orderBy: (a, { desc }) => [desc(a.createdAt)],
    limit,
  });
}
