"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

export function TopbarSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const t = q.trim();
        if (t) router.push(`/search?q=${encodeURIComponent(t)}`);
      }}
      className="hidden md:block"
    >
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-dim" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search files…"
          aria-label="Search files"
          className="w-56 rounded-lg border border-border bg-surface-2 py-1.5 pl-8 pr-3 text-sm text-foreground placeholder:text-dim focus:border-brand-magenta/40 focus:outline-none"
        />
      </div>
    </form>
  );
}
