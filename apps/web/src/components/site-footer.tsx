import Link from "next/link";
import { footerLinks } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--border)] px-6 py-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 text-sm text-[var(--text-secondary)] md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-medium text-[var(--text-primary)]">EmberChamber</p>
          <p className="mt-1">
            Private messaging for the people you trust. Invite-only, end-to-end encrypted.
          </p>
        </div>

        <div className="flex flex-wrap gap-4">
          {footerLinks.map((item) => (
            <Link key={item.href} href={item.href} className="transition-colors hover:text-[var(--text-primary)]">
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
