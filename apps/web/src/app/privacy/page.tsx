import type { Metadata } from "next";
import { PolicyPage } from "@/components/policy-page";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "High-level privacy commitments and data-handling boundaries for the EmberChamber beta.",
};

export default function PrivacyPage() {
  return (
    <PolicyPage
      eyebrow="Privacy"
      title="Privacy-first does not mean hand-wavy."
      intro="This beta policy is a product-facing summary of how EmberChamber is intended to reduce unnecessary centralized visibility while still operating a usable hosted relay."
    >
      <section>
        <h2>Core commitments</h2>
        <ul>
          <li>Email is used for auth and recovery, not public discovery.</li>
          <li>Email is not the social identity inside the product; pseudonymous names and handles are.</li>
          <li>The current beta is adults-only and uses a self-attested 18+ confirmation step.</li>
          <li>The relay should store ciphertext message envelopes, not routine plaintext DM history.</li>
          <li>Message history and local search are intended to live primarily on user devices.</li>
          <li>EmberChamber does not market itself as perfect anonymity, law-proof infrastructure, or zero-visibility hosting.</li>
        </ul>
      </section>

      <section>
        <h2>Metadata that still exists</h2>
        <p>
          A practical relay still needs account, device, session, invitation, and delivery
          metadata to function. The product direction is to keep that set narrow, document it
          honestly, and avoid expanding it into unnecessary behavioral analytics.
        </p>
      </section>

      <section>
        <h2>Search and storage</h2>
        <p>
          Search for private content is planned as a local device capability. The relay should not
          become a searchable archive of private message bodies.
        </p>
      </section>

      <section>
        <h2>Beta caveat</h2>
        <p>
          EmberChamber is still a beta product, not a final audited security product. Current
          production hardening focuses on the relay-first runtime, invite-only onboarding, device
          review, and honest privacy boundaries while the remaining encrypted-group and recovery
          work continues.
        </p>
      </section>
    </PolicyPage>
  );
}
