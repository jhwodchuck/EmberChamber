import Image from "next/image";
import Link from "next/link";
import { SiteMobileNav } from "@/components/site-mobile-nav";
import { authBootstrapEnabled, primaryNav } from "@/lib/site";

export function SiteHeader() {
  const secondaryCta = authBootstrapEnabled
    ? { href: "/login", label: "Sign In" }
    : { href: "/download", label: "View Downloads" };
  const primaryCta = { href: "/start", label: "Start Here" };

  return (
    <header className="sticky top-0 z-40 px-4 pt-4 sm:px-6">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 rounded-[1.8rem] border border-white/10 bg-[rgba(13,8,9,0.74)] px-4 py-3 shadow-[0_18px_48px_rgba(0,0,0,0.28)] backdrop-blur-xl sm:px-5">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/brand/emberchamber-mark.svg"
            alt="EmberChamber mark"
            width={40}
            height={40}
            priority
          />
          <Image
            src="/brand/emberchamber-wordmark.svg"
            alt="EmberChamber"
            width={232}
            height={47}
            className="h-auto w-[160px] sm:w-[204px]"
          />
        </Link>

        <div className="hidden items-center gap-2 rounded-full border border-white/8 bg-white/[0.03] p-1 md:flex">
          {primaryNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-3 py-2 text-sm font-medium text-[var(--text-secondary)] transition-[background-color,color] hover:bg-white/[0.05] hover:text-[var(--text-primary)]"
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <SiteMobileNav />
          <Link href={secondaryCta.href} className="btn-ghost hidden sm:inline-flex">
            {secondaryCta.label}
          </Link>
          <Link href={primaryCta.href} className="btn-primary px-5">
            {primaryCta.label}
          </Link>
        </div>
      </nav>
    </header>
  );
}
