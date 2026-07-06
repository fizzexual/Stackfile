import type { Metadata } from "next";
import {
  Activity,
  FolderPlus,
  Link2,
  type LucideIcon,
  Pencil,
  Star,
  Trash2,
  Undo2,
  UploadCloud,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { listActivity } from "@/lib/activity/queries";
import { formatRelativeTime } from "@/lib/files/format";

export const metadata: Metadata = { title: "Activity" };

const ACTIONS: Record<string, { label: string; icon: LucideIcon; tint: string }> = {
  "file.upload": { label: "Uploaded a file", icon: UploadCloud, tint: "text-positive" },
  "file.version": { label: "Uploaded a new version", icon: UploadCloud, tint: "text-positive" },
  "file.restore_version": { label: "Restored a version", icon: Undo2, tint: "text-muted" },
  "folder.create": { label: "Created a folder", icon: FolderPlus, tint: "text-brand-purple" },
  "file.rename": { label: "Renamed a file", icon: Pencil, tint: "text-muted" },
  "folder.rename": { label: "Renamed a folder", icon: Pencil, tint: "text-muted" },
  "file.favorite": { label: "Favorited a file", icon: Star, tint: "text-brand-coral" },
  "file.unfavorite": { label: "Unfavorited a file", icon: Star, tint: "text-muted" },
  "file.trash": { label: "Moved a file to trash", icon: Trash2, tint: "text-muted" },
  "folder.trash": { label: "Moved a folder to trash", icon: Trash2, tint: "text-muted" },
  "file.restore": { label: "Restored a file", icon: Undo2, tint: "text-muted" },
  "folder.restore": { label: "Restored a folder", icon: Undo2, tint: "text-muted" },
  "file.delete": { label: "Deleted a file", icon: Trash2, tint: "text-negative" },
  "folder.delete": { label: "Deleted a folder", icon: Trash2, tint: "text-negative" },
  "share.create": { label: "Created a share link", icon: Link2, tint: "text-brand-magenta" },
  "share.revoke": { label: "Revoked a share link", icon: Link2, tint: "text-muted" },
};

export default async function ActivityPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const items = await listActivity(user.id, 100);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-6 py-4">
        <h1 className="text-sm font-medium text-foreground">Activity</h1>
        <p className="text-xs text-dim">Recent actions on your account</p>
      </div>
      <div className="scroll-thin min-h-0 flex-1 overflow-auto px-4 py-4">
        {items.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <Activity className="h-10 w-10 text-dim" />
            <p className="text-sm text-dim">No activity yet</p>
          </div>
        ) : (
          <ul className="mx-auto max-w-2xl space-y-1">
            {items.map((a) => {
              const meta =
                ACTIONS[a.action] ?? {
                  label: a.action,
                  icon: Activity,
                  tint: "text-muted",
                };
              const Icon = meta.icon;
              const md = a.metadata as { name?: string } | null;
              return (
                <li
                  key={a.id}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-white/[0.02]"
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-2 ${meta.tint}`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1 truncate text-sm text-foreground">
                    {meta.label}
                    {md?.name && <span className="text-muted"> · {md.name}</span>}
                  </div>
                  <div className="shrink-0 text-xs text-dim">
                    {formatRelativeTime(a.createdAt)}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
