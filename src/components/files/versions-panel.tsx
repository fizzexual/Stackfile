"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, History, Loader2, RotateCcw } from "lucide-react";
import {
  getFileVersions,
  restoreVersion,
  type VersionDTO,
} from "@/lib/files/version-actions";
import { formatBytes, formatRelativeTime } from "@/lib/files/format";

export function VersionsPanel({ fileId }: { fileId: string }) {
  const router = useRouter();
  const [versions, setVersions] = useState<VersionDTO[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getFileVersions(fileId)
      .then((v) => {
        if (active) setVersions(v);
      })
      .catch(() => {
        if (active) setVersions([]);
      });
    return () => {
      active = false;
    };
  }, [fileId]);

  async function restore(versionId: string) {
    setBusy(versionId);
    try {
      await restoreVersion(fileId, versionId);
      router.refresh();
      setVersions(await getFileVersions(fileId));
    } catch {
      /* ignore */
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-6">
      <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-dim">
        Versions
      </h3>
      {versions === null ? (
        <div className="flex items-center gap-2 py-2 text-xs text-dim">
          <Loader2 className="h-3 w-3 animate-spin" /> loading…
        </div>
      ) : versions.length === 0 ? (
        <p className="py-2 text-xs text-dim">
          No previous versions. Re-upload a file with the same name to create one.
        </p>
      ) : (
        <ul className="space-y-2">
          {versions.map((v) => (
            <li
              key={v.id}
              className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 p-2.5"
            >
              <History className="h-3.5 w-3.5 shrink-0 text-brand-purple" />
              <div className="min-w-0 flex-1">
                <div className="text-xs text-foreground">
                  v{v.versionNumber} · {formatBytes(v.size)}
                </div>
                <div className="text-[10px] text-dim">
                  {formatRelativeTime(v.createdAt)}
                </div>
              </div>
              <a
                href={`/api/files/${fileId}/versions/${v.id}/download`}
                className="rounded p-1 text-dim hover:bg-white/10 hover:text-foreground"
                aria-label="Download version"
              >
                <Download className="h-3.5 w-3.5" />
              </a>
              <button
                onClick={() => restore(v.id)}
                disabled={busy === v.id}
                className="rounded p-1 text-dim hover:bg-white/10 hover:text-foreground disabled:opacity-50"
                aria-label="Restore version"
              >
                {busy === v.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="h-3.5 w-3.5" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
