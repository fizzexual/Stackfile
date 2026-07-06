"use client";

import * as React from "react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronRight,
  Download,
  Eye,
  Folder as FolderIcon,
  FolderOpen,
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
import { FileThumb } from "./file-thumb";
import { SharePanel } from "./share-panel";
import { VersionsPanel } from "./versions-panel";
import { TagsPanel } from "./tags-panel";
import { ContextMenu, type MenuItem } from "./context-menu";
import { FilePreview } from "./file-preview";
import { previewKind } from "@/lib/files/preview";
import { formatBytes, formatRelativeTime } from "@/lib/files/format";
import {
  createFolder,
  renameItem,
  toggleFavorite,
  trashItem,
} from "@/lib/files/actions";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import type { FileRow, FolderRow } from "@/lib/files/queries";

type SortKey = "name" | "size" | "modified";

/** Stable sort of files/folders by the chosen column + direction. */
function sortItems<
  T extends { name: string; updatedAt: Date | string; size?: number },
>(items: T[], key: SortKey, dir: "asc" | "desc"): T[] {
  const sign = dir === "asc" ? 1 : -1;
  return [...items].sort((a, b) => {
    let c: number;
    if (key === "size") c = (a.size ?? 0) - (b.size ?? 0);
    else if (key === "modified")
      c = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
    else c = a.name.localeCompare(b.name, undefined, { numeric: true });
    return c * sign;
  });
}

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

type CtxTarget =
  | { kind: "file"; file: FileRow }
  | { kind: "folder"; folder: FolderRow };

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
  const toast = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);

  const [view, setView] = useState<"list" | "grid">("list");
  const [isDragging, setIsDragging] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [pending, setPending] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    target: CtxTarget;
  } | null>(null);
  const [preview, setPreview] = useState<FileRow | null>(null);
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "name",
    dir: "asc",
  });

  const selectedFile = files.find((f) => f.id === selectedId) ?? null;
  const isEmpty = folders.length === 0 && files.length === 0;

  const sortedFolders = sortItems(
    folders,
    sort.key === "size" ? "name" : sort.key,
    sort.dir,
  );
  const sortedFiles = sortItems(files, sort.key, sort.dir);
  const toggleSort = (key: SortKey) =>
    setSort((s) =>
      s.key === key
        ? { key, dir: s.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" },
    );

  const openFile = (f: FileRow) => {
    if (previewKind(f.mimeType, f.name)) setPreview(f);
    else window.open(`/api/files/${f.id}/download`, "_blank", "noopener");
  };

  const openMenu = (e: React.MouseEvent, target: CtxTarget) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, target });
  };

  const menuItemsFor = (target: CtxTarget): MenuItem[] => {
    if (target.kind === "folder") {
      const fo = target.folder;
      return [
        {
          label: "Open",
          icon: <FolderOpen className="h-4 w-4" />,
          onClick: () => router.push(`/files?folder=${fo.id}`),
        },
        {
          label: "Rename",
          icon: <Pencil className="h-4 w-4" />,
          onClick: () =>
            setDialog({ mode: "rename", kind: "folder", id: fo.id, current: fo.name }),
        },
        { type: "divider" },
        {
          label: "Move to trash",
          icon: <Trash2 className="h-4 w-4" />,
          danger: true,
          onClick: () => void run(() => trashItem("folder", fo.id), "Moved to trash"),
        },
      ];
    }
    const fi = target.file;
    const canPreview = Boolean(previewKind(fi.mimeType, fi.name));
    return [
      {
        label: canPreview ? "Open" : "Open in new tab",
        icon: <Eye className="h-4 w-4" />,
        onClick: () => openFile(fi),
      },
      {
        label: "Download",
        icon: <Download className="h-4 w-4" />,
        href: `/api/files/${fi.id}/download`,
      },
      {
        label: "Rename",
        icon: <Pencil className="h-4 w-4" />,
        onClick: () =>
          setDialog({ mode: "rename", kind: "file", id: fi.id, current: fi.name }),
      },
      {
        label: fi.isFavorite ? "Remove favorite" : "Favorite",
        icon: <Star className="h-4 w-4" />,
        onClick: () => void run(() => toggleFavorite(fi.id)),
      },
      { type: "divider" },
      {
        label: "Move to trash",
        icon: <Trash2 className="h-4 w-4" />,
        danger: true,
        onClick: () => {
          if (selectedId === fi.id) setSelectedId(null);
          void run(() => trashItem("file", fi.id), "Moved to trash");
        },
      },
    ];
  };

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
    let failed = 0;
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
        failed += 1;
        setUploads((u) =>
          u.map((x) => (x.id === id ? { ...x, status: "error" } : x)),
        );
      }
    }
    router.refresh();
    if (failed === 0)
      toast({
        title: `Uploaded ${arr.length} file${arr.length > 1 ? "s" : ""}`,
        variant: "success",
      });
    else
      toast({
        title: `${failed} of ${arr.length} upload${arr.length > 1 ? "s" : ""} failed`,
        description: "Check the file size and your storage quota.",
        variant: "error",
      });
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

  const run = async (fn: () => Promise<void>, success?: string) => {
    setPending(true);
    try {
      await fn();
      router.refresh();
      if (success) toast({ title: success, variant: "success" });
    } catch (e) {
      toast({
        title: "Action failed",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "error",
      });
    } finally {
      setPending(false);
    }
  };

  const submitDialog = async (value: string) => {
    const name = value.trim();
    if (!name || !dialog) return;
    const current = dialog;
    setDialog(null);
    await run(
      async () => {
        if (current.mode === "new-folder")
          await createFolder(name, currentFolderId);
        else await renameItem(current.kind, current.id, name);
      },
      current.mode === "new-folder" ? "Folder created" : "Renamed",
    );
  };

  /* --------------------------- shortcuts --------------------------- */

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (
        el &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          el.isContentEditable)
      )
        return;
      if (e.key === "Escape") {
        if (!dialog && !preview && !contextMenu) setSelectedId(null);
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === "u") {
        e.preventDefault();
        fileInput.current?.click();
      } else if (k === "n") {
        e.preventDefault();
        setDialog({ mode: "new-folder" });
      } else if (k === "g") {
        setView("grid");
      } else if (k === "l") {
        setView("list");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dialog, preview, contextMenu]);

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
              title="New folder (N)"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm font-medium text-foreground transition hover:bg-surface-3"
            >
              <FolderPlus className="h-4 w-4" />
              New folder
            </button>
            <button
              onClick={() => fileInput.current?.click()}
              title="Upload (U)"
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
                title="List view (L)"
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
                title="Grid view (G)"
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
              folders={sortedFolders}
              files={sortedFiles}
              selectedId={selectedId}
              onSelectFile={setSelectedId}
              onFavorite={(id) => run(() => toggleFavorite(id))}
              onRename={(kind, id, current) =>
                setDialog({ mode: "rename", kind, id, current })
              }
              onTrash={(kind, id) =>
                run(() => trashItem(kind, id), "Moved to trash")
              }
              onContextMenu={openMenu}
              onOpenFile={openFile}
              sort={sort}
              onSort={toggleSort}
            />
          ) : (
            <GridView
              folders={sortedFolders}
              files={sortedFiles}
              selectedId={selectedId}
              onSelectFile={setSelectedId}
              onContextMenu={openMenu}
              onOpenFile={openFile}
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
            void run(() => trashItem("file", selectedFile.id), "Moved to trash");
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

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={menuItemsFor(contextMenu.target)}
          onClose={() => setContextMenu(null)}
        />
      )}

      {preview && (
        <FilePreview file={preview} onClose={() => setPreview(null)} />
      )}
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
  onContextMenu,
  onOpenFile,
  sort,
  onSort,
}: {
  folders: FolderRow[];
  files: FileRow[];
  selectedId: string | null;
  onSelectFile: (id: string) => void;
  onFavorite: (id: string) => void;
  onRename: (kind: "file" | "folder", id: string, current: string) => void;
  onTrash: (kind: "file" | "folder", id: string) => void;
  onContextMenu: (e: React.MouseEvent, target: CtxTarget) => void;
  onOpenFile: (file: FileRow) => void;
  sort: { key: SortKey; dir: "asc" | "desc" };
  onSort: (key: SortKey) => void;
}) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border text-left text-xs text-dim">
          <th className="px-6 py-2 font-medium">
            <SortBtn label="Name" col="name" sort={sort} onSort={onSort} />
          </th>
          <th className="w-28 px-3 py-2 text-right font-medium">
            <SortBtn
              label="Size"
              col="size"
              sort={sort}
              onSort={onSort}
              align="right"
            />
          </th>
          <th className="hidden w-40 px-3 py-2 font-medium sm:table-cell">
            <SortBtn
              label="Modified"
              col="modified"
              sort={sort}
              onSort={onSort}
            />
          </th>
          <th className="w-32 px-6 py-2" />
        </tr>
      </thead>
      <tbody>
        {folders.map((f) => (
          <tr
            key={f.id}
            onContextMenu={(e) => onContextMenu(e, { kind: "folder", folder: f })}
            className="group cursor-pointer border-b border-border/60 hover:bg-white/[0.03]"
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
          return (
            <tr
              key={f.id}
              onClick={() => onSelectFile(f.id)}
              onDoubleClick={() => onOpenFile(f)}
              onContextMenu={(e) => onContextMenu(e, { kind: "file", file: f })}
              className={cn(
                "group cursor-pointer border-b border-border/60 hover:bg-white/[0.03]",
                selectedId === f.id && "bg-brand-purple/10",
              )}
            >
              <td className="px-6 py-2.5">
                <div className="flex items-center gap-3">
                  <FileThumb
                    id={f.id}
                    name={f.name}
                    mimeType={f.mimeType}
                    variant="list"
                  />
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
  onContextMenu,
  onOpenFile,
}: {
  folders: FolderRow[];
  files: FileRow[];
  selectedId: string | null;
  onSelectFile: (id: string) => void;
  onContextMenu: (e: React.MouseEvent, target: CtxTarget) => void;
  onOpenFile: (file: FileRow) => void;
}) {
  return (
    <div className="space-y-6 p-6">
      {folders.length > 0 && (
        <section>
          <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-dim">
            Folders
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {folders.map((f) => (
              <Link
                key={f.id}
                href={`/files?folder=${f.id}`}
                onContextMenu={(e) =>
                  onContextMenu(e, { kind: "folder", folder: f })
                }
                className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3 transition hover:border-white/20 hover:bg-surface-2"
              >
                <FolderIcon className="h-8 w-8 shrink-0 fill-brand-purple/20 text-brand-purple" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {f.name}
                  </p>
                  <p className="truncate text-xs text-dim">
                    {formatRelativeTime(f.updatedAt)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {files.length > 0 && (
        <section>
          <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-dim">
            Files
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {files.map((f) => (
              <button
                key={f.id}
                onClick={() => onSelectFile(f.id)}
                onDoubleClick={() => onOpenFile(f)}
                onContextMenu={(e) => onContextMenu(e, { kind: "file", file: f })}
                className={cn(
                  "group flex flex-col gap-2 rounded-xl border border-border bg-surface p-2.5 text-left transition hover:border-white/20 hover:bg-surface-2",
                  selectedId === f.id &&
                    "border-brand-magenta/50 bg-brand-purple/10",
                )}
              >
                <FileThumb
                  id={f.id}
                  name={f.name}
                  mimeType={f.mimeType}
                  variant="grid"
                />
                <div className="min-w-0 px-0.5 pb-0.5">
                  <p className="flex items-center gap-1 text-sm font-medium text-foreground">
                    <span className="truncate">{f.name}</span>
                    {f.isFavorite && (
                      <Star className="h-3 w-3 shrink-0 fill-brand-coral text-brand-coral" />
                    )}
                  </p>
                  <p className="text-xs text-dim">{formatBytes(f.size)}</p>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/* ============================ small pieces ============================ */

function SortBtn({
  label,
  col,
  sort,
  onSort,
  align,
}: {
  label: string;
  col: SortKey;
  sort: { key: SortKey; dir: "asc" | "desc" };
  onSort: (key: SortKey) => void;
  align?: "right";
}) {
  const active = sort.key === col;
  return (
    <button
      type="button"
      onClick={() => onSort(col)}
      className={cn(
        "inline-flex items-center gap-1 rounded px-1 py-0.5 uppercase tracking-wide transition hover:text-foreground",
        active && "text-foreground",
        align === "right" && "flex-row-reverse",
      )}
      aria-label={`Sort by ${label}`}
    >
      {label}
      <span
        className={cn(
          "text-[9px] leading-none",
          active ? "opacity-100" : "opacity-0",
        )}
      >
        {sort.dir === "asc" ? "▲" : "▼"}
      </span>
    </button>
  );
}

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
        <div className="mb-5">
          <FileThumb
            id={file.id}
            name={file.name}
            mimeType={file.mimeType}
            variant="grid"
          />
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

        <TagsPanel key={`t-${file.id}`} fileId={file.id} />
        <SharePanel key={file.id} fileId={file.id} />
        <VersionsPanel key={`v-${file.id}`} fileId={file.id} />
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
