import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "flex h-10 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-neutral-100 shadow-sm transition-colors placeholder:text-neutral-500 focus-visible:border-fuchsia-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500/50 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
