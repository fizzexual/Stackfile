import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-neutral-950 px-6 py-12 text-neutral-100">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-[-15%] mx-auto h-[420px] max-w-2xl rounded-full bg-gradient-to-tr from-indigo-600/25 via-fuchsia-500/15 to-cyan-400/15 blur-3xl"
      />
      <div className="relative w-full max-w-sm">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-lg font-black text-white">
            S
          </span>
          <span className="text-lg font-semibold">Stackfile</span>
        </Link>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-2xl backdrop-blur">
          {children}
        </div>
      </div>
    </main>
  );
}
