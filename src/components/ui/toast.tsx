"use client";

import * as React from "react";
import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "success" | "error" | "info";
type ToastItem = {
  id: number;
  title: string;
  description?: string;
  variant: Variant;
};
type ToastInput = { title: string; description?: string; variant?: Variant };

const ToastContext = createContext<((t: ToastInput) => void) | null>(null);

/** Fire a toast from any client component under <ToastProvider>. */
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    ({ title, description, variant = "info" }: ToastInput) => {
      const id = ++idRef.current;
      setToasts((prev) => [...prev, { id, title, description, variant }]);
      window.setTimeout(() => dismiss(id), 4500);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2">
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

const VARIANTS: Record<Variant, { border: string; icon: React.ReactNode }> = {
  success: {
    border: "border-positive/40",
    icon: <CheckCircle2 className="h-4 w-4 text-positive" />,
  },
  error: {
    border: "border-negative/50",
    icon: <XCircle className="h-4 w-4 text-negative" />,
  },
  info: {
    border: "border-brand-magenta/40",
    icon: <Info className="h-4 w-4 text-brand-magenta" />,
  },
};

function ToastCard({
  toast,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: () => void;
}) {
  const v = VARIANTS[toast.variant];
  return (
    <div
      role="status"
      className={cn(
        "pointer-events-auto flex animate-in items-start gap-3 rounded-xl border bg-surface-2/95 p-3 shadow-2xl backdrop-blur",
        v.border,
      )}
    >
      <span className="mt-0.5 shrink-0">{v.icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{toast.title}</p>
        {toast.description && (
          <p className="mt-0.5 break-words text-xs text-muted">
            {toast.description}
          </p>
        )}
      </div>
      <button
        onClick={onDismiss}
        className="shrink-0 rounded-md p-1 text-dim hover:bg-white/10 hover:text-foreground"
        aria-label="Dismiss notification"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
