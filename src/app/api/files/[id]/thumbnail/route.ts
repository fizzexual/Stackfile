import { Readable } from "node:stream";
import { and, eq } from "drizzle-orm";
import sharp from "sharp";
import { getServerSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { files } from "@/lib/db/schema";
import { getStorage } from "@/lib/storage";

export const runtime = "nodejs";

const THUMB_SIZE = 512;

async function toBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks);
}

function webp(body: BodyInit): Response {
  return new Response(body, {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "private, max-age=86400",
    },
  });
}

/**
 * Serve a small WebP thumbnail for image files. Generated on first request
 * with sharp and cached to storage as `<key>.thumb`. Non-images and
 * unprocessable files return an error status so the client falls back to an
 * icon.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const file = await db.query.files.findFirst({
    where: and(eq(files.id, id), eq(files.ownerId, session.user.id)),
  });
  if (!file) return new Response("Not found", { status: 404 });
  if (!file.mimeType.startsWith("image/")) {
    return new Response("No thumbnail", { status: 415 });
  }

  const storage = await getStorage();
  const thumbKey = `${file.storageKey}.thumb`;

  // Serve a cached thumbnail if one already exists.
  if (await storage.exists(thumbKey)) {
    const cached = await storage.get(thumbKey);
    return webp(Readable.toWeb(cached) as unknown as ReadableStream<Uint8Array>);
  }

  if (!(await storage.exists(file.storageKey))) {
    return new Response("File data missing", { status: 404 });
  }

  try {
    const original = await toBuffer(await storage.get(file.storageKey));
    const thumb = await sharp(original)
      .rotate() // honour EXIF orientation (phone photos)
      .resize(THUMB_SIZE, THUMB_SIZE, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 72 })
      .toBuffer();
    // Best-effort cache; a failed write just means we regenerate next time.
    await storage.put(thumbKey, thumb).catch(() => {});
    return webp(new Uint8Array(thumb));
  } catch {
    return new Response("Thumbnail unavailable", { status: 500 });
  }
}
