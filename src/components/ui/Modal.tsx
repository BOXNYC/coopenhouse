"use client";
import { useEffect, useId, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import { XIcon } from "./icons";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  /** Sticky footer, usually action buttons. */
  footer?: ReactNode;
  /** 'auto' = bottom sheet on mobile, centered dialog on desktop. */
  variant?: "auto" | "sheet" | "center";
}

export function Modal({ open, onClose, title, description, children, footer, variant = "auto" }: ModalProps) {
  const titleId = useId();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;
  const sheet = variant === "sheet";
  const center = variant === "center";
  return createPortal(
    <div className={cn("fixed inset-0 z-50 flex justify-center", center ? "items-center p-4" : sheet ? "items-end" : "items-end md:items-center md:p-4")}>
      <div className="absolute inset-0 bg-black/50 animate-fade-in" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        className={cn(
          "relative flex max-h-[90dvh] w-full flex-col bg-surface shadow-pop",
          center ? "max-w-md rounded-2xl animate-pop-in" : sheet ? "max-w-xl rounded-t-3xl animate-sheet-up" : "max-w-xl rounded-t-3xl animate-sheet-up md:max-w-md md:rounded-2xl md:animate-pop-in",
        )}
      >
        {!center && <div className={cn("mx-auto mt-2 h-1 w-10 rounded-full bg-line-strong", !sheet && "md:hidden")} />}
        <div className="flex items-start justify-between gap-3 px-5 pt-4">
          <div>
            {title && (
              <h2 id={titleId} className="text-lg font-semibold text-ink">
                {title}
              </h2>
            )}
            {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="-mr-2 rounded-full p-2 text-muted hover:bg-ink/5">
            <XIcon size={18} />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="pb-safe border-t border-line px-5 py-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

export function BottomSheet(props: Omit<ModalProps, "variant">) {
  return <Modal {...props} variant="sheet" />;
}
