import Link from "next/link";
import { footerLinks, githubRepoUrl, publicSignInCta } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="px-6 pb-10 pt-14">
      <div className="mx-auto max-w-6xl border-t border-white/10 pt-8">
        <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="max-w-md">
            <p className="text-lg font-semibold text-[#fff1e8]">EmberChamber</p>
            <p className="mt-3 text-sm leading-7 text-[#cbb0a3]">
              Local-first messaging for trusted circles. An invite-only beta
              with native clients, a web companion and documented privacy
              boundaries.
            </p>
            <p className="mt-3 text-sm leading-7 text-[#cbb0a3]">
              A project by Jason Harmon.{" "}
              <a
                href={githubRepoUrl}
                className="text-[#ffb890] underline underline-offset-4"
              >
                Explore the source.
              </a>
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/start" className="btn-primary">
                Start Here
              </Link>
              <Link href={publicSignInCta.href} className="btn-ghost">
                {publicSignInCta.label}
              </Link>
            </div>
          </div>
          <nav
            aria-label="Footer navigation"
            className="grid grid-cols-2 content-start gap-x-6 gap-y-4 text-sm sm:grid-cols-3"
          >
            {footerLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-[#d0b8ab] transition-colors hover:text-[#fff1e8]"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <p className="mt-8 border-t border-white/10 pt-5 text-xs leading-6 text-[#cbb0a3]">
          Beta access requires an invitation and self-attested eligibility for
          adults 18 and older. Product-tour access does not grant access to the
          messaging service.
        </p>
      </div>
    </footer>
  );
}
