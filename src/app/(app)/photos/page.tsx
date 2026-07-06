import type { Metadata } from "next";
import { Image as ImageIcon } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { listImages, type FileRow } from "@/lib/files/queries";
import { PhotoTimeline } from "@/components/files/photo-timeline";

export const metadata: Metadata = { title: "Photos" };

/** Bucket images (already newest-first) into contiguous day groups. */
function groupByDay(files: FileRow[]): { date: string; files: FileRow[] }[] {
  const groups: { date: string; files: FileRow[] }[] = [];
  let current: { date: string; files: FileRow[] } | null = null;
  for (const f of files) {
    const when = f.takenAt ?? f.createdAt;
    const key = new Date(when).toISOString().slice(0, 10);
    if (!current || current.date !== key) {
      current = { date: key, files: [] };
      groups.push(current);
    }
    current.files.push(f);
  }
  return groups;
}

export default async function PhotosPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const images = await listImages(user.id);
  const groups = groupByDay(images);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 border-b border-border px-6 py-4">
        <ImageIcon className="h-4 w-4 text-brand-magenta" />
        <div>
          <h1 className="text-sm font-medium text-foreground">Photos</h1>
          <p className="text-xs text-dim">
            {images.length} photo{images.length === 1 ? "" : "s"} · your image
            timeline
          </p>
        </div>
      </div>
      <div className="scroll-thin min-h-0 flex-1 overflow-auto">
        {images.length === 0 ? (
          <div className="p-12 text-center text-sm text-dim">
            No photos yet — upload some images to build your timeline.
          </div>
        ) : (
          <PhotoTimeline groups={groups} />
        )}
      </div>
    </div>
  );
}
