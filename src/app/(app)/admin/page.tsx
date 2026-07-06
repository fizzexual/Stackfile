import type { Metadata } from "next";
import { Files, HardDrive, Users } from "lucide-react";
import { requireAdmin } from "@/lib/admin/guard";
import { getInstanceStats, listUsersWithUsage } from "@/lib/admin/queries";
import { getStorageConfig } from "@/lib/admin/storage";
import { formatBytes } from "@/lib/files/format";
import { UsersTable } from "@/components/admin/users-table";
import { StorageSettings } from "@/components/admin/storage-settings";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminPage() {
  const me = await requireAdmin();
  const [stats, users, storageConfig] = await Promise.all([
    getInstanceStats(),
    listUsersWithUsage(),
    getStorageConfig(),
  ]);

  const cards = [
    { label: "Users", value: String(stats.totalUsers), icon: Users },
    { label: "Files", value: String(stats.totalFiles), icon: Files },
    { label: "Storage used", value: formatBytes(stats.totalStorage), icon: HardDrive },
  ];

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-6 py-4">
        <h1 className="text-sm font-medium text-foreground">Admin</h1>
        <p className="text-xs text-dim">Instance users, storage &amp; quotas</p>
      </div>

      <div className="scroll-thin min-h-0 flex-1 overflow-auto p-6">
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          {cards.map(({ label, value, icon: Icon }) => (
            <div
              key={label}
              className="rounded-2xl border border-border bg-surface p-5"
            >
              <Icon className="h-5 w-5 text-muted" />
              <div className="mt-3 text-2xl font-semibold">{value}</div>
              <div className="text-sm text-dim">{label}</div>
            </div>
          ))}
        </div>

        <StorageSettings config={storageConfig} />

        <UsersTable users={users} currentUserId={me.id} />
      </div>
    </div>
  );
}
