import Link from "next/link";

const phases = [
  { id: "P0", label: "Foundation", status: "done" },
  { id: "P1", label: "Auth", status: "done" },
  { id: "P2", label: "Files", status: "done" },
  { id: "P3", label: "Sharing", status: "active" },
  { id: "P4", label: "Teams & Admin", status: "todo" },
  { id: "P5", label: "2FA · Passkeys", status: "todo" },
  { id: "P6", label: "WebDAV · Search", status: "todo" },
  { id: "★", label: "Portfolio flex", status: "todo" },
] as const;

const stack = [
  "Next.js 16",
  "TypeScript",
  "PostgreSQL",
  "Drizzle",
  "better-auth",
  "Docker",
];

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-[-15%] mx-auto h-[520px] max-w-4xl rounded-full bg-brand opacity-30 blur-3xl"
      />
      <div className="relative mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-10 px-6 py-24 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-white/5 px-3 py-1 text-xs font-medium text-muted">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-positive" />
          Currently building · P3 Sharing
        </span>

        <div className="flex flex-col items-center gap-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand text-3xl font-black text-white shadow-lg">
            S
          </div>
          <div className="space-y-3">
            <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
              <span className="text-gradient">Stackfile</span>
            </h1>
            <p className="text-lg text-muted">
              Self-hosted file storage, reimagined.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/signup"
              className="rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-white shadow-lg transition hover:opacity-90"
            >
              Get started
            </Link>
            <Link
              href="/login"
              className="rounded-lg border border-border bg-white/5 px-5 py-2.5 text-sm font-medium text-foreground transition hover:bg-white/10"
            >
              Sign in
            </Link>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-muted">
          {stack.map((t) => (
            <span
              key={t}
              className="rounded-md border border-border bg-white/5 px-2.5 py-1"
            >
              {t}
            </span>
          ))}
        </div>

        <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4">
          {phases.map((p) => (
            <div
              key={p.id}
              className={`rounded-lg border px-3 py-2 text-left text-xs ${
                p.status === "done"
                  ? "border-positive/30 bg-positive/10 text-foreground"
                  : p.status === "active"
                    ? "border-brand-magenta/40 bg-brand-purple/15 text-foreground"
                    : "border-border bg-white/5 text-muted"
              }`}
            >
              <div className="font-semibold">{p.id}</div>
              <div>{p.label}</div>
            </div>
          ))}
        </div>

        <p className="text-xs text-dim">github.com/fizzexual/Stackfile</p>
      </div>
    </main>
  );
}
