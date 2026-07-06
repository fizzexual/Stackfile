import type { Metadata } from "next";
import Link from "next/link";
import { Folder as FolderIcon, Search } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { searchItems } from "@/lib/files/queries";
import { formatBytes, formatRelativeTime } from "@/lib/files/format";
import { iconForFile } from "@/components/files/file-icon";

export const metadata: Metadata = { title: "Search" };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  const { q = "" } = await searchParams;
  const { folders, files } = await searchItems(user.id, q);
  const total = folders.length + files.length;

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-6 py-4">
        <h1 className="text-sm font-medium text-foreground">Search</h1>
        <p className="text-xs text-dim">
          {q
            ? `${total} result${total === 1 ? "" : "s"} for “${q}”`
            : "Type a query in the search bar above"}
        </p>
      </div>
      <div className="scroll-thin min-h-0 flex-1 overflow-auto">
        {total === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <Search className="h-10 w-10 text-dim" />
            <p className="text-sm text-dim">
              {q ? "No matching files or folders" : "Nothing to show yet"}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {folders.map((f) => (
                <tr
                  key={f.id}
                  className="border-b border-border/60 hover:bg-white/[0.03]"
                >
                  <td className="px-6 py-2.5">
                    <Link
                      href={`/files?folder=${f.id}`}
                      className="flex items-center gap-3"
                    >
                      <FolderIcon className="h-5 w-5 text-brand-purple" />
                      <span className="truncate text-foreground">{f.name}</span>
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 text-right text-dim">folder</td>
                  <td className="hidden px-6 py-2.5 text-muted sm:table-cell">
                    {formatRelativeTime(f.updatedAt)}
                  </td>
                </tr>
              ))}
              {files.map((f) => {
                const { Icon, tint } = iconForFile(f.name, f.mimeType);
                return (
                  <tr
                    key={f.id}
                    className="border-b border-border/60 hover:bg-white/[0.03]"
                  >
                    <td className="px-6 py-2.5">
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
                    <td className="px-3 py-2.5 text-right text-muted">
                      {formatBytes(f.size)}
                    </td>
                    <td className="hidden px-6 py-2.5 text-muted sm:table-cell">
                      {formatRelativeTime(f.updatedAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
