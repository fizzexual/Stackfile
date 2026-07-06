"use client";

import { useState } from "react";
import { Check, Copy, KeyRound, Loader2 } from "lucide-react";
import { generateWebdavToken } from "@/lib/webdav/actions";
import { Section } from "./section";

export function WebdavSection({
  email,
  configured,
}: {
  email: string;
  configured: boolean;
}) {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  async function generate() {
    setLoading(true);
    try {
      const res = await generateWebdavToken();
      setToken(res.token);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Section
      title="WebDAV access"
      description="Mount Stackfile as a network drive (Finder, Explorer, mobile apps)"
    >
      <dl className="space-y-2 text-sm">
        <div className="flex items-start justify-between gap-3">
          <dt className="text-dim">URL</dt>
          <dd className="break-all text-right font-mono text-xs text-foreground">
            {origin}/webdav
          </dd>
        </div>
        <div className="flex items-start justify-between gap-3">
          <dt className="text-dim">Username</dt>
          <dd className="text-foreground">{email}</dd>
        </div>
        <div className="flex items-start justify-between gap-3">
          <dt className="text-dim">Password</dt>
          <dd className="text-foreground">
            {configured && !token ? "•••••••• (set)" : "generate below"}
          </dd>
        </div>
      </dl>

      {token && (
        <div className="mt-3 rounded-lg border border-brand-magenta/30 bg-brand-purple/10 p-3">
          <p className="text-xs text-muted">
            Your WebDAV password — copy it now, it won&apos;t be shown again:
          </p>
          <div className="mt-1 flex items-center gap-2">
            <code className="flex-1 break-all font-mono text-sm text-foreground">
              {token}
            </code>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard
                  .writeText(token)
                  .then(() => {
                    setCopied(true);
                    window.setTimeout(() => setCopied(false), 1500);
                  })
                  .catch(() => {});
              }}
              className="rounded p-1 text-dim hover:text-foreground"
              aria-label="Copy WebDAV password"
            >
              {copied ? (
                <Check className="h-4 w-4 text-positive" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      )}

      <button
        onClick={generate}
        disabled={loading}
        className="mt-3 inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm text-foreground transition hover:bg-white/5 disabled:opacity-50"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <KeyRound className="h-4 w-4" />
        )}
        {configured ? "Regenerate password" : "Generate WebDAV password"}
      </button>
    </Section>
  );
}
