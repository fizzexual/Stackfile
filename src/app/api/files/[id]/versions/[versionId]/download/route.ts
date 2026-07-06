import { Readable } from "node:stream";
import { and, eq } from "drizzle-orm";
import { getServerSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { fileVersions, files } from "@/lib/db/schema";
import { getStorage } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; versionId: string }> },
) {
  const session = await getServerSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { id, versionId } = await params;
  const file = await db.query.files.findFirst({
    where: and(eq(files.id, id), eq(files.ownerId, session.user.id)),
    columns: { id: true, name: true, mimeType: true },
  });
  if (!file) return new Response("Not found", { status: 404 });

  const version = await db.query.fileVersions.findFirst({
    where: and(eq(fileVersions.id, versionId), eq(fileVersions.fileId, id)),
  });
  if (!version) return new Response("Not found", { status: 404 });

  const storage = getStorage();
  if (!(await storage.exists(version.storageKey))) {
    return new Response("Version data missing", { status: 404 });
  }
  const web = Readable.toWeb(
    await storage.get(version.storageKey),
  ) as unknown as ReadableStream<Uint8Array>;

  return new Response(web, {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Length": String(version.size),
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(
        `v${version.versionNumber}-${file.name}`,
      )}`,
    },
  });
}
