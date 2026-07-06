"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth/client";
import { Section } from "./section";

export function PasswordSection() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <Section title="Password" description="Change your password">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setLoading(true);
          setError(null);
          setDone(false);
          const { error } = await authClient.changePassword({
            currentPassword: current,
            newPassword: next,
            revokeOtherSessions: true,
          });
          setLoading(false);
          if (error) {
            setError(error.message ?? "Could not change password");
            return;
          }
          setDone(true);
          setCurrent("");
          setNext("");
          window.setTimeout(() => setDone(false), 1500);
        }}
        className="space-y-3"
      >
        {error && <p className="text-sm text-negative">{error}</p>}
        <input
          type="password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          required
          placeholder="Current password"
          aria-label="Current password"
          className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground focus:border-brand-magenta/50 focus:outline-none"
        />
        <input
          type="password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          required
          minLength={8}
          placeholder="New password (min 8 chars)"
          aria-label="New password"
          className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground focus:border-brand-magenta/50 focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {done && <Check className="h-4 w-4" />}
          {done ? "Updated" : "Update password"}
        </button>
      </form>
    </Section>
  );
}
