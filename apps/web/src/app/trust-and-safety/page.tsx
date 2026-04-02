import type { Metadata } from "next";
import { PolicyPage } from "@/components/policy-page";

export const metadata: Metadata = {
  title: "Trust & Safety",
  description:
    "How EmberChamber intends to balance private encrypted messaging with anti-abuse boundaries.",
};

export default function TrustAndSafetyPage() {
  return (
    <PolicyPage
      eyebrow="Trust & safety"
      title="Private messaging still needs defensible abuse boundaries."
      intro="EmberChamber is being designed to reduce unnecessary centralized visibility without turning the product into a platform for clearly illegal abuse or infrastructure attacks."
    >
      <section>
        <h2>Private conversations</h2>
        <p>
          The target model is end-to-end encrypted DMs and small groups. Those conversations should
          not be subject to routine blanket inspection by the relay.
        </p>
        <p>
          The current beta is also adults-only. That boundary is enforced through invite gating,
          self-attested 18+ onboarding, and organizer-controlled spaces rather than public discovery.
        </p>
      </section>

      <section>
        <h2>How abuse review is expected to work</h2>
        <ul>
          <li>User reports are the primary trigger for review in private spaces.</li>
          <li>Reports should be disclosure-based, revealing selected evidence rather than unrelated history.</li>
          <li>Account bans, invite revocation, session revocation, and rate limiting are platform-level controls for severe abuse.</li>
        </ul>
      </section>

      <section>
        <h2>What EmberChamber does not claim</h2>
        <ul>
          <li>No promise of “uncensorable forever.”</li>
          <li>No promise of “no monitoring” in an absolute sense.</li>
          <li>No framing as law-enforcement proof or anonymity guaranteed.</li>
        </ul>
      </section>

      <section>
        <h2>Platform protection</h2>
        <p>
          The relay and clients still need throttling, block rules, invite controls, and platform
          protection against spam, bot abuse, malware distribution, and coordinated attacks.
        </p>
      </section>
    </PolicyPage>
  );
}
