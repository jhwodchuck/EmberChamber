import Image from "next/image";
import Link from "next/link";
import { authBootstrapEnabled, primaryNav } from "@/lib/site";

export function SiteHeader() {
  const secondaryCta = authBootstrapEnabled
    ? { href: "/login", label: "Request magic link" }
    : { href: "/download", label: "View launch targets" };
  const primaryCta = authBootstrapEnabled
    ? { href: "/register", label: "Join beta" }
    : { href: "/trust-and-safety", label: "Read trust model" };

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[color:var(--bg-overlay)]/85 px-6 py-4 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4">
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
            className="h-auto w-[168px] sm:w-[208px]"
          />
        </Link>

        <div className="hidden items-center gap-6 md:flex">
          {primaryNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Link href={secondaryCta.href} className="btn-ghost hidden sm:inline-flex">
            {secondaryCta.label}
          </Link>
          <Link href={primaryCta.href} className="btn-primary">
            {primaryCta.label}
          </Link>
        </div>
      </nav>
    </header>
  );
}
