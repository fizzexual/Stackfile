"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { FilePreview } from "./file-preview";
import type { FileRow } from "@/lib/files/queries";

type Group = { date: string; files: FileRow[] };

function formatDayHeader(key: string): string {
  const d = new Date(`${key}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - d.getTime()) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "long",
    day: "numeric",
    ...(d.getFullYear() === today.getFullYear() ? {} : { year: "numeric" }),
  });
}

export function PhotoTimeline({ groups }: { groups: Group[] }) {
  const [preview, setPreview] = useState<FileRow | null>(null);

  return (
    <>
      <div className="space-y-7 p-6">
        {groups.map((g) => (
          <section key={g.date}>
            <h2 className="mb-3 text-sm font-semibold text-foreground">
              {formatDayHeader(g.date)}
              <span className="ml-2 text-xs font-normal text-dim">
                {g.files.length}
              </span>
            </h2>
            <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10">
              {g.files.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setPreview(f)}
                  title={f.name}
                  className="group relative aspect-square overflow-hidden rounded-md bg-surface-2 ring-brand-magenta/50 transition focus:outline-none focus-visible:ring-2"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/files/${f.id}/thumbnail`}
                    alt={f.name}
                    loading="lazy"
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                  {f.isFavorite && (
                    <Star className="absolute right-1 top-1 h-3.5 w-3.5 fill-brand-coral text-brand-coral drop-shadow" />
                  )}
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
      {preview && (
        <FilePreview file={preview} onClose={() => setPreview(null)} />
      )}
    </>
  );
}
