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
            Finish browser access deliberately.
          </h1>
          <p className="mt-5 text-base leading-7 text-[var(--text-secondary)]">
            The same email link confirms this browser session and keeps the web companion aligned
            with the Android and desktop beta path.
          </p>

          <Suspense
            fallback={
              <div className="mt-6">
                <StatusCallout tone="info" title="Preparing browser session">
                  Reading the completion token and finishing the relay session setup…
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
