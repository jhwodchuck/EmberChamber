import type { Metadata } from "next";
import { PolicyPage } from "@/components/policy-page";

export const metadata: Metadata = {
  title: "Beta Terms",
  description:
    "Plain-language beta expectations for EmberChamber before broader availability.",
};

export default function BetaTermsPage() {
  return (
    <PolicyPage
      eyebrow="Beta terms"
      title="This beta is for controlled testing, not silent promises."
      intro="The current public site should set expectations clearly: capabilities will change, bugs are expected, and access is invite-only until the trust and recovery model is stronger."
    >
      <section>
        <h2>What beta access means</h2>
        <ul>
          <li>
            Access may be invite-only, delayed, revoked, or reset during
            testing.
          </li>
          <li>
            Features may change quickly as the mobile, desktop, and relay layers
            are hardened.
          </li>
          <li>
            Message history recovery after total device loss is intentionally
            limited in this architecture.
          </li>
        </ul>
      </section>

      <section>
        <h2>Operational limitations</h2>
        <p>
          Early builds may include degraded delivery, incomplete device-linking
          flows, or placeholder onboarding paths while the core secure-state
          logic is still being integrated.
        </p>
      </section>

      <section>
        <h2>Prohibited use</h2>
        <p>
          EmberChamber is not being built as a haven for malware, extortion,
          trafficking, CSAM, non-consensual abuse, impersonation, or platform
          attacks. Private by design does not mean permissive toward clearly
          illegal abuse.
        </p>
      </section>
    </PolicyPage>
  );
}
