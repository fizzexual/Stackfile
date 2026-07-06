"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Tag as TagIcon, X } from "lucide-react";
import {
  addTagToFile,
  getTagsForFile,
  removeTagFromFile,
  type TagDTO,
} from "@/lib/tags/actions";

export function TagsPanel({ fileId }: { fileId: string }) {
  const [tags, setTags] = useState<TagDTO[] | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    getTagsForFile(fileId)
      .then((t) => active && setTags(t))
      .catch(() => active && setTags([]));
    return () => {
      active = false;
    };
  }, [fileId]);

  async function add() {
    const name = input.trim();
    if (!name) return;
    setBusy(true);
    try {
      const t = await addTagToFile(fileId, name);
      setTags((prev) => [...(prev ?? []).filter((x) => x.id !== t.id), t]);
      setInput("");
    } finally {
      setBusy(false);
    }
  }

  async function remove(tagId: string) {
    setTags((prev) => (prev ?? []).filter((x) => x.id !== tagId));
    await removeTagFromFile(fileId, tagId).catch(() => {});
  }

  return (
    <div className="mt-6">
      <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-dim">
        Tags
      </h3>
      <div className="flex flex-wrap gap-1.5">
        {tags === null ? (
          <Loader2 className="h-3 w-3 animate-spin text-dim" />
        ) : (
          tags.map((t) => (
            <span
              key={t.id}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-2 px-2 py-0.5 text-xs text-foreground"
            >
              <TagIcon className="h-3 w-3 text-brand-magenta" />
              {t.name}
              <button
                onClick={() => remove(t.id)}
                className="text-dim hover:text-negative"
                aria-label={`Remove tag ${t.name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))
        )}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void add();
        }}
        className="mt-2 flex gap-1.5"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Add a tag…"
          aria-label="Add a tag"
          className="flex-1 rounded-md border border-border bg-surface-2 px-2 py-1 text-xs text-foreground focus:border-brand-magenta/40 focus:outline-none"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-md border border-border px-2 py-1 text-xs text-muted hover:text-foreground disabled:opacity-50"
          aria-label="Add tag"
        >
          {busy ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Plus className="h-3 w-3" />
          )}
        </button>
      </form>
    </div>
  );
}
