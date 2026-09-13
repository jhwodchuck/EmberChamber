"use client";

import { useSearchParams } from "next/navigation";
import { AuthPageIntro } from "@/components/auth-page-intro";
import { MarketingShell } from "@/components/marketing-shell";
import { RegisterForm } from "@/components/register-form";

export default function RegisterPageClient() {
  const searchParams = useSearchParams();
  const continueTo = searchParams?.get("next") ?? null;

  return (
    <MarketingShell>
      <section className="mx-auto grid max-w-6xl gap-8 px-6 py-16 sm:py-20 lg:grid-cols-[minmax(0,0.95fr)_28rem] lg:items-start">
        <AuthPageIntro
          eyebrow="Invite-only onboarding"
          title="Join the beta with an invite and a private inbox."
          description="New accounts need a trusted invite path, a private email, and an eligibility confirmation."
          emphasis="Confirm access, name this browser so you can recognize it later, then open the email link on the device you want to use first."
        />

        <RegisterForm continueTo={continueTo} />
      </section>
    </MarketingShell>
  );
}
