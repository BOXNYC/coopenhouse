import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const control =
  "w-full rounded-xl border bg-surface px-3.5 text-[15px] text-ink placeholder:text-muted/70 transition focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 disabled:bg-ink/5";

export function Field({ label, hint, error, optional, children, className, htmlFor }: { label?: string; hint?: string; error?: string; optional?: boolean; children: ReactNode; className?: string; htmlFor?: string }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <label htmlFor={htmlFor} className="flex items-baseline justify-between text-sm font-medium text-ink">
          {label}
          {optional && <span className="text-xs font-normal text-muted">Optional</span>}
        </label>
      )}
      {children}
      {error ? <p className="text-xs text-danger-600">{error}</p> : hint ? <p className="text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
  /** Leading adornment, e.g. "$". */
  leading?: ReactNode;
}
export function Input({ invalid, leading, className, ...rest }: InputProps) {
  const el = <input className={cn(control, "h-11", invalid ? "border-danger-600" : "border-line-strong", !!leading && "pl-8", className)} {...rest} />;
  if (!leading) return el;
  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-muted">{leading}</span>
      {el}
    </div>
  );
}

export function Textarea({ invalid, className, rows = 3, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return <textarea rows={rows} className={cn(control, "py-2.5 leading-relaxed", invalid ? "border-danger-600" : "border-line-strong", className)} {...rest} />;
}

export function Select({ invalid, className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return (
    <select className={cn(control, "h-11 appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2216%22 height=%2216%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%236b7f86%22 stroke-width=%222%22 stroke-linecap=%22round%22><path d=%22M5 9l7 7 7-7%22/></svg>')] bg-[length:16px] bg-[right_0.9rem_center] bg-no-repeat pr-9", invalid ? "border-danger-600" : "border-line-strong", className)} {...rest}>
      {children}
    </select>
  );
}

/** Convenience: label + generated id wired to a single control. */
export function LabeledInput({ label, hint, error, optional, ...rest }: InputProps & { label: string; hint?: string; error?: string; optional?: boolean }) {
  const id = useId();
  return (
    <Field label={label} hint={hint} error={error} optional={optional} htmlFor={id}>
      <Input id={id} invalid={!!error} {...rest} />
    </Field>
  );
}
