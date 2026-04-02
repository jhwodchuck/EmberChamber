import type { Metadata } from "next";
import { AuthPageIntro } from "@/components/auth-page-intro";
import { LoginForm } from "@/components/login-form";
import { MarketingShell } from "@/components/marketing-shell";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Request a private email magic link for EmberChamber beta access.",
};

export default function LoginPage() {
  return (
    <MarketingShell>
      <section className="mx-auto grid max-w-6xl gap-8 px-6 py-16 sm:py-20 lg:grid-cols-[minmax(0,0.95fr)_28rem] lg:items-start">
        <AuthPageIntro
          eyebrow="Email bootstrap"
          title="Sign in without turning your identity into a contact graph."
          description="Returning users should only need a private email and a readable device name. If this email has never been used for beta access before, the flow can expand to accept an invite token instead of forcing you to start over."
          emphasis="Same three-step flow across web, desktop, and Android: identify the inbox, name the device, then confirm from the inbox you already control."
        />

        <LoginForm />
      </section>
    </MarketingShell>
  );
}
