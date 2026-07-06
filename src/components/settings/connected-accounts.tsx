"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Link2, Loader2, Unlink } from "lucide-react";
import { authClient } from "@/lib/auth/client";
import type { OAuthProvider } from "@/lib/auth/providers";
import { Section } from "./section";

const LABELS: Record<OAuthProvider, string> = {
  github: "GitHub",
  google: "Google",
};

export function ConnectedAccounts({
  providers,
  linked,
}: {
  providers: OAuthProvider[];
  linked: string[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  if (providers.length === 0) {
    return (
      <Section title="Connected accounts" description="Social sign-in">
        <p className="text-sm text-dim">
          No OAuth providers are configured on this instance.
        </p>
      </Section>
    );
  }

  return (
    <Section title="Connected accounts" description="Link social sign-in providers">
      <ul className="space-y-2">
        {providers.map((p) => {
          const isLinked = linked.includes(p);
          return (
            <li
              key={p}
              className="flex items-center justify-between rounded-lg border border-border bg-surface-2 px-3 py-2"
            >
              <span className="flex items-center gap-2 text-sm text-foreground">
                {LABELS[p]}
              </span>
              {isLinked ? (
                <button
                  onClick={async () => {
                    setBusy(p);
                    await authClient.unlinkAccount({ providerId: p }).catch(() => {});
                    setBusy(null);
                    router.refresh();
                  }}
                  className="inline-flex items-center gap-1 text-xs text-muted hover:text-negative"
                >
                  {busy === p ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Unlink className="h-3 w-3" />
                  )}
                  Disconnect
                </button>
              ) : (
                <button
                  onClick={() =>
                    authClient.linkSocial({ provider: p, callbackURL: "/settings" })
                  }
                  className="inline-flex items-center gap-1 text-xs text-brand-magenta"
                >
                  <Link2 className="h-3 w-3" />
                  Connect
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
