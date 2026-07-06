import type { Metadata } from "next";
import { getServerSession } from "@/lib/auth/session";
import { getBreadcrumb, listFolder } from "@/lib/files/queries";
import { FileManager } from "@/components/files/file-manager";

export const metadata: Metadata = { title: "Files" };

export default async function FilesPage({
  searchParams,
}: {
  searchParams: Promise<{ folder?: string }>;
}) {
  const session = await getServerSession();
  if (!session) return null; // layout redirects unauthenticated users
  const userId = session.user.id;

  const { folder } = await searchParams;
  const folderId = folder ?? null;

  const [{ folders, files }, breadcrumb] = await Promise.all([
    listFolder(userId, folderId),
    getBreadcrumb(userId, folderId),
  ]);

  return (
    <div className="h-full">
      <FileManager
        currentFolderId={folderId}
        breadcrumb={breadcrumb}
        folders={folders}
        files={files}
      />
    </div>
  );
}
