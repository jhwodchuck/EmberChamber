"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { authBootstrapEnabled, primaryNav, publicSignInCta } from "@/lib/site";

export function SiteMobileNav() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const ctaLinks = authBootstrapEnabled
    ? [
        publicSignInCta,
        { href: "/start", label: "Join Beta" },
      ]
    : [publicSignInCta, { href: "/download", label: "View Downloads" }];

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  return (
    <>
      <button
        type="button"
        aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
        aria-controls="site-mobile-nav"
        aria-expanded={isOpen}
        className="btn-ghost px-3 md:hidden"
        onClick={() => setIsOpen((current) => !current)}
      >
        {isOpen ? (
          <X className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Menu className="h-4 w-4" aria-hidden="true" />
        )}
      </button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-50 md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Site navigation"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/55 backdrop-blur-sm"
            aria-label="Close navigation menu"
            onClick={() => setIsOpen(false)}
          />
          <div
            id="site-mobile-nav"
            className="absolute inset-x-4 top-4 overscroll-contain rounded-[2rem] border border-white/10 bg-[rgba(13,8,9,0.94)] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.42)]"
          >
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#ffb890]">
                Navigate
              </p>
              <button
                type="button"
                aria-label="Close navigation menu"
                className="rounded-full border border-white/10 bg-white/[0.04] p-2 text-[#ecd9ce] transition-[border-color,background-color,color] hover:border-white/20 hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <nav className="mt-5 space-y-2" aria-label="Primary">
              {primaryNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center justify-between rounded-[1.25rem] border border-white/8 bg-white/[0.04] px-4 py-3 text-sm font-medium text-[#fff1e8] transition-[border-color,background-color,transform] hover:border-brand-500/30 hover:bg-white/[0.07] hover:translate-y-[-1px]"
                >
                  <span>{item.label}</span>
                  <span className="text-[#b9968f]">/</span>
                </Link>
              ))}
            </nav>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {ctaLinks.map((item, index) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={index === 0 ? "btn-ghost" : "btn-primary"}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
