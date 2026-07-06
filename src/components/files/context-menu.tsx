"use client";

import * as React from "react";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export type MenuItem =
  | { type: "divider" }
  | {
      type?: "item";
      label: string;
      icon?: React.ReactNode;
      onClick?: () => void;
      href?: string;
      danger?: boolean;
    };

export function ContextMenu({
  x,
  y,
  items,
  onClose,
}: {
  x: number;
  y: number;
  items: MenuItem[];
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onClose, true);
    window.addEventListener("resize", onClose);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onClose, true);
      window.removeEventListener("resize", onClose);
    };
  }, [onClose]);

  // Keep the menu inside the viewport.
  const vw = typeof window !== "undefined" ? window.innerWidth : 1920;
  const vh = typeof window !== "undefined" ? window.innerHeight : 1080;
  const left = Math.min(x, vw - 200);
  const top = Math.min(y, vh - items.length * 34 - 16);

  return (
    <div
      ref={ref}
      style={{ top: Math.max(8, top), left: Math.max(8, left) }}
      className="fixed z-50 min-w-48 overflow-hidden rounded-lg border border-border bg-surface-2 py-1 shadow-2xl"
      role="menu"
    >
      {items.map((item, i) =>
        item.type === "divider" ? (
          <div key={i} className="my-1 h-px bg-border" />
        ) : item.href ? (
          <a
            key={i}
            href={item.href}
            onClick={onClose}
            className={cn(
              "flex items-center gap-2.5 px-3 py-1.5 text-sm",
              item.danger
                ? "text-negative hover:bg-negative/10"
                : "text-foreground hover:bg-white/5",
            )}
            role="menuitem"
          >
            {item.icon}
            {item.label}
          </a>
        ) : (
          <button
            key={i}
            onClick={() => {
              item.onClick?.();
              onClose();
            }}
            className={cn(
              "flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-sm",
              item.danger
                ? "text-negative hover:bg-negative/10"
                : "text-foreground hover:bg-white/5",
            )}
            role="menuitem"
          >
            {item.icon}
            {item.label}
          </button>
        ),
      )}
    </div>
  );
}
