import type { Metadata } from "next";
import { FolderOpen, HardDrive, Star, UploadCloud } from "lucide-react";
import { getServerSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Dashboard" };

const stats = [
  { label: "Files", value: "0", icon: FolderOpen },
  { label: "Storage used", value: "0 B", icon: HardDrive },
  { label: "Favorites", value: "0", icon: Star },
  { label: "Shared", value: "0", icon: UploadCloud },
];

export default async function DashboardPage() {
  const session = await getServerSession();
  const firstName = session?.user.name?.split(" ")[0] ?? "there";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Welcome, {firstName} 👋</h1>
        <p className="text-neutral-400">
          This is your Stackfile. Uploading &amp; folders arrive in the next
          phase (P2).
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
          >
            <Icon className="h-5 w-5 text-neutral-400" />
            <div className="mt-3 text-2xl font-semibold">{value}</div>
            <div className="text-sm text-neutral-400">{label}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-12 text-center">
        <UploadCloud className="h-10 w-10 text-neutral-500" />
        <p className="mt-3 text-sm font-medium text-neutral-300">
          Drag &amp; drop uploads land here
        </p>
        <p className="text-sm text-neutral-500">Coming in P2 — the Files MVP.</p>
      </div>
    </div>
  );
}
