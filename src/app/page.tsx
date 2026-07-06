const phases = [
  { id: "P0", label: "Foundation", status: "active" },
  { id: "P1", label: "Auth", status: "todo" },
  { id: "P2", label: "Files MVP", status: "todo" },
  { id: "P3", label: "Sharing", status: "todo" },
  { id: "P4", label: "Teams & Admin", status: "todo" },
  { id: "P5", label: "2FA · Passkeys", status: "todo" },
  { id: "P6", label: "WebDAV · Search", status: "todo" },
  { id: "★", label: "Portfolio flex", status: "todo" },
] as const;

const stack = [
  "Next.js 15",
  "TypeScript",
  "PostgreSQL",
  "Drizzle",
  "better-auth",
  "Docker",
];

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-neutral-950 text-neutral-100">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-[-15%] mx-auto h-[520px] max-w-4xl rounded-full bg-gradient-to-tr from-indigo-600/30 via-fuchsia-500/20 to-cyan-400/20 blur-3xl"
      />
      <div className="relative mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-10 px-6 py-24 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-neutral-300">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          Currently building · P0 Foundation
        </span>

        <div className="flex flex-col items-center gap-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-3xl font-black text-white shadow-lg shadow-fuchsia-500/20">
            S
          </div>
          <div className="space-y-3">
            <h1 className="bg-gradient-to-b from-white to-neutral-400 bg-clip-text text-5xl font-bold tracking-tight text-transparent sm:text-6xl">
              Stackfile
            </h1>
            <p className="text-lg text-neutral-400">
              Self-hosted file storage, reimagined.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-neutral-400">
          {stack.map((t) => (
            <span
              key={t}
              className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1"
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
                p.status === "active"
                  ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                  : "border-white/10 bg-white/5 text-neutral-400"
              }`}
            >
              <div className="font-semibold">{p.id}</div>
              <div>{p.label}</div>
            </div>
          ))}
        </div>

        <p className="text-xs text-neutral-600">
          github.com/fizzexual/Stackfile
        </p>
      </div>
    </main>
  );
}
