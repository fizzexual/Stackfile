import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/session";
import { SignOutButton } from "@/components/auth/sign-out-button";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-neutral-950/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 font-semibold"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-sm font-black text-white">
              S
            </span>
            Stackfile
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-neutral-400 sm:inline">
              {session.user.email}
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
