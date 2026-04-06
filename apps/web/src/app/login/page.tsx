import type { Metadata } from "next";
import { AuthPageIntro } from "@/components/auth-page-intro";
import { LoginForm } from "@/components/login-form";
import { MarketingShell } from "@/components/marketing-shell";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Request a private adults-only email magic link for an existing EmberChamber beta account.",
};

export default async function LoginPage({
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
          eyebrow="Email bootstrap"
          title="Sign in with the private email tied to this account."
          description="Most returning users only need the same private email, an adults-only confirmation, and a browser name they can recognize later."
          emphasis="If this email does not match an existing beta account, the form will stop and switch you into a separate join-beta branch before anything new is created."
        />

        <LoginForm continueTo={continueTo} />
      </section>
    </MarketingShell>
  );
}
