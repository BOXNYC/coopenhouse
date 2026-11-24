"use client";
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { AlertIcon, CheckCircleIcon, InfoIcon, XIcon } from "./icons";

type ToastTone = "success" | "error" | "info";
interface ToastItem {
  id: number;
  tone: ToastTone;
  message: string;
  title?: string;
}
interface ToastApi {
  toast: (message: string, opts?: { tone?: ToastTone; title?: string; duration?: number }) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);
  const dismiss = useCallback((id: number) => setItems((l) => l.filter((t) => t.id !== id)), []);
  const toast = useCallback<ToastApi["toast"]>(
    (message, opts = {}) => {
      const id = nextId.current++;
      setItems((l) => [...l.slice(-2), { id, message, tone: opts.tone ?? "info", title: opts.title }]);
      setTimeout(() => dismiss(id), opts.duration ?? 4200);
    },
    [dismiss],
  );
  const api = useMemo<ToastApi>(
    () => ({
      toast,
      success: (m, title) => toast(m, { tone: "success", title }),
      error: (m, title) => toast(m, { tone: "error", title, duration: 6000 }),
      info: (m, title) => toast(m, { tone: "info", title }),
    }),
    [toast],
  );
  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className="pointer-events-auto flex w-full max-w-sm animate-pop-in items-start gap-3 rounded-xl bg-ink px-4 py-3 text-white shadow-pop">
            <span className={cn("mt-0.5", t.tone === "success" && "text-success-600 brightness-150", t.tone === "error" && "text-danger-600 brightness-150", t.tone === "info" && "text-brand-200")}>
              {t.tone === "success" ? <CheckCircleIcon size={18} /> : t.tone === "error" ? <AlertIcon size={18} /> : <InfoIcon size={18} />}
            </span>
            <div className="min-w-0 flex-1 text-sm">
              {t.title && <p className="font-semibold">{t.title}</p>}
              <p className={cn(t.title && "text-white/80")}>{t.message}</p>
            </div>
            <button type="button" onClick={() => dismiss(t.id)} aria-label="Dismiss" className="text-white/60 hover:text-white">
              <XIcon size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
