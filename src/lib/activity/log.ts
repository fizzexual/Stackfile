import { headers } from "next/headers";
import { db } from "@/lib/db";
import { activityLogs } from "@/lib/db/schema";

export type ActivityInput = {
  userId: string;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
};

/**
 * Best-effort audit logging — never throws, so it can't break the action
 * it records.
 */
export async function logActivity(input: ActivityInput): Promise<void> {
  try {
    let ipAddress: string | undefined;
    try {
      const h = await headers();
      ipAddress =
        h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        h.get("x-real-ip") ||
        undefined;
    } catch {
      /* headers() not available in this context */
    }
    await db.insert(activityLogs).values({
      userId: input.userId,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      metadata: input.metadata,
      ipAddress,
    });
  } catch {
    /* logging is best-effort */
  }
}
