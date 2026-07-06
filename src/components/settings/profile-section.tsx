"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth/client";
import { Section } from "./section";

export function ProfileSection({
  name: initialName,
  email,
}: {
  name: string;
  email: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  return (
    <Section title="Profile" description="Your name and email">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setLoading(true);
          setSaved(false);
          const { error } = await authClient.updateUser({ name });
          setLoading(false);
          if (!error) {
            setSaved(true);
            router.refresh();
            window.setTimeout(() => setSaved(false), 1500);
          }
        }}
        className="space-y-3"
      >
        <div>
          <label className="mb-1 block text-xs text-muted">Email</label>
          <input
            value={email}
            disabled
            className="w-full cursor-not-allowed rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-dim"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted" htmlFor="name">
            Name
          </label>
          <input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground focus:border-brand-magenta/50 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={loading || name.trim() === initialName}
          className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {saved && <Check className="h-4 w-4" />}
          {saved ? "Saved" : "Save"}
        </button>
      </form>
    </Section>
  );
}
