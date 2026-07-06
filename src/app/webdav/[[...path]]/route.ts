import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import type { ReadableStream as NodeWebReadableStream } from "node:stream/web";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { files, folders } from "@/lib/db/schema";
import { getStorage } from "@/lib/storage";
import { byteLimit } from "@/lib/storage/limit";
import { getStorageUsed } from "@/lib/files/queries";
import { env } from "@/lib/env";
import { authenticateWebdav } from "@/lib/webdav/auth";
import { snapshotVersion } from "@/lib/files/versions";
import {
  collectDescendantKeys,
  listChildren,
  resolveParent,
  resolvePath,
} from "@/lib/webdav/path";
import { multistatus, type PropfindEntry } from "@/lib/webdav/xml";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ path?: string[] }> };

function unauthorized() {
  return new Response("Unauthorized", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Stackfile WebDAV"' },
  });
}

async function segsOf({ params }: Params): Promise<string[]> {
  const { path } = await params;
  return (path ?? []).map((s) => decodeURIComponent(s)).filter((s) => s.length > 0);
}

function href(segments: string[], isCollection: boolean): string {
  const p = segments.map((s) => encodeURIComponent(s)).join("/");
  const base = `/webdav/${p}`;
  return isCollection ? `${base}${p ? "/" : ""}` : base;
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      DAV: "1, 2",
      Allow: "OPTIONS, GET, HEAD, PUT, DELETE, PROPFIND, MKCOL, MOVE",
      "MS-Author-Via": "DAV",
    },
  });
}

export async function GET(request: Request, ctx: Params) {
  const user = await authenticateWebdav(request.headers.get("authorization"));
  if (!user) return unauthorized();

  const r = await resolvePath(user.id, await segsOf(ctx));
  if (r.type !== "file") return new Response("Not found", { status: 404 });

  const storage = getStorage();
  if (!(await storage.exists(r.file.storageKey))) {
    return new Response("Not found", { status: 404 });
  }
  const web = Readable.toWeb(
    await storage.get(r.file.storageKey),
  ) as unknown as ReadableStream<Uint8Array>;
  return new Response(web, {
    headers: {
      "Content-Type": r.file.mimeType,
      "Content-Length": String(r.file.size),
    },
  });
}

export async function HEAD(request: Request, ctx: Params) {
  const user = await authenticateWebdav(request.headers.get("authorization"));
  if (!user) return unauthorized();

  const r = await resolvePath(user.id, await segsOf(ctx));
  if (r.type === "file") {
    return new Response(null, {
      headers: {
        "Content-Type": r.file.mimeType,
        "Content-Length": String(r.file.size),
      },
    });
  }
  if (r.type === "root" || r.type === "folder") return new Response(null);
  return new Response(null, { status: 404 });
}

export async function PUT(request: Request, ctx: Params) {
  const user = await authenticateWebdav(request.headers.get("authorization"));
  if (!user) return unauthorized();

  const parent = await resolveParent(user.id, await segsOf(ctx));
  if (!parent) return new Response("Conflict", { status: 409 });
  if (!request.body) return new Response("No body", { status: 400 });

  const storage = getStorage();
  const storageKey = `${user.id}/${randomUUID()}`;

  const used = user.storageQuota != null ? await getStorageUsed(user.id) : 0;
  const remaining =
    user.storageQuota != null
      ? Math.max(0, user.storageQuota - used)
      : Number.POSITIVE_INFINITY;
  const effectiveMax = Math.min(env.STORAGE_MAX_UPLOAD_BYTES, remaining);

  let stored;
  try {
    stored = await storage.put(
      storageKey,
      Readable.fromWeb(
        request.body as unknown as NodeWebReadableStream,
      ).pipe(byteLimit(effectiveMax)),
    );
  } catch {
    await storage.delete(storageKey).catch(() => {});
    return new Response("Insufficient Storage", { status: 507 });
  }
  const mime = request.headers.get("content-type") || "application/octet-stream";

  const existing = await db.query.files.findFirst({
    where: and(
      eq(files.ownerId, user.id),
      parent.parentId ? eq(files.folderId, parent.parentId) : isNull(files.folderId),
      eq(files.name, parent.name),
      isNull(files.deletedAt),
    ),
  });

  if (existing) {
    // Overwrite via WebDAV → snapshot the old blob as a version.
    await snapshotVersion(existing, user.id);
    await db
      .update(files)
      .set({ size: stored.size, storageKey, mimeType: mime, updatedAt: new Date() })
      .where(eq(files.id, existing.id));
    return new Response(null, { status: 204 });
  }

  await db.insert(files).values({
    name: parent.name,
    ownerId: user.id,
    folderId: parent.parentId,
    size: stored.size,
    mimeType: mime,
    storageKey,
  });
  return new Response(null, { status: 201 });
}

export async function DELETE(request: Request, ctx: Params) {
  const user = await authenticateWebdav(request.headers.get("authorization"));
  if (!user) return unauthorized();

  const r = await resolvePath(user.id, await segsOf(ctx));
  const storage = getStorage();

  if (r.type === "file") {
    await storage.delete(r.file.storageKey).catch(() => {});
    await db.delete(files).where(eq(files.id, r.file.id));
    return new Response(null, { status: 204 });
  }
  if (r.type === "folder") {
    const keys = await collectDescendantKeys(user.id, r.folder.id);
    await Promise.all(keys.map((k) => storage.delete(k).catch(() => {})));
    await db.delete(folders).where(eq(folders.id, r.folder.id));
    return new Response(null, { status: 204 });
  }
  return new Response("Not found", { status: 404 });
}

/** PROPFIND / MKCOL / MOVE arrive here as POST (rewritten by server.js). */
export async function POST(request: Request, ctx: Params) {
  const method = request.headers.get("x-webdav-method");
  const user = await authenticateWebdav(request.headers.get("authorization"));
  if (!user) return unauthorized();
  const segs = await segsOf(ctx);

  if (method === "PROPFIND") return propfind(user.id, segs, request);
  if (method === "MKCOL") return mkcol(user.id, segs);
  if (method === "MOVE") return move(user.id, segs, request);
  if (method === "COPY") return copy(user.id, segs, request);
  return new Response("Method not allowed", { status: 405 });
}

async function propfind(userId: string, segs: string[], request: Request) {
  const depth = request.headers.get("depth") ?? "1";
  const r = await resolvePath(userId, segs);
  if (r.type === "notfound") return new Response("Not found", { status: 404 });

  const entries: PropfindEntry[] = [];

  if (r.type === "root" || r.type === "folder") {
    entries.push({
      href: href(segs, true),
      displayName: r.type === "root" ? "Stackfile" : r.folder.name,
      isCollection: true,
      lastModified: r.type === "root" ? undefined : r.folder.updatedAt,
    });
    if (depth !== "0") {
      const folderId = r.type === "root" ? null : r.folder.id;
      const { folders: cf, files: cff } = await listChildren(userId, folderId);
      for (const f of cf) {
        entries.push({
          href: href([...segs, f.name], true),
          displayName: f.name,
          isCollection: true,
          lastModified: f.updatedAt,
        });
      }
      for (const f of cff) {
        entries.push({
          href: href([...segs, f.name], false),
          displayName: f.name,
          isCollection: false,
          size: f.size,
          mime: f.mimeType,
          lastModified: f.updatedAt,
        });
      }
    }
  } else {
    entries.push({
      href: href(segs, false),
      displayName: r.file.name,
      isCollection: false,
      size: r.file.size,
      mime: r.file.mimeType,
      lastModified: r.file.updatedAt,
    });
  }

  return new Response(multistatus(entries), {
    status: 207,
    headers: { "Content-Type": 'application/xml; charset="utf-8"' },
  });
}

async function mkcol(userId: string, segs: string[]) {
  const parent = await resolveParent(userId, segs);
  if (!parent) return new Response("Conflict", { status: 409 });

  const existing = await db.query.folders.findFirst({
    where: and(
      eq(folders.ownerId, userId),
      parent.parentId ? eq(folders.parentId, parent.parentId) : isNull(folders.parentId),
      eq(folders.name, parent.name),
      isNull(folders.deletedAt),
    ),
  });
  if (existing) return new Response("Method not allowed", { status: 405 });

  await db.insert(folders).values({
    name: parent.name,
    ownerId: userId,
    parentId: parent.parentId,
  });
  return new Response(null, { status: 201 });
}

async function move(userId: string, segs: string[], request: Request) {
  const dest = request.headers.get("destination");
  if (!dest) return new Response("Bad request", { status: 400 });

  let destPath: string;
  try {
    destPath = new URL(dest).pathname;
  } catch {
    destPath = dest;
  }
  const destSegs = destPath
    .replace(/^\/webdav\/?/, "")
    .split("/")
    .filter(Boolean)
    .map((s) => decodeURIComponent(s));
  const destParent = await resolveParent(userId, destSegs);
  if (!destParent) return new Response("Conflict", { status: 409 });

  const r = await resolvePath(userId, segs);
  if (r.type === "file") {
    await db
      .update(files)
      .set({
        name: destParent.name,
        folderId: destParent.parentId,
        updatedAt: new Date(),
      })
      .where(eq(files.id, r.file.id));
    return new Response(null, { status: 201 });
  }
  if (r.type === "folder") {
    await db
      .update(folders)
      .set({
        name: destParent.name,
        parentId: destParent.parentId,
        updatedAt: new Date(),
      })
      .where(eq(folders.id, r.folder.id));
    return new Response(null, { status: 201 });
  }
  return new Response("Not found", { status: 404 });
}

function destinationSegments(dest: string): string[] {
  let path: string;
  try {
    path = new URL(dest).pathname;
  } catch {
    path = dest;
  }
  return path
    .replace(/^\/webdav\/?/, "")
    .split("/")
    .filter(Boolean)
    .map((s) => decodeURIComponent(s));
}

async function copy(userId: string, segs: string[], request: Request) {
  const dest = request.headers.get("destination");
  if (!dest) return new Response("Bad request", { status: 400 });
  const destParent = await resolveParent(userId, destinationSegments(dest));
  if (!destParent) return new Response("Conflict", { status: 409 });

  const r = await resolvePath(userId, segs);
  if (r.type === "file") {
    const storage = getStorage();
    const newKey = `${userId}/${randomUUID()}`;
    await storage.put(newKey, await storage.get(r.file.storageKey));
    await db.insert(files).values({
      name: destParent.name,
      ownerId: userId,
      folderId: destParent.parentId,
      size: r.file.size,
      mimeType: r.file.mimeType,
      storageKey: newKey,
    });
    return new Response(null, { status: 201 });
  }
  return new Response("COPY of collections is not supported", { status: 501 });
}
