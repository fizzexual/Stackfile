"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Clock,
  Files,
  HardDrive,
  Link2,
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
  { label: "Tags", icon: Tag },
];

export function Sidebar({ storageUsed }: { storageUsed: number }) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-surface md:flex">
      <nav className="scroll-thin flex-1 space-y-0.5 overflow-auto p-3">
        {primary.map(({ href, label, icon: Icon, enabled }) => {
          const active = pathname === href;
          return enabled ? (
            <Link
              key={label}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm",
                active
                  ? "bg-brand-purple/15 font-medium text-foreground"
                  : "text-muted hover:bg-white/5 hover:text-foreground",
              )}
            >
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
          );
        })}

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

        <div className="pt-5">
          <Link
            href="/trash"
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm",
              pathname === "/trash"
                ? "bg-brand-purple/15 font-medium text-foreground"
                : "text-muted hover:bg-white/5 hover:text-foreground",
            )}
          >
            <Trash2 className="h-4 w-4" />
            Trash
          </Link>
        </div>
      </nav>

      <div className="border-t border-border p-4">
        <div className="flex items-center gap-2 text-xs text-muted">
          <HardDrive className="h-4 w-4 text-dim" />
          <span>{formatBytes(storageUsed)} used</span>
        </div>
      </div>
    </aside>
  );
}
