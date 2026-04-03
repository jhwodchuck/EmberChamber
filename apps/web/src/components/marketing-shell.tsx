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
    <div className="marketing-shell dark relative min-h-screen overflow-hidden bg-[var(--bg-primary)]">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[40rem] bg-[radial-gradient(circle_at_top,rgba(255,191,146,0.18),transparent_32%),radial-gradient(circle_at_15%_18%,rgba(234,112,63,0.22),transparent_18%),radial-gradient(circle_at_85%_18%,rgba(255,210,158,0.08),transparent_18%)]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-y-0 left-[-12%] w-[32rem] rounded-full bg-[radial-gradient(circle,rgba(234,112,63,0.12),transparent_65%)] blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-[-14%] w-[34rem] rounded-full bg-[radial-gradient(circle,rgba(255,198,137,0.08),transparent_65%)] blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 surface-grid-dark opacity-[0.08] [mask-image:linear-gradient(180deg,rgba(0,0,0,0.7),transparent_72%)]"
        aria-hidden="true"
      />
      <SiteHeader />
      <main id="main-content" className={`relative z-10 ${className}`}>
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
