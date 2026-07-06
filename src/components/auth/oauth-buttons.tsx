"use client";

import { authClient } from "@/lib/auth/client";
import type { OAuthProvider } from "@/lib/auth/providers";

const LABELS: Record<OAuthProvider, string> = {
  github: "GitHub",
  google: "Google",
};

export function OAuthButtons({ providers }: { providers: OAuthProvider[] }) {
  if (providers.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {providers.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() =>
              authClient.signIn.social({ provider: p, callbackURL: "/files" })
            }
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-white/5 px-3 py-2 text-sm font-medium text-foreground transition hover:bg-white/10"
          >
            Continue with {LABELS[p]}
          </button>
        ))}
      </div>
      <div className="relative flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs text-dim">or</span>
        <span className="h-px flex-1 bg-border" />
      </div>
    </div>
  );
}
