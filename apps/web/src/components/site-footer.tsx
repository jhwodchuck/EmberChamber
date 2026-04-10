import Link from "next/link";
import { authBootstrapEnabled, footerLinks } from "@/lib/site";

export function SiteFooter() {
  const secondaryCta = authBootstrapEnabled
    ? { href: "/login", label: "Return to Sign In" }
    : { href: "/download", label: "View Launch Targets" };

  return (
    <footer className="px-6 pb-10 pt-16 sm:pt-20">
      <div className="mx-auto max-w-6xl">
        <div className="section-spotlight relative overflow-hidden rounded-[2.25rem] px-6 py-8 sm:px-8 sm:py-10">
          <div
            className="pointer-events-none absolute inset-y-0 right-0 w-72 bg-[radial-gradient(circle_at_center,rgba(255,170,110,0.14),transparent_62%)]"
            aria-hidden="true"
          />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="section-kicker">Private by design</p>
              <h2 className="mt-4 text-balance font-display text-4xl font-semibold text-[#fff1e8] sm:text-5xl">
                Build a quieter place for the people you actually trust.
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-[#cbb0a3] sm:text-base">
                Invite-only access, device-local DM history, and a relay kept
                narrow enough to avoid becoming the default archive while older
                compatibility paths are retired.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href="/start" className="btn-primary">
                Start Here
              </Link>
              <Link href={secondaryCta.href} className="btn-ghost">
                {secondaryCta.label}
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-5 border-t border-white/10 pt-6 text-sm text-[var(--text-secondary)] md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <p className="font-medium text-[var(--text-primary)]">
              EmberChamber
            </p>
            <p className="mt-2 leading-6 text-[#b89690]">
              Private messaging for the people you trust. Invite-only,
              privacy-first, and built so more of your history stays with you
              instead of becoming the service&apos;s default archive.
            </p>
          </div>

          <div className="flex flex-wrap gap-x-5 gap-y-3">
            {footerLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="transition-colors hover:text-[var(--text-primary)]"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
