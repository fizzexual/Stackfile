"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck, Trash2, User as UserIcon } from "lucide-react";
import { deleteUser, setUserQuota, setUserRole } from "@/lib/admin/actions";
import { formatBytes } from "@/lib/files/format";
import type { AdminUserRow } from "@/lib/admin/queries";
import { cn } from "@/lib/utils";

const GB = 1024 * 1024 * 1024;

export function UsersTable({
  users,
  currentUserId,
}: {
  users: AdminUserRow[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  const run = async (id: string, fn: () => Promise<void>) => {
    setBusy(id);
    try {
      await fn();
      router.refresh();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(null);
    }
  };

  const editQuota = (u: AdminUserRow) => {
    const current = u.storageQuota != null ? String(u.storageQuota / GB) : "";
    const input = window.prompt(
      `Storage quota for ${u.email} in GB (leave blank for unlimited):`,
      current,
    );
    if (input === null) return;
    const trimmed = input.trim();
    const bytes = trimmed === "" ? null : Math.round(Number(trimmed) * GB);
    if (bytes !== null && (!Number.isFinite(bytes) || bytes < 0)) {
      window.alert("Please enter a valid number of GB.");
      return;
    }
    void run(u.id, () => setUserQuota(u.id, bytes));
  };

  return (
    <div className="overflow-x-auto rounded-2xl border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-surface text-left text-xs text-dim">
            <th className="px-4 py-2.5 font-medium">User</th>
            <th className="px-4 py-2.5 font-medium">Role</th>
            <th className="px-4 py-2.5 font-medium">Usage</th>
            <th className="px-4 py-2.5 font-medium">Quota</th>
            <th className="px-4 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-b border-border/60 last:border-0">
              <td className="px-4 py-3">
                <div className="font-medium text-foreground">{u.name}</div>
                <div className="text-xs text-dim">{u.email}</div>
              </td>
              <td className="px-4 py-3">
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs",
                    u.role === "admin"
                      ? "bg-brand-purple/15 text-brand-magenta"
                      : "bg-white/5 text-muted",
                  )}
                >
                  {u.role === "admin" ? (
                    <ShieldCheck className="h-3 w-3" />
                  ) : (
                    <UserIcon className="h-3 w-3" />
                  )}
                  {u.role}
                </span>
              </td>
              <td className="px-4 py-3 text-muted">
                {formatBytes(u.storageUsed)}{" "}
                <span className="text-dim">· {u.fileCount} files</span>
              </td>
              <td className="px-4 py-3">
                <button
                  onClick={() => editQuota(u)}
                  className="text-muted hover:text-foreground hover:underline"
                >
                  {u.storageQuota != null
                    ? formatBytes(u.storageQuota)
                    : "Unlimited"}
                </button>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-1">
                  {busy === u.id && (
                    <Loader2 className="h-4 w-4 animate-spin text-dim" />
                  )}
                  <button
                    onClick={() =>
                      run(u.id, () =>
                        setUserRole(u.id, u.role === "admin" ? "user" : "admin"),
                      )
                    }
                    className="rounded-md px-2 py-1 text-xs text-muted hover:bg-white/5 hover:text-foreground"
                  >
                    {u.role === "admin" ? "Demote" : "Make admin"}
                  </button>
                  <button
                    onClick={() => {
                      if (
                        window.confirm(
                          `Delete ${u.email}? This permanently removes all their files.`,
                        )
                      ) {
                        void run(u.id, () => deleteUser(u.id));
                      }
                    }}
                    disabled={u.id === currentUserId}
                    className="rounded-md p-1.5 text-dim hover:bg-white/10 hover:text-negative disabled:opacity-30"
                    aria-label="Delete user"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
