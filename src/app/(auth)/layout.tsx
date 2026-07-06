import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6 py-12 text-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-[-15%] mx-auto h-[420px] max-w-2xl rounded-full bg-brand opacity-25 blur-3xl"
      />
      <div className="relative w-full max-w-sm">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-lg font-black text-white">
            S
          </span>
          <span className="text-lg font-semibold">Stackfile</span>
        </Link>
        <div className="rounded-2xl border border-border bg-white/[0.03] p-6 shadow-2xl backdrop-blur">
          {children}
        </div>
      </div>
    </main>
  );
}
