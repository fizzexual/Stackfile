"use client";

import * as React from "react";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronRight,
  Download,
  Folder as FolderIcon,
  FolderPlus,
  Grid2x2,
  House,
  List as ListIcon,
  Loader2,
  Pencil,
  Star,
  Trash2,
  Upload,
  UploadCloud,
  X,
} from "lucide-react";
import { iconForFile } from "./file-icon";
import { formatBytes, formatRelativeTime } from "@/lib/files/format";
import {
  createFolder,
  renameItem,
  toggleFavorite,
  trashItem,
} from "@/lib/files/actions";
import { cn } from "@/lib/utils";
import type { FileRow, FolderRow } from "@/lib/files/queries";

type Upload = {
  id: string;
  name: string;
  progress: number;
  status: "uploading" | "done" | "error";
};

type Dialog =
  | { mode: "new-folder" }
  | { mode: "rename"; kind: "file" | "folder"; id: string; current: string }
  | null;

export function FileManager({
  currentFolderId,
  breadcrumb,
  folders,
  files,
}: {
  currentFolderId: string | null;
  breadcrumb: { id: string; name: string }[];
  folders: FolderRow[];
  files: FileRow[];
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);

  const [view, setView] = useState<"list" | "grid">("list");
  const [isDragging, setIsDragging] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [pending, setPending] = useState(false);

  const selectedFile = files.find((f) => f.id === selectedId) ?? null;
  const isEmpty = folders.length === 0 && files.length === 0;

  /* ---------------------------- uploads ---------------------------- */

  const uploadOne = (file: File, onProgress: (pct: number) => void) =>
    new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const q = currentFolderId
        ? `?folderId=${encodeURIComponent(currentFolderId)}`
        : "";
      xhr.open("POST", `/api/files/upload${q}`);
      xhr.setRequestHeader("x-filename", encodeURIComponent(file.name));
      xhr.setRequestHeader(
        "content-type",
        file.type || "application/octet-stream",
      );
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () =>
        xhr.status >= 200 && xhr.status < 300
          ? resolve()
          : reject(new Error(`HTTP ${xhr.status}`));
      xhr.onerror = () => reject(new Error("Network error"));
      xhr.send(file);
    });

  const handleFiles = async (list: FileList | File[]) => {
    const arr = Array.from(list);
    if (arr.length === 0) return;
    for (const file of arr) {
      const id = crypto.randomUUID();
      setUploads((u) => [
        ...u,
        { id, name: file.name, progress: 0, status: "uploading" },
      ]);
      try {
        await uploadOne(file, (pct) =>
          setUploads((u) =>
            u.map((x) => (x.id === id ? { ...x, progress: pct } : x)),
          ),
        );
        setUploads((u) =>
          u.map((x) =>
            x.id === id ? { ...x, progress: 100, status: "done" } : x,
          ),
        );
      } catch {
        setUploads((u) =>
          u.map((x) => (x.id === id ? { ...x, status: "error" } : x)),
        );
      }
    }
    router.refresh();
    window.setTimeout(
      () => setUploads((u) => u.filter((x) => x.status === "uploading")),
      2800,
    );
  };

  /* ----------------------------- drag ------------------------------ */

  const onDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes("Files")) e.preventDefault();
  };
  const onDragEnter = (e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes("Files")) return;
    dragDepth.current += 1;
    setIsDragging(true);
  };
  const onDragLeave = () => {
    dragDepth.current -= 1;
    if (dragDepth.current <= 0) {
      dragDepth.current = 0;
      setIsDragging(false);
    }
  };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dragDepth.current = 0;
    setIsDragging(false);
    if (e.dataTransfer.files?.length) void handleFiles(e.dataTransfer.files);
  };

  /* ---------------------------- actions ---------------------------- */

  const run = async (fn: () => Promise<void>) => {
    setPending(true);
    try {
      await fn();
      router.refresh();
    } finally {
      setPending(false);
    }
  };

  const submitDialog = async (value: string) => {
    const name = value.trim();
    if (!name || !dialog) return;
    const current = dialog;
    setDialog(null);
    await run(async () => {
      if (current.mode === "new-folder") await createFolder(name, currentFolderId);
      else await renameItem(current.kind, current.id, name);
    });
  };

  /* ---------------------------- render ----------------------------- */

  return (
    <div
      className="relative flex h-full min-h-0"
      onDragOver={onDragOver}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
          <nav className="flex min-w-0 items-center gap-1 text-sm">
            <Link
              href="/files"
              className="flex items-center gap-1.5 rounded-md px-2 py-1 text-muted hover:bg-white/5 hover:text-foreground"
            >
              <House className="h-4 w-4" />
              All files
            </Link>
            {breadcrumb.map((c, i) => (
              <span key={c.id} className="flex min-w-0 items-center gap-1">
                <ChevronRight className="h-4 w-4 shrink-0 text-dim" />
                <Link
                  href={`/files?folder=${c.id}`}
                  className={cn(
                    "truncate rounded-md px-2 py-1 hover:bg-white/5 hover:text-foreground",
                    i === breadcrumb.length - 1
                      ? "text-foreground"
                      : "text-muted",
                  )}
                >
                  {c.name}
                </Link>
              </span>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setDialog({ mode: "new-folder" })}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm font-medium text-foreground transition hover:bg-surface-3"
            >
              <FolderPlus className="h-4 w-4" />
              New folder
            </button>
            <button
              onClick={() => fileInput.current?.click()}
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white transition hover:opacity-90"
              style={{
                background:
                  "linear-gradient(to right, #725fe8, #ce47eb, #f57a74)",
              }}
            >
              <Upload className="h-4 w-4" />
              Upload
            </button>
            <div className="ml-1 flex items-center rounded-lg border border-border bg-surface-2 p-0.5">
              <button
                onClick={() => setView("list")}
                className={cn(
                  "rounded-md p-1.5",
                  view === "list" ? "bg-white/10 text-foreground" : "text-dim",
                )}
                aria-label="List view"
              >
                <ListIcon className="h-4 w-4" />
              </button>
              <button
                onClick={() => setView("grid")}
                className={cn(
                  "rounded-md p-1.5",
                  view === "grid" ? "bg-white/10 text-foreground" : "text-dim",
                )}
                aria-label="Grid view"
              >
                <Grid2x2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="scroll-thin min-h-0 flex-1 overflow-auto">
          {pending && (
            <div className="flex items-center gap-2 px-6 py-2 text-xs text-dim">
              <Loader2 className="h-3 w-3 animate-spin" /> working…
            </div>
          )}

          {isEmpty ? (
            <EmptyState onUpload={() => fileInput.current?.click()} />
          ) : view === "list" ? (
            <ListView
              folders={folders}
              files={files}
              selectedId={selectedId}
              onSelectFile={setSelectedId}
              onFavorite={(id) => run(() => toggleFavorite(id))}
              onRename={(kind, id, current) =>
                setDialog({ mode: "rename", kind, id, current })
              }
              onTrash={(kind, id) => run(() => trashItem(kind, id))}
            />
          ) : (
            <GridView
              folders={folders}
              files={files}
              selectedId={selectedId}
              onSelectFile={setSelectedId}
            />
          )}
        </div>
      </div>

      {/* Details panel */}
      {selectedFile && (
        <DetailsPanel
          file={selectedFile}
          onClose={() => setSelectedId(null)}
          onFavorite={() => run(() => toggleFavorite(selectedFile.id))}
          onRename={() =>
            setDialog({
              mode: "rename",
              kind: "file",
              id: selectedFile.id,
              current: selectedFile.name,
            })
          }
          onTrash={() => {
            setSelectedId(null);
            void run(() => trashItem("file", selectedFile.id));
          }}
        />
      )}

      {/* Drag overlay */}
      {isDragging && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-brand-purple/10 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-brand-magenta/60 bg-surface/80 px-12 py-10">
            <UploadCloud className="h-10 w-10 text-brand-magenta" />
            <p className="text-sm font-medium text-foreground">
              Drop files to upload
            </p>
          </div>
        </div>
      )}

      {/* Uploads toast */}
      {uploads.length > 0 && (
        <div className="absolute bottom-4 right-4 z-30 w-72 overflow-hidden rounded-xl border border-border bg-surface-2 shadow-2xl">
          <div className="border-b border-border px-4 py-2 text-xs font-medium text-muted">
            Uploading {uploads.length} item{uploads.length > 1 ? "s" : ""}
          </div>
          <div className="max-h-48 overflow-auto scroll-thin">
            {uploads.map((u) => (
              <div key={u.id} className="px-4 py-2">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="truncate text-foreground">{u.name}</span>
                  <span
                    className={cn(
                      "shrink-0",
                      u.status === "error"
                        ? "text-negative"
                        : u.status === "done"
                          ? "text-positive"
                          : "text-dim",
                    )}
                  >
                    {u.status === "error"
                      ? "failed"
                      : u.status === "done"
                        ? "done"
                        : `${u.progress}%`}
                  </span>
                </div>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${u.progress}%`,
                      background:
                        u.status === "error"
                          ? "var(--negative)"
                          : "linear-gradient(to right, #725fe8, #ce47eb, #f57a74)",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Prompt dialog */}
      {dialog && (
        <PromptDialog
          title={dialog.mode === "new-folder" ? "New folder" : "Rename"}
          label={dialog.mode === "new-folder" ? "Folder name" : "New name"}
          initial={dialog.mode === "rename" ? dialog.current : ""}
          confirmLabel={dialog.mode === "new-folder" ? "Create" : "Rename"}
          onCancel={() => setDialog(null)}
          onConfirm={submitDialog}
        />
      )}

      <input
        ref={fileInput}
        type="file"
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files?.length) void handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}

/* =============================== views =============================== */

function ListView({
  folders,
  files,
  selectedId,
  onSelectFile,
  onFavorite,
  onRename,
  onTrash,
}: {
  folders: FolderRow[];
  files: FileRow[];
  selectedId: string | null;
  onSelectFile: (id: string) => void;
  onFavorite: (id: string) => void;
  onRename: (kind: "file" | "folder", id: string, current: string) => void;
  onTrash: (kind: "file" | "folder", id: string) => void;
}) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border text-left text-xs text-dim">
          <th className="px-6 py-2 font-medium">Name</th>
          <th className="w-28 px-3 py-2 text-right font-medium">Size</th>
          <th className="hidden w-40 px-3 py-2 font-medium sm:table-cell">
            Modified
          </th>
          <th className="w-32 px-6 py-2" />
        </tr>
      </thead>
      <tbody>
        {folders.map((f) => (
          <tr
            key={f.id}
            className="group border-b border-border/60 hover:bg-white/[0.03]"
          >
            <td className="px-6 py-2.5">
              <Link
                href={`/files?folder=${f.id}`}
                className="flex items-center gap-3"
              >
                <FolderIcon className="h-5 w-5 shrink-0 fill-brand-purple/20 text-brand-purple" />
                <span className="truncate font-medium text-foreground">
                  {f.name}
                </span>
              </Link>
            </td>
            <td className="px-3 py-2.5 text-right text-dim">—</td>
            <td className="hidden px-3 py-2.5 text-muted sm:table-cell">
              {formatRelativeTime(f.updatedAt)}
            </td>
            <td className="px-6 py-2.5">
              <RowActions
                onRename={() => onRename("folder", f.id, f.name)}
                onTrash={() => onTrash("folder", f.id)}
              />
            </td>
          </tr>
        ))}
        {files.map((f) => {
          const { Icon, tint } = iconForFile(f.name, f.mimeType);
          return (
            <tr
              key={f.id}
              onClick={() => onSelectFile(f.id)}
              className={cn(
                "group cursor-pointer border-b border-border/60 hover:bg-white/[0.03]",
                selectedId === f.id && "bg-brand-purple/10",
              )}
            >
              <td className="px-6 py-2.5">
                <div className="flex items-center gap-3">
                  <Icon className={cn("h-5 w-5 shrink-0", tint)} />
                  <span className="truncate font-medium text-foreground">
                    {f.name}
                  </span>
                  {f.isFavorite && (
                    <Star className="h-3.5 w-3.5 shrink-0 fill-brand-coral text-brand-coral" />
                  )}
                </div>
              </td>
              <td className="px-3 py-2.5 text-right text-muted">
                {formatBytes(f.size)}
              </td>
              <td className="hidden px-3 py-2.5 text-muted sm:table-cell">
                {formatRelativeTime(f.updatedAt)}
              </td>
              <td className="px-6 py-2.5">
                <RowActions
                  fileId={f.id}
                  favorited={f.isFavorite}
                  onFavorite={() => onFavorite(f.id)}
                  onRename={() => onRename("file", f.id, f.name)}
                  onTrash={() => onTrash("file", f.id)}
                />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function GridView({
  folders,
  files,
  selectedId,
  onSelectFile,
}: {
  folders: FolderRow[];
  files: FileRow[];
  selectedId: string | null;
  onSelectFile: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 p-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {folders.map((f) => (
        <Link
          key={f.id}
          href={`/files?folder=${f.id}`}
          className="flex flex-col items-center gap-2 rounded-xl border border-border bg-surface p-4 text-center transition hover:border-white/20 hover:bg-surface-2"
        >
          <FolderIcon className="h-10 w-10 fill-brand-purple/20 text-brand-purple" />
          <span className="w-full truncate text-sm font-medium text-foreground">
            {f.name}
          </span>
        </Link>
      ))}
      {files.map((f) => {
        const { Icon, tint } = iconForFile(f.name, f.mimeType);
        return (
          <button
            key={f.id}
            onClick={() => onSelectFile(f.id)}
            className={cn(
              "flex flex-col items-center gap-2 rounded-xl border border-border bg-surface p-4 text-center transition hover:border-white/20 hover:bg-surface-2",
              selectedId === f.id && "border-brand-magenta/50 bg-brand-purple/10",
            )}
          >
            <Icon className={cn("h-10 w-10", tint)} />
            <span className="w-full truncate text-sm font-medium text-foreground">
              {f.name}
            </span>
            <span className="text-xs text-dim">{formatBytes(f.size)}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ============================ small pieces ============================ */

function RowActions({
  fileId,
  favorited,
  onFavorite,
  onRename,
  onTrash,
}: {
  fileId?: string;
  favorited?: boolean;
  onFavorite?: () => void;
  onRename: () => void;
  onTrash: () => void;
}) {
  const stop = (fn: () => void) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    fn();
  };
  return (
    <div className="flex items-center justify-end gap-0.5 opacity-0 transition group-hover:opacity-100">
      {fileId && (
        <>
          <a
            href={`/api/files/${fileId}/download`}
            onClick={(e) => e.stopPropagation()}
            className="rounded-md p-1.5 text-dim hover:bg-white/10 hover:text-foreground"
            aria-label="Download"
          >
            <Download className="h-4 w-4" />
          </a>
          {onFavorite && (
            <button
              onClick={stop(onFavorite)}
              className={cn(
                "rounded-md p-1.5 hover:bg-white/10",
                favorited
                  ? "text-brand-coral"
                  : "text-dim hover:text-foreground",
              )}
              aria-label="Favorite"
            >
              <Star
                className={cn("h-4 w-4", favorited && "fill-brand-coral")}
              />
            </button>
          )}
        </>
      )}
      <button
        onClick={stop(onRename)}
        className="rounded-md p-1.5 text-dim hover:bg-white/10 hover:text-foreground"
        aria-label="Rename"
      >
        <Pencil className="h-4 w-4" />
      </button>
      <button
        onClick={stop(onTrash)}
        className="rounded-md p-1.5 text-dim hover:bg-white/10 hover:text-negative"
        aria-label="Move to trash"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

function DetailsPanel({
  file,
  onClose,
  onFavorite,
  onRename,
  onTrash,
}: {
  file: FileRow;
  onClose: () => void;
  onFavorite: () => void;
  onRename: () => void;
  onTrash: () => void;
}) {
  const { Icon, tint } = iconForFile(file.name, file.mimeType);
  return (
    <aside className="hidden w-80 shrink-0 flex-col border-l border-border bg-surface md:flex">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <span className="truncate pr-2 font-medium text-foreground">
          {file.name}
        </span>
        <button
          onClick={onClose}
          className="rounded-md p-1 text-dim hover:bg-white/10 hover:text-foreground"
          aria-label="Close details"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="scroll-thin flex-1 overflow-auto px-5 py-5">
        <div className="mb-5 flex items-center justify-center rounded-xl border border-border bg-surface-2 py-10">
          <Icon className={cn("h-16 w-16", tint)} />
        </div>

        <dl className="space-y-3 text-sm">
          <Meta label="Size" value={formatBytes(file.size)} />
          <Meta label="Type" value={file.mimeType} mono />
          <Meta label="Modified" value={formatRelativeTime(file.updatedAt)} />
          <Meta label="Added" value={formatRelativeTime(file.createdAt)} />
        </dl>

        <div className="mt-6 flex flex-wrap gap-2">
          <a
            href={`/api/files/${file.id}/download`}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white"
            style={{
              background: "linear-gradient(to right, #725fe8, #ce47eb, #f57a74)",
            }}
          >
            <Download className="h-4 w-4" /> Download
          </a>
          <button
            onClick={onFavorite}
            className={cn(
              "inline-flex items-center justify-center rounded-lg border border-border p-2",
              file.isFavorite ? "text-brand-coral" : "text-muted",
            )}
            aria-label="Favorite"
          >
            <Star className={cn("h-4 w-4", file.isFavorite && "fill-brand-coral")} />
          </button>
          <button
            onClick={onRename}
            className="inline-flex items-center justify-center rounded-lg border border-border p-2 text-muted hover:text-foreground"
            aria-label="Rename"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={onTrash}
            className="inline-flex items-center justify-center rounded-lg border border-border p-2 text-muted hover:text-negative"
            aria-label="Move to trash"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6 rounded-lg border border-dashed border-border p-4 text-center text-xs text-dim">
          Sharing &amp; versions arrive in P3.
        </div>
      </div>
    </aside>
  );
}

function Meta({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-dim">{label}</dt>
      <dd
        className={cn(
          "max-w-[60%] truncate text-right text-foreground",
          mono && "font-mono text-xs",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function PromptDialog({
  title,
  label,
  initial,
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  title: string;
  label: string;
  initial: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: (value: string) => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 p-4"
      onClick={onCancel}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          onConfirm(value);
        }}
        className="w-full max-w-sm rounded-2xl border border-border bg-surface-2 p-5 shadow-2xl"
      >
        <h2 className="mb-4 text-base font-semibold text-foreground">{title}</h2>
        <label className="mb-1.5 block text-sm text-muted">{label}</label>
        <input
          autoFocus
          aria-label={label}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="mb-5 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-brand-magenta/50 focus:outline-none"
        />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-3 py-2 text-sm text-muted hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-lg px-4 py-2 text-sm font-medium text-white"
            style={{
              background: "linear-gradient(to right, #725fe8, #ce47eb, #f57a74)",
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </form>
    </div>
  );
}

function EmptyState({ onUpload }: { onUpload: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-12 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-surface-2">
        <UploadCloud className="h-8 w-8 text-dim" />
      </div>
      <div>
        <p className="font-medium text-foreground">This folder is empty</p>
        <p className="text-sm text-dim">
          Drag &amp; drop files anywhere, or upload from your device.
        </p>
      </div>
      <button
        onClick={onUpload}
        className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white"
        style={{
          background: "linear-gradient(to right, #725fe8, #ce47eb, #f57a74)",
        }}
      >
        <Upload className="h-4 w-4" /> Upload files
      </button>
    </div>
  );
}
