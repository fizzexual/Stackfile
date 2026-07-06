import type { Metadata } from "next";
import { Star } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { listFavorites } from "@/lib/files/queries";
import { SimpleFileList } from "@/components/files/simple-file-list";

export const metadata: Metadata = { title: "Favorites" };

export default async function FavoritesPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const files = await listFavorites(user.id);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 border-b border-border px-6 py-4">
        <Star className="h-4 w-4 fill-brand-coral text-brand-coral" />
        <div>
          <h1 className="text-sm font-medium text-foreground">Favorites</h1>
          <p className="text-xs text-dim">Files you&apos;ve starred</p>
        </div>
      </div>
      <div className="scroll-thin min-h-0 flex-1 overflow-auto">
        <SimpleFileList
          files={files}
          emptyLabel="No favorites yet — star a file to see it here."
        />
      </div>
    </div>
  );
}
