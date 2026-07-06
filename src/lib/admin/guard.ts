import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";

/** For server components/pages: redirects non-admins. Returns the admin user. */
export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/files");
  return user;
}

/** For server actions: throws instead of redirecting. */
export async function assertAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") throw new Error("Forbidden");
  return user;
}
