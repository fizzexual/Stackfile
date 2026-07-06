import type { Metadata } from "next";
import { getServerSession } from "@/lib/auth/session";
import { listTrash } from "@/lib/files/queries";
import { TrashView } from "@/components/files/trash-view";

export const metadata: Metadata = { title: "Trash" };

export default async function TrashPage() {
  const session = await getServerSession();
  if (!session) return null;
  const { folders, files } = await listTrash(session.user.id);

  return (
    <div className="h-full">
      <TrashView folders={folders} files={files} />
    </div>
  );
}
