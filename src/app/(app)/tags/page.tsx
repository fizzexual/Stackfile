import type { Metadata } from "next";
import Link from "next/link";
import { Tag as TagIcon } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import {
  getTagById,
  listFilesByTag,
  listTagsWithCounts,
} from "@/lib/tags/queries";
import { formatBytes } from "@/lib/files/format";
import { iconForFile } from "@/components/files/file-icon";

export const metadata: Metadata = { title: "Tags" };

export default async function TagsPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  const { tag } = await searchParams;
  const allTags = await listTagsWithCounts(user.id);
  const active = tag ? await getTagById(user.id, tag) : null;
  const taggedFiles = active ? await listFilesByTag(user.id, active.id) : [];

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-6 py-4">
        <h1 className="text-sm font-medium text-foreground">Tags</h1>
        <p className="text-xs text-dim">Organize files with tags</p>
      </div>
      <div className="scroll-thin min-h-0 flex-1 overflow-auto p-6">
        <div className="mb-6 flex flex-wrap gap-2">
          {allTags.length === 0 ? (
            <p className="text-sm text-dim">
              No tags yet — add tags from a file&apos;s details panel.
            </p>
          ) : (
            allTags.map((t) => (
              <Link
                key={t.id}
                href={`/tags?tag=${t.id}`}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm ${
                  active?.id === t.id
                    ? "border-brand-magenta/50 bg-brand-purple/15 text-foreground"
                    : "border-border bg-surface-2 text-muted hover:text-foreground"
                }`}
              >
                <TagIcon className="h-3.5 w-3.5 text-brand-magenta" />
                {t.name}
                <span className="text-dim">{t.fileCount}</span>
              </Link>
            ))
          )}
        </div>

        {active &&
          (taggedFiles.length === 0 ? (
            <p className="text-sm text-dim">No files tagged “{active.name}”.</p>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {taggedFiles.map((f) => {
                  const { Icon, tint } = iconForFile(f.name, f.mimeType);
                  return (
                    <tr
                      key={f.id}
                      className="border-b border-border/60 hover:bg-white/[0.03]"
                    >
                      <td className="py-2.5 pr-3">
                        <a
                          href={`/api/files/${f.id}/download`}
                          className="flex items-center gap-3"
                        >
                          <Icon className={`h-5 w-5 ${tint}`} />
                          <span className="truncate text-foreground">
                            {f.name}
                          </span>
                        </a>
                      </td>
                      <td className="py-2.5 text-right text-muted">
                        {formatBytes(f.size)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ))}
      </div>
    </div>
  );
}
