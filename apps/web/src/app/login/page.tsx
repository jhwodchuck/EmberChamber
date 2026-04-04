import type { Metadata } from "next";
import { AuthPageIntro } from "@/components/auth-page-intro";
import { LoginForm } from "@/components/login-form";
import { MarketingShell } from "@/components/marketing-shell";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Request a private adults-only email magic link for EmberChamber beta access.",
};

export default function LoginPage() {
  return (
    <MarketingShell>
      <section className="mx-auto grid max-w-6xl gap-8 px-6 py-16 sm:py-20 lg:grid-cols-[minmax(0,0.95fr)_28rem] lg:items-start">
        <AuthPageIntro
          eyebrow="Email bootstrap"
          title="Sign in with the private email tied to this account."
          description="Most returning users only need the same private email, an adults-only confirmation, and a readable device name."
          emphasis="If this email was never used for beta access, the form can add an invite token without making you restart."
        />

        <LoginForm />
      </section>
    </MarketingShell>
  );
}
