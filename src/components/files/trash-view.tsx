"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Folder as FolderIcon, Loader2, Trash2, Undo2 } from "lucide-react";
import { iconForFile } from "./file-icon";
import { formatBytes, formatRelativeTime } from "@/lib/files/format";
import { deleteItemForever, restoreItem } from "@/lib/files/actions";
import { cn } from "@/lib/utils";
import type { FileRow, FolderRow } from "@/lib/files/queries";

export function TrashView({
  folders,
  files,
}: {
  folders: FolderRow[];
  files: FileRow[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const isEmpty = folders.length === 0 && files.length === 0;

  const run = async (fn: () => Promise<void>) => {
    setPending(true);
    try {
      await fn();
      router.refresh();
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <h1 className="text-sm font-medium text-foreground">Trash</h1>
        {pending && <Loader2 className="h-4 w-4 animate-spin text-dim" />}
      </div>
      <div className="scroll-thin min-h-0 flex-1 overflow-auto">
        {isEmpty ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <Trash2 className="h-10 w-10 text-dim" />
            <p className="text-sm text-dim">Trash is empty</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-dim">
                <th className="px-6 py-2 font-medium">Name</th>
                <th className="w-28 px-3 py-2 text-right font-medium">Size</th>
                <th className="hidden w-40 px-3 py-2 font-medium sm:table-cell">
                  Deleted
                </th>
                <th className="w-28 px-6 py-2" />
              </tr>
            </thead>
            <tbody>
              {folders.map((f) => (
                <tr
                  key={f.id}
                  className="border-b border-border/60 hover:bg-white/[0.03]"
                >
                  <td className="px-6 py-2.5">
                    <div className="flex items-center gap-3">
                      <FolderIcon className="h-5 w-5 text-brand-purple" />
                      <span className="truncate text-foreground">{f.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right text-dim">—</td>
                  <td className="hidden px-3 py-2.5 text-muted sm:table-cell">
                    {f.deletedAt ? formatRelativeTime(f.deletedAt) : "—"}
                  </td>
                  <td className="px-6 py-2.5">
                    <TrashActions
                      onRestore={() => run(() => restoreItem("folder", f.id))}
                      onDelete={() =>
                        run(() => deleteItemForever("folder", f.id))
                      }
                    />
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
                      <div className="flex items-center gap-3">
                        <Icon className={cn("h-5 w-5", tint)} />
                        <span className="truncate text-foreground">
                          {f.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right text-muted">
                      {formatBytes(f.size)}
                    </td>
                    <td className="hidden px-3 py-2.5 text-muted sm:table-cell">
                      {f.deletedAt ? formatRelativeTime(f.deletedAt) : "—"}
                    </td>
                    <td className="px-6 py-2.5">
                      <TrashActions
                        onRestore={() => run(() => restoreItem("file", f.id))}
                        onDelete={() =>
                          run(() => deleteItemForever("file", f.id))
                        }
                      />
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

function TrashActions({
  onRestore,
  onDelete,
}: {
  onRestore: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center justify-end gap-1">
      <button
        onClick={onRestore}
        className="rounded-md p-1.5 text-dim hover:bg-white/10 hover:text-foreground"
        aria-label="Restore"
      >
        <Undo2 className="h-4 w-4" />
      </button>
      <button
        onClick={onDelete}
        className="rounded-md p-1.5 text-dim hover:bg-white/10 hover:text-negative"
        aria-label="Delete forever"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
