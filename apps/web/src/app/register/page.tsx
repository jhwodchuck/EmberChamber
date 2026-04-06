import type { Metadata } from "next";
import { AuthPageIntro } from "@/components/auth-page-intro";
import { MarketingShell } from "@/components/marketing-shell";
import { RegisterForm } from "@/components/register-form";

export const metadata: Metadata = {
  title: "Join Beta",
  description: "Start adults-only invite-only EmberChamber beta onboarding with a private email bootstrap.",
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams?: Promise<{ next?: string | string[] }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const continueTo =
    typeof resolvedSearchParams?.next === "string" ? resolvedSearchParams.next : null;

  return (
    <MarketingShell>
      <section className="mx-auto grid max-w-6xl gap-8 px-6 py-16 sm:py-20 lg:grid-cols-[minmax(0,0.95fr)_28rem] lg:items-start">
        <AuthPageIntro
          eyebrow="Adults-only onboarding"
          title="Join the beta with an invite and a private inbox."
          description="New accounts still need a trusted invite path, a private email, and an adults-only confirmation."
          emphasis="Confirm access, name this browser so you can recognize it later, then open the email link on the device you want to use first."
        />

        <RegisterForm continueTo={continueTo} />
      </section>
    </MarketingShell>
  );
}
