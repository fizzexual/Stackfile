import Link from "next/link";
import { redirect } from "next/navigation";
import { Settings } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { getStorageUsed } from "@/lib/files/queries";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Sidebar } from "@/components/app/sidebar";
import { TopbarSearch } from "@/components/app/topbar-search";
import { ToastProvider } from "@/components/ui/toast";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const storageUsed = await getStorageUsed(user.id);
  const initial = (user.name || user.email).slice(0, 1).toUpperCase();

  return (
    <ToastProvider>
    <div className="flex h-screen flex-col bg-background text-foreground">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
        <Link href="/files" className="flex items-center gap-2 font-semibold">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-sm font-black text-white">
            S
          </span>
          Stackfile
        </Link>
        <TopbarSearch />
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-muted sm:inline">
            {user.email}
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-3 text-xs font-medium text-muted">
            {initial}
          </div>
          <Link
            href="/settings"
            className="rounded-md p-2 text-muted transition hover:bg-white/5 hover:text-foreground"
            aria-label="Settings"
          >
            <Settings className="h-4 w-4" />
          </Link>
          <SignOutButton />
        </div>
      </header>
      <div className="flex min-h-0 flex-1">
        <Sidebar
          storageUsed={storageUsed}
          storageQuota={user.storageQuota}
          isAdmin={user.role === "admin"}
        />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
    </ToastProvider>
  );
}
