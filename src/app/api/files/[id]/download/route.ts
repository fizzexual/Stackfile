import { Readable } from "node:stream";
import { and, eq } from "drizzle-orm";
import { getServerSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { files } from "@/lib/db/schema";
import { getStorage } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const file = await db.query.files.findFirst({
    where: and(eq(files.id, id), eq(files.ownerId, session.user.id)),
  });
  if (!file) return new Response("Not found", { status: 404 });

  const storage = getStorage();
  if (!(await storage.exists(file.storageKey))) {
    return new Response("File data missing", { status: 404 });
  }

  const nodeStream = await storage.get(file.storageKey);
  const webStream = Readable.toWeb(
    nodeStream,
  ) as unknown as ReadableStream<Uint8Array>;

  const { searchParams } = new URL(request.url);
  const disposition = searchParams.has("inline") ? "inline" : "attachment";

  return new Response(webStream, {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Length": String(file.size),
      "Content-Disposition": `${disposition}; filename*=UTF-8''${encodeURIComponent(
        file.name,
      )}`,
      "Cache-Control": "private, max-age=0",
    },
  });
}
