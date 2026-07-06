import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/session";
import { getStorageUsed } from "@/lib/files/queries";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Sidebar } from "@/components/app/sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();
  if (!session) redirect("/login");
  const storageUsed = await getStorageUsed(session.user.id);
  const initial = (session.user.name || session.user.email)
    .slice(0, 1)
    .toUpperCase();

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
        <Link href="/files" className="flex items-center gap-2 font-semibold">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-lg text-sm font-black text-white"
            style={{
              background: "linear-gradient(135deg,#725fe8,#ce47eb,#f57a74)",
            }}
          >
            S
          </span>
          Stackfile
        </Link>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-muted sm:inline">
            {session.user.email}
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-3 text-xs font-medium text-muted">
            {initial}
          </div>
          <SignOutButton />
        </div>
      </header>
      <div className="flex min-h-0 flex-1">
        <Sidebar storageUsed={storageUsed} />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
