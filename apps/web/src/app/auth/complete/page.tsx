import { Suspense } from "react";
import { AuthCompleteClient } from "@/components/auth-complete-client";
import { MarketingShell } from "@/components/marketing-shell";
import { StatusCallout } from "@/components/status-callout";

export default function AuthCompletePage() {
  return (
    <MarketingShell>
      <section className="mx-auto max-w-3xl px-6 py-20 sm:py-24">
        <div className="panel px-6 py-8 sm:px-8 sm:py-10">
          <div className="eyebrow">Email completion</div>
          <h1 className="mt-5 font-display text-4xl font-semibold text-[var(--text-primary)] sm:text-5xl">
            Finish sign-in for this browser.
          </h1>
          <p className="mt-5 text-base leading-7 text-[var(--text-secondary)]">
            The email link signs in the device that opens it first. If you meant to use another
            phone, browser, or desktop first, open the link there instead.
          </p>

          <Suspense
            fallback={
              <div className="mt-6">
                <StatusCallout tone="info" title="Preparing sign-in">
                  Reading the email link and signing this browser in…
                </StatusCallout>
              </div>
            }
          >
            <AuthCompleteClient />
          </Suspense>
        </div>
      </section>
    </MarketingShell>
  );
}
