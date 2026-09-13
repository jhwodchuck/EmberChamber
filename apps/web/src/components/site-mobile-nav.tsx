"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { authBootstrapEnabled, primaryNav, publicSignInCta } from "@/lib/site";

export function SiteMobileNav() {
  const pathname = usePathname();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const ctaLinks = authBootstrapEnabled
    ? [publicSignInCta, { href: "/start", label: "Join with an invitation" }]
    : [publicSignInCta, { href: "/start", label: "Start Here" }];

  useEffect(() => {
    dialogRef.current?.close();
  }, [pathname]);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const desktop = window.matchMedia("(min-width: 1280px)");
    const closeOnDesktop = () => {
      if (desktop.matches) dialogRef.current?.close();
    };
    desktop.addEventListener("change", closeOnDesktop);
    closeOnDesktop();
    return () => {
      document.body.style.overflow = previousOverflow;
      desktop.removeEventListener("change", closeOnDesktop);
    };
  }, [isOpen]);

  function closeNavigation() {
    dialogRef.current?.close();
  }

  function keepFocusInDialog(event: React.KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== "Tab") return;

    const focusable = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((element) => element.getClientRects().length > 0);

    const first = focusable[0];
    const last = focusable.at(-1);
    if (!first || !last) return;

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label="Open navigation menu"
        aria-controls="site-mobile-nav"
        aria-expanded={isOpen}
        className="btn-ghost px-3 xl:hidden"
        onClick={() => {
          dialogRef.current?.showModal();
          setIsOpen(true);
        }}
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>
      {/* The native modal supplies Escape handling and top-layer rendering.
          The key handler keeps keyboard focus inside the dialog in browsers
          that allow Tab to leave a modal dialog. */}
      <dialog
        ref={dialogRef}
        id="site-mobile-nav"
        aria-label="Site navigation"
        className="m-auto max-h-[85dvh] w-11/12 max-w-md overflow-y-auto overscroll-contain rounded-3xl border border-white/15 bg-[#100c0b] p-6 text-[#fff1e8] shadow-2xl backdrop:bg-black/70 backdrop:backdrop-blur-sm"
        onKeyDown={keepFocusInDialog}
        onClose={() => {
          setIsOpen(false);
          if (triggerRef.current?.getClientRects().length) {
            triggerRef.current.focus();
          }
        }}
      >
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#ffb890]">
            Explore EmberChamber
          </p>
          <button
            type="button"
            aria-label="Close navigation menu"
            className="btn-ghost p-3"
            onClick={closeNavigation}
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <nav className="mt-5 space-y-2" aria-label="Mobile navigation">
          {primaryNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={closeNavigation}
              className="block rounded-xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm font-medium transition-colors hover:bg-white/[0.08]"
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/support"
            onClick={closeNavigation}
            className="block rounded-xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm font-medium transition-colors hover:bg-white/[0.08]"
          >
            Support
          </Link>
        </nav>
        <div className="mt-5 grid gap-3">
          {ctaLinks.map((item, index) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={closeNavigation}
              className={index === 0 ? "btn-ghost" : "btn-primary"}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </dialog>
    </>
  );
}
