"use client";

import { useState } from "react";
import { Download, Star } from "lucide-react";
import { iconForFile } from "./file-icon";
import { FilePreview } from "./file-preview";
import { previewKind } from "@/lib/files/preview";
import { formatBytes, formatRelativeTime } from "@/lib/files/format";
import { cn } from "@/lib/utils";
import type { FileRow } from "@/lib/files/queries";

/** Read-only flat list of files (Favorites / Recent) with click-to-preview. */
export function SimpleFileList({
  files,
  emptyLabel,
}: {
  files: FileRow[];
  emptyLabel: string;
}) {
  const [preview, setPreview] = useState<FileRow | null>(null);

  const open = (f: FileRow) => {
    if (previewKind(f.mimeType, f.name)) setPreview(f);
    else window.open(`/api/files/${f.id}/download`, "_blank", "noopener");
  };

  if (files.length === 0) {
    return <div className="p-12 text-center text-sm text-dim">{emptyLabel}</div>;
  }

  return (
    <>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-dim">
            <th className="px-6 py-2 font-medium">Name</th>
            <th className="w-28 px-3 py-2 text-right font-medium">Size</th>
            <th className="hidden w-40 px-3 py-2 font-medium sm:table-cell">
              Modified
            </th>
            <th className="w-16 px-6 py-2" />
          </tr>
        </thead>
        <tbody>
          {files.map((f) => {
            const { Icon, tint } = iconForFile(f.name, f.mimeType);
            return (
              <tr
                key={f.id}
                onDoubleClick={() => open(f)}
                className="group cursor-pointer border-b border-border/60 hover:bg-white/[0.03]"
              >
                <td className="px-6 py-2.5">
                  <button
                    onClick={() => open(f)}
                    className="flex max-w-full items-center gap-3 text-left"
                  >
                    <Icon className={cn("h-5 w-5 shrink-0", tint)} />
                    <span className="truncate font-medium text-foreground">
                      {f.name}
                    </span>
                    {f.isFavorite && (
                      <Star className="h-3.5 w-3.5 shrink-0 fill-brand-coral text-brand-coral" />
                    )}
                  </button>
                </td>
                <td className="px-3 py-2.5 text-right text-muted">
                  {formatBytes(f.size)}
                </td>
                <td className="hidden px-3 py-2.5 text-muted sm:table-cell">
                  {formatRelativeTime(f.updatedAt)}
                </td>
                <td className="px-6 py-2.5 text-right">
                  <a
                    href={`/api/files/${f.id}/download`}
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex rounded-md p-1.5 text-dim opacity-0 transition hover:bg-white/10 hover:text-foreground group-hover:opacity-100"
                    aria-label="Download"
                  >
                    <Download className="h-4 w-4" />
                  </a>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {preview && (
        <FilePreview file={preview} onClose={() => setPreview(null)} />
      )}
    </>
  );
}
