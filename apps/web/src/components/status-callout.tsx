import type { ReactNode } from "react";
import { clsx } from "clsx";

const toneStyles = {
  error: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-200",
  info: "border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-secondary)]",
  success: "border-brand-500/20 bg-brand-500/5 text-[var(--text-secondary)]",
  warning: "border-amber-500/30 bg-amber-500/10 text-[var(--text-secondary)]",
} as const;

export function StatusCallout({
  title,
  children,
  action,
  tone = "info",
  className,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
  tone?: keyof typeof toneStyles;
  className?: string;
}) {
  const isError = tone === "error";

  return (
    <div
      role={isError ? "alert" : "status"}
      aria-live={isError ? "assertive" : "polite"}
      className={clsx("rounded-[1.35rem] border p-4 text-sm", toneStyles[tone], className)}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-medium text-[var(--text-primary)]">{title}</p>
          <div className="mt-1 leading-6">{children}</div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </div>
  );
}
