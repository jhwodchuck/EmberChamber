import type { ReactNode } from "react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export function MarketingShell({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--bg-primary)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[34rem] bg-[radial-gradient(circle_at_top,rgba(234,112,63,0.22),transparent_48%),radial-gradient(circle_at_20%_20%,rgba(255,189,125,0.18),transparent_32%),linear-gradient(180deg,rgba(33,14,11,0.07),transparent_32%)]" />
      <SiteHeader />
      <main id="main-content" className={`relative z-10 ${className}`}>{children}</main>
      <SiteFooter />
    </div>
  );
}
