"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Clock,
  Files,
  HardDrive,
  Link2,
  ShieldCheck,
  Star,
  Tag,
  Trash2,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatBytes } from "@/lib/files/format";

const primary = [
  { href: "/files", label: "All files", icon: Files, enabled: true },
  { href: "/favorites", label: "Favorites", icon: Star, enabled: false },
  { href: "/recent", label: "Recent", icon: Clock, enabled: false },
];

const shares = [
  { label: "Shared with you", icon: Users },
  { label: "Shared by link", icon: Link2 },
];

export function Sidebar({
  storageUsed,
  storageQuota,
  isAdmin,
}: {
  storageUsed: number;
  storageQuota: number | null;
  isAdmin: boolean;
}) {
  const pathname = usePathname();
  const pct = storageQuota
    ? Math.min(100, Math.round((storageUsed / storageQuota) * 100))
    : 0;

  const navLink = (href: string, active: boolean) =>
    cn(
      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm",
      active
        ? "bg-brand-purple/15 font-medium text-foreground"
        : "text-muted hover:bg-white/5 hover:text-foreground",
    );

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-surface md:flex">
      <nav className="scroll-thin flex-1 space-y-0.5 overflow-auto p-3">
        {primary.map(({ href, label, icon: Icon, enabled }) =>
          enabled ? (
            <Link key={label} href={href} className={navLink(href, pathname === href)}>
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ) : (
            <div
              key={label}
              className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-dim"
            >
              <span className="flex items-center gap-3">
                <Icon className="h-4 w-4" />
                {label}
              </span>
              <span className="text-[10px] uppercase tracking-wide text-dim/60">
                soon
              </span>
            </div>
          ),
        )}

        <div className="px-3 pb-1 pt-5 text-[11px] font-medium uppercase tracking-wide text-dim">
          Shares
        </div>
        {shares.map(({ label, icon: Icon }) => (
          <div
            key={label}
            className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-dim"
          >
            <span className="flex items-center gap-3">
              <Icon className="h-4 w-4" />
              {label}
            </span>
            <span className="text-[10px] uppercase tracking-wide text-dim/60">
              soon
            </span>
          </div>
        ))}

        <div className="space-y-0.5 pt-5">
          <Link href="/tags" className={navLink("/tags", pathname === "/tags")}>
            <Tag className="h-4 w-4" />
            Tags
          </Link>
          <Link
            href="/activity"
            className={navLink("/activity", pathname === "/activity")}
          >
            <Activity className="h-4 w-4" />
            Activity
          </Link>
          <Link href="/trash" className={navLink("/trash", pathname === "/trash")}>
            <Trash2 className="h-4 w-4" />
            Trash
          </Link>
          {isAdmin && (
            <Link href="/admin" className={navLink("/admin", pathname === "/admin")}>
              <ShieldCheck className="h-4 w-4" />
              Admin
            </Link>
          )}
        </div>
      </nav>

      <div className="border-t border-border p-4">
        {storageQuota != null ? (
          <>
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-muted">
                <HardDrive className="h-3.5 w-3.5 text-dim" /> Storage
              </span>
              <span className="text-dim">
                {formatBytes(storageUsed)} / {formatBytes(storageQuota)}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-brand"
                style={{ width: `${pct}%` }}
              />
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2 text-xs text-muted">
            <HardDrive className="h-4 w-4 text-dim" />
            <span>{formatBytes(storageUsed)} used</span>
          </div>
        )}
      </div>
    </aside>
  );
}
