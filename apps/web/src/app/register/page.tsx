import type { Metadata } from "next";
import { AuthPageIntro } from "@/components/auth-page-intro";
import { MarketingShell } from "@/components/marketing-shell";
import { RegisterForm } from "@/components/register-form";

export const metadata: Metadata = {
  title: "Join Beta",
  description: "Start adults-only invite-only EmberChamber beta onboarding with a private email bootstrap.",
};

export default function RegisterPage() {
  return (
    <MarketingShell>
      <section className="mx-auto grid max-w-6xl gap-8 px-6 py-16 sm:py-20 lg:grid-cols-[minmax(0,0.95fr)_28rem] lg:items-start">
        <AuthPageIntro
          eyebrow="Adults-only onboarding"
          title="Join the beta deliberately, not through public discovery."
          description="New accounts still require a trusted invite path, a private email bootstrap, and a clearly named first device. The beta is tuned for trusted circles, not open-network growth mechanics."
          emphasis="The first-run path stays intentionally short: adults-only affirmation, invite, inbox, then device confirmation. Pseudonymous identity setup and passkeys can follow later."
        />

        <RegisterForm />
      </section>
    </MarketingShell>
  );
}
