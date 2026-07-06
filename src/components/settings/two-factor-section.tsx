"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { Check, Copy, Loader2, ShieldCheck } from "lucide-react";
import { authClient } from "@/lib/auth/client";
import { Section } from "./section";

export function TwoFactorSection({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [totpUri, setTotpUri] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const secret = totpUri
    ? new URLSearchParams(totpUri.split("?")[1] ?? "").get("secret")
    : null;

  async function startEnable() {
    setError(null);
    setLoading(true);
    const { data, error } = await authClient.twoFactor.enable({ password });
    setLoading(false);
    if (error) {
      setError(error.message ?? "Failed to start 2FA setup");
      return;
    }
    setTotpUri(data?.totpURI ?? null);
    setBackupCodes(data?.backupCodes ?? []);
    setPassword("");
  }

  async function verifyEnable() {
    setError(null);
    setLoading(true);
    const { error } = await authClient.twoFactor.verifyTotp({ code });
    setLoading(false);
    if (error) {
      setError("Invalid code — try again");
      return;
    }
    setTotpUri(null);
    setBackupCodes([]);
    setCode("");
    router.refresh();
  }

  async function disable() {
    setError(null);
    setLoading(true);
    const { error } = await authClient.twoFactor.disable({ password });
    setLoading(false);
    if (error) {
      setError(error.message ?? "Failed to disable 2FA");
      return;
    }
    setPassword("");
    router.refresh();
  }

  if (enabled) {
    return (
      <Section
        title="Two-factor authentication"
        description="An authenticator app is protecting your account"
      >
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-positive/10 px-3 py-1 text-xs text-positive">
          <ShieldCheck className="h-3.5 w-3.5" /> Enabled
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void disable();
          }}
          className="flex items-end gap-2"
        >
          <div className="flex-1">
            <label className="mb-1 block text-xs text-muted">
              Password to disable
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              aria-label="Password"
              className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm text-negative hover:bg-white/5 disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Disable
          </button>
        </form>
        {error && <p className="mt-2 text-sm text-negative">{error}</p>}
      </Section>
    );
  }

  if (totpUri) {
    return (
      <Section
        title="Two-factor authentication"
        description="Scan with your authenticator app, then confirm"
      >
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <div className="rounded-xl bg-white p-3">
            <QRCodeSVG value={totpUri} size={132} />
          </div>
          <div className="flex-1 space-y-3">
            {secret && (
              <div>
                <div className="text-xs text-muted">
                  Or enter this secret manually:
                </div>
                <code className="mt-1 block break-all rounded-md bg-surface-2 px-2 py-1 font-mono text-xs text-foreground">
                  {secret}
                </code>
              </div>
            )}
            {backupCodes.length > 0 && (
              <div>
                <div className="flex items-center justify-between text-xs text-muted">
                  <span>Backup codes — save these:</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard
                        .writeText(backupCodes.join("\n"))
                        .then(() => {
                          setCopied(true);
                          window.setTimeout(() => setCopied(false), 1500);
                        })
                        .catch(() => {});
                    }}
                    className="inline-flex items-center gap-1 text-brand-magenta"
                  >
                    {copied ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                    copy
                  </button>
                </div>
                <div className="mt-1 grid grid-cols-2 gap-1 rounded-md bg-surface-2 p-2 font-mono text-[11px] text-muted">
                  {backupCodes.map((c) => (
                    <span key={c}>{c}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void verifyEnable();
          }}
          className="mt-4 flex items-end gap-2"
        >
          <div className="flex-1">
            <label className="mb-1 block text-xs text-muted">
              Enter the 6-digit code to confirm
            </label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              inputMode="numeric"
              placeholder="123456"
              aria-label="2FA code"
              className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Verify &amp; enable
          </button>
        </form>
        {error && <p className="mt-2 text-sm text-negative">{error}</p>}
      </Section>
    );
  }

  return (
    <Section
      title="Two-factor authentication"
      description="Add a TOTP authenticator app for extra security"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void startEnable();
        }}
        className="flex items-end gap-2"
      >
        <div className="flex-1">
          <label className="mb-1 block text-xs text-muted">
            Confirm your password to begin
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            aria-label="Password"
            className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Enable 2FA
        </button>
      </form>
      {error && <p className="mt-2 text-sm text-negative">{error}</p>}
    </Section>
  );
}
