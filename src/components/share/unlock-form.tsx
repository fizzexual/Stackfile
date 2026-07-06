"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock } from "lucide-react";
import { unlockShare } from "@/lib/sharing/actions";

export function UnlockForm({ token }: { token: string }) {
  const router = useRouter();
  const [pw, setPw] = useState("");
  const [err, setErr] = useState(false);
  const [loading, setLoading] = useState(false);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setLoading(true);
        setErr(false);
        const { ok } = await unlockShare(token, pw);
        setLoading(false);
        if (ok) router.refresh();
        else setErr(true);
      }}
      className="py-4"
    >
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-surface-2">
        <Lock className="h-6 w-6 text-brand-magenta" />
      </div>
      <h1 className="font-semibold text-foreground">Password required</h1>
      <p className="mt-1 text-sm text-muted">
        Enter the password to access this file.
      </p>
      <input
        type="password"
        value={pw}
        onChange={(e) => setPw(e.target.value)}
        required
        placeholder="Password"
        aria-label="Share password"
        className="mt-4 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-brand-magenta/50 focus:outline-none"
      />
      {err && <p className="mt-2 text-sm text-negative">Incorrect password</p>}
      <button
        type="submit"
        disabled={loading}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        Unlock
      </button>
    </form>
  );
}
