"use client";

import { useEffect, useState } from "react";
import { Download, FileWarning, Loader2, X } from "lucide-react";
import { previewKind } from "@/lib/files/preview";
import { formatBytes } from "@/lib/files/format";

type PreviewFile = {
  id: string;
  name: string;
  mimeType: string;
  size: number;
};

export function FilePreview({
  file,
  onClose,
}: {
  file: PreviewFile;
  onClose: () => void;
}) {
  const kind = previewKind(file.mimeType, file.name);
  const inlineUrl = `/api/files/${file.id}/download?inline`;
  const downloadUrl = `/api/files/${file.id}/download`;
  const [text, setText] = useState<string | null>(null);
  const [loadingText, setLoadingText] = useState(kind === "text");

  useEffect(() => {
    if (kind !== "text") return;
    let active = true;
    fetch(`/api/files/${file.id}/download?inline`)
      .then((r) => r.text())
      .then((t) => {
        if (active) {
          setText(t.slice(0, 500_000));
          setLoadingText(false);
        }
      })
      .catch(() => active && setLoadingText(false));
    return () => {
      active = false;
    };
  }, [file.id, kind]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/85 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex items-center justify-between gap-4 border-b border-white/10 px-6 py-3 text-neutral-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="min-w-0">
          <div className="truncate font-medium">{file.name}</div>
          <div className="truncate text-xs text-neutral-400">
            {formatBytes(file.size)} · {file.mimeType}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <a
            href={downloadUrl}
            className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-1.5 text-sm hover:bg-white/10"
          >
            <Download className="h-4 w-4" /> Download
          </a>
          <button
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-white/10"
            aria-label="Close preview"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div
        className="flex flex-1 items-center justify-center overflow-auto p-4"
        onClick={(e) => e.stopPropagation()}
      >
        {kind === "image" && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={inlineUrl}
            alt={file.name}
            className="max-h-full max-w-full object-contain"
          />
        )}
        {kind === "pdf" && (
          <iframe
            src={inlineUrl}
            title={file.name}
            className="h-full w-full max-w-5xl rounded-lg bg-white"
          />
        )}
        {kind === "video" && (
          <video src={inlineUrl} controls className="max-h-full max-w-full" />
        )}
        {kind === "audio" && (
          <audio src={inlineUrl} controls className="w-full max-w-md" />
        )}
        {kind === "text" &&
          (loadingText ? (
            <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
          ) : (
            <pre className="scroll-thin h-full w-full max-w-4xl overflow-auto whitespace-pre-wrap rounded-lg border border-white/10 bg-neutral-950 p-4 text-sm text-neutral-200">
              {text}
            </pre>
          ))}
        {kind === null && (
          <div className="text-center text-neutral-300">
            <FileWarning className="mx-auto h-10 w-10 text-neutral-500" />
            <p className="mt-3 text-sm">
              This file type can&apos;t be previewed in the browser.
            </p>
            <a
              href={downloadUrl}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm hover:bg-white/20"
            >
              <Download className="h-4 w-4" /> Download instead
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
