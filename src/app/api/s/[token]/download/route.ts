import { Readable } from "node:stream";
import { cookies } from "next/headers";
import { getShareWithFile } from "@/lib/sharing/queries";
import { shareCookieName, shareUnlockToken } from "@/lib/sharing/hash";
import { getStorage } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const data = await getShareWithFile(token);
  if (!data) return new Response("Not found", { status: 404 });

  const { share, file } = data;
  if (share.expiresAt && share.expiresAt < new Date()) {
    return new Response("This link has expired", { status: 410 });
  }

  if (share.passwordHash) {
    const jar = await cookies();
    const ok =
      jar.get(shareCookieName(share.id))?.value === shareUnlockToken(share.id);
    if (!ok) return new Response("Password required", { status: 401 });
  }

  const storage = getStorage();
  if (!(await storage.exists(file.storageKey))) {
    return new Response("File data missing", { status: 404 });
  }

  const webStream = Readable.toWeb(
    await storage.get(file.storageKey),
  ) as unknown as ReadableStream<Uint8Array>;

  return new Response(webStream, {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Length": String(file.size),
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(
        file.name,
      )}`,
      "Cache-Control": "private, max-age=0",
    },
  });
}
