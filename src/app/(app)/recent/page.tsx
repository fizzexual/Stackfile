import type { Metadata } from "next";
import { Clock } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { listRecent } from "@/lib/files/queries";
import { SimpleFileList } from "@/components/files/simple-file-list";

export const metadata: Metadata = { title: "Recent" };

export default async function RecentPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const files = await listRecent(user.id);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 border-b border-border px-6 py-4">
        <Clock className="h-4 w-4 text-brand-magenta" />
        <div>
          <h1 className="text-sm font-medium text-foreground">Recent</h1>
          <p className="text-xs text-dim">Recently modified files</p>
        </div>
      </div>
      <div className="scroll-thin min-h-0 flex-1 overflow-auto">
        <SimpleFileList
          files={files}
          emptyLabel="Nothing here yet — upload a file to get started."
        />
      </div>
    </div>
  );
}
