import Image from "next/image";
import Link from "next/link";
import { SiteMobileNav } from "@/components/site-mobile-nav";
import { primaryNav, publicSignInCta } from "@/lib/site";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 px-4 pt-4 sm:px-6">
      <nav
        aria-label="Main navigation"
        className="mx-auto flex max-w-6xl items-center justify-between gap-3 rounded-3xl border border-white/10 bg-[rgba(13,8,9,0.86)] px-4 py-3 shadow-[0_12px_36px_rgba(0,0,0,0.2)] backdrop-blur-xl sm:px-5"
      >
        <Link
          href="/"
          aria-label="EmberChamber home"
          className="flex shrink-0 items-center gap-2 sm:gap-3"
        >
          <Image
            src="/brand/emberchamber-mark.svg"
            alt=""
            width={36}
            height={36}
            priority
          />
          <Image
            src="/brand/emberchamber-wordmark.svg"
            alt=""
            width={232}
            height={47}
            className="h-auto w-[128px] sm:w-[180px]"
          />
        </Link>
        <div className="hidden items-center gap-1 xl:flex">
          {primaryNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-3 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-white/[0.05] hover:text-[var(--text-primary)]"
            >
              {item.label}
            </Link>
          ))}
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <SiteMobileNav />
          <Link
            href={publicSignInCta.href}
            className="btn-ghost hidden sm:inline-flex"
          >
            {publicSignInCta.label}
          </Link>
          <Link
            href="/start"
            className="btn-primary hidden px-5 sm:inline-flex"
          >
            Start Here
          </Link>
        </div>
      </nav>
    </header>
  );
}
