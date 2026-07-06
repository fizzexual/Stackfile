"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { HardDrive, Loader2 } from "lucide-react";
import { updateStoragePath, type StorageConfig } from "@/lib/admin/storage";
import { useToast } from "@/components/ui/toast";
import { formatBytes } from "@/lib/files/format";
import { cn } from "@/lib/utils";

export function StorageSettings({ config }: { config: StorageConfig }) {
  const [path, setPath] = useState(config.path);
  const [copyExisting, setCopyExisting] = useState(true);
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const router = useRouter();

  const dirty = path.trim() !== config.path && path.trim().length > 0;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dirty || saving) return;
    setSaving(true);
    try {
      const res = await updateStoragePath(path, copyExisting);
      toast({
        title: "Storage location updated",
        description: res.copied
          ? "Existing files were copied to the new folder."
          : "New uploads will be saved here.",
        variant: "success",
      });
      router.refresh();
    } catch (err) {
      toast({
        title: "Couldn't update storage",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mb-6 rounded-2xl border border-border bg-surface p-5">
      <div className="mb-1 flex items-center gap-2">
        <HardDrive className="h-4 w-4 text-brand-magenta" />
        <h2 className="text-sm font-medium text-foreground">Storage location</h2>
      </div>
      <p className="mb-4 text-xs text-dim">
        Which disk and folder Stackfile keeps uploaded files in. New uploads are
        saved here.
      </p>

      <dl className="mb-4 grid gap-2 text-xs sm:grid-cols-2">
        <Field label="Current folder" value={config.resolvedPath} mono />
        <Field
          label="Disk space"
          value={
            config.freeBytes != null && config.totalBytes != null
              ? `${formatBytes(config.freeBytes)} free of ${formatBytes(config.totalBytes)}`
              : "unknown"
          }
        />
      </dl>

      <form onSubmit={save} className="space-y-3">
        <div>
          <label
            htmlFor="storage-path"
            className="mb-1.5 block text-xs text-muted"
          >
            New folder path
          </label>
          <input
            id="storage-path"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            placeholder="/mnt/disk2/stackfile   or   D:\Stackfile"
            spellCheck={false}
            autoComplete="off"
            className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 font-mono text-sm text-foreground focus:border-brand-magenta/50 focus:outline-none"
          />
        </div>
        <label className="flex items-start gap-2 text-xs text-muted">
          <input
            type="checkbox"
            checked={copyExisting}
            onChange={(e) => setCopyExisting(e.target.checked)}
            className="mt-0.5 accent-brand-magenta"
          />
          Copy existing files to the new folder (recommended — the old folder is
          kept as a backup)
        </label>
        <button
          type="submit"
          disabled={!dirty || saving}
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition disabled:opacity-50"
          style={{
            background: "linear-gradient(to right, #725fe8, #ce47eb, #f57a74)",
          }}
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {saving ? "Applying…" : "Save location"}
        </button>
      </form>

      <p className="mt-3 text-[11px] text-dim">
        Point this at any mounted disk. In Docker the path is inside the
        container — mount your disk onto it in <code>docker-compose.yml</code>.
      </p>
    </section>
  );
}

function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface-2 px-3 py-2">
      <dt className="text-dim">{label}</dt>
      <dd
        className={cn("mt-0.5 break-all text-foreground", mono && "font-mono")}
      >
        {value}
      </dd>
    </div>
  );
}
