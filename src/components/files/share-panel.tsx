"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Link2, Loader2, Lock, Plus, Trash2 } from "lucide-react";
import {
  createShareLink,
  getFileShares,
  revokeShare,
} from "@/lib/sharing/actions";
import type { ShareLinkDTO } from "@/lib/sharing/queries";

export function SharePanel({ fileId }: { fileId: string }) {
  const [shares, setShares] = useState<ShareLinkDTO[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [password, setPassword] = useState("");
  const [expiry, setExpiry] = useState("0");
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getFileShares(fileId)
      .then((s) => {
        if (active) setShares(s);
      })
      .catch(() => {
        if (active) setShares([]);
      });
    return () => {
      active = false;
    };
  }, [fileId]);

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  async function create() {
    setCreating(true);
    try {
      const link = await createShareLink(fileId, {
        password: password.trim() || undefined,
        expiresInDays: Number(expiry) || undefined,
      });
      setShares((s) => [link, ...(s ?? [])]);
      setShowForm(false);
      setPassword("");
      setExpiry("0");
    } finally {
      setCreating(false);
    }
  }

  async function revoke(id: string) {
    setShares((s) => (s ?? []).filter((x) => x.id !== id));
    await revokeShare(id).catch(() => {});
  }

  async function copy(token: string) {
    try {
      await navigator.clipboard.writeText(`${origin}/s/${token}`);
      setCopied(token);
      window.setTimeout(() => setCopied(null), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <div className="mt-6">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-medium uppercase tracking-wide text-dim">
          Share links
        </h3>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-brand-magenta hover:bg-white/5"
          >
            <Plus className="h-3.5 w-3.5" /> New link
          </button>
        )}
      </div>

      {showForm && (
        <div className="mb-3 space-y-2 rounded-lg border border-border bg-surface-2 p-3">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password (optional)"
            aria-label="Link password"
            className="w-full rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs text-foreground focus:border-brand-magenta/50 focus:outline-none"
          />
          <select
            value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
            aria-label="Link expiry"
            className="w-full rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs text-foreground focus:outline-none"
          >
            <option value="0">Never expires</option>
            <option value="1">Expires in 1 day</option>
            <option value="7">Expires in 7 days</option>
            <option value="30">Expires in 30 days</option>
          </select>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowForm(false)}
              className="rounded-md px-2 py-1 text-xs text-muted hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              onClick={create}
              disabled={creating}
              className="inline-flex items-center gap-1 rounded-md bg-brand px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
            >
              {creating && <Loader2 className="h-3 w-3 animate-spin" />}
              Create
            </button>
          </div>
        </div>
      )}

      {shares === null ? (
        <div className="flex items-center gap-2 py-2 text-xs text-dim">
          <Loader2 className="h-3 w-3 animate-spin" /> loading…
        </div>
      ) : shares.length === 0 ? (
        !showForm && <p className="py-2 text-xs text-dim">No share links yet.</p>
      ) : (
        <ul className="space-y-2">
          {shares.map((s) => (
            <li
              key={s.id}
              className="rounded-lg border border-border bg-surface-2 p-2.5"
            >
              <div className="flex items-center gap-2">
                <Link2 className="h-3.5 w-3.5 shrink-0 text-brand-magenta" />
                <span className="truncate font-mono text-[11px] text-muted">
                  /s/{s.token.slice(0, 12)}…
                </span>
                <div className="ml-auto flex items-center gap-0.5">
                  <button
                    onClick={() => copy(s.token)}
                    className="rounded p-1 text-dim hover:bg-white/10 hover:text-foreground"
                    aria-label="Copy link"
                  >
                    {copied === s.token ? (
                      <Check className="h-3.5 w-3.5 text-positive" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <button
                    onClick={() => revoke(s.id)}
                    className="rounded p-1 text-dim hover:bg-white/10 hover:text-negative"
                    aria-label="Revoke link"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div className="mt-1 flex items-center gap-2 pl-5 text-[10px] text-dim">
                {s.hasPassword && (
                  <span className="inline-flex items-center gap-0.5">
                    <Lock className="h-2.5 w-2.5" /> password
                  </span>
                )}
                <span>
                  {s.expiresAt
                    ? `expires ${new Date(s.expiresAt).toLocaleDateString()}`
                    : "never expires"}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
