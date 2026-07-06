import { cookies } from "next/headers";
import Link from "next/link";
import { Download, FileWarning } from "lucide-react";
import { getShareWithFile } from "@/lib/sharing/queries";
import { shareCookieName, shareUnlockToken } from "@/lib/sharing/hash";
import { formatBytes } from "@/lib/files/format";
import { iconForFile } from "@/components/files/file-icon";
import { UnlockForm } from "@/components/share/unlock-form";

export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const data = await getShareWithFile(token);
  const expired = Boolean(
    data?.share.expiresAt && data.share.expiresAt < new Date(),
  );

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6 py-12 text-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-[-15%] mx-auto h-[420px] max-w-2xl rounded-full bg-brand opacity-20 blur-3xl"
      />
      <div className="relative w-full max-w-sm">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-sm font-black text-white">
            S
          </span>
          <span className="font-semibold">Stackfile</span>
        </Link>
        <div className="rounded-2xl border border-border bg-white/[0.03] p-6 text-center shadow-2xl backdrop-blur">
          {!data || expired ? (
            <Unavailable />
          ) : (
            <ShareBody token={token} data={data} />
          )}
        </div>
        <p className="mt-4 text-center text-xs text-dim">
          Shared securely via Stackfile
        </p>
      </div>
    </main>
  );
}

function Unavailable() {
  return (
    <div className="py-6">
      <FileWarning className="mx-auto h-10 w-10 text-dim" />
      <h1 className="mt-3 font-semibold text-foreground">Link unavailable</h1>
      <p className="mt-1 text-sm text-muted">
        This share link is invalid or has expired.
      </p>
    </div>
  );
}

async function ShareBody({
  token,
  data,
}: {
  token: string;
  data: NonNullable<Awaited<ReturnType<typeof getShareWithFile>>>;
}) {
  const { share, file } = data;

  if (share.passwordHash) {
    const jar = await cookies();
    const unlocked =
      jar.get(shareCookieName(share.id))?.value === shareUnlockToken(share.id);
    if (!unlocked) return <UnlockForm token={token} />;
  }

  const { Icon, tint } = iconForFile(file.name, file.mimeType);
  return (
    <div>
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-xl border border-border bg-surface-2">
        <Icon className={`h-8 w-8 ${tint}`} />
      </div>
      <h1 className="truncate font-semibold text-foreground">{file.name}</h1>
      <p className="mt-1 text-sm text-muted">{formatBytes(file.size)}</p>
      <a
        href={`/api/s/${token}/download`}
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
      >
        <Download className="h-4 w-4" />
        Download
      </a>
    </div>
  );
}
