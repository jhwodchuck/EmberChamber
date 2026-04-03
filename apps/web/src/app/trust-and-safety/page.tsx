import type { Metadata } from "next";
import { PolicyPage } from "@/components/policy-page";

export const metadata: Metadata = {
  title: "Trust & Safety",
  description:
    "How EmberChamber keeps your conversations private — and the platform healthy for everyone in it.",
};

export default function TrustAndSafetyPage() {
  return (
    <PolicyPage
      eyebrow="Trust & safety"
      title="Designed to protect your conversations — and keep the platform healthy."
      intro="End-to-end encryption and invite-only access mean your conversations belong to you, not to us. That design comes with real responsibilities — ours and yours."
    >
      <section>
        <h2>Your conversations stay private</h2>
        <p>
          The model is end-to-end encrypted DMs and small groups. Only participants can read them.
          The relay routes messages — it does not inspect their content.
        </p>
        <p>
          EmberChamber is adults-only. That isn&apos;t a compliance checkbox — it&apos;s a social
          design choice. Invite gating, self-attested 18+ onboarding, and organizer-controlled
          spaces mean the people in a circle chose each other deliberately.
        </p>
      </section>

      <section>
        <h2>When something needs attention</h2>
        <ul>
          <li>User reports are the primary way serious issues surface in private spaces.</li>
          <li>Reports are disclosure-based — you share selected evidence, not your full message history.</li>
          <li>Severe abuse can result in account bans, invite revocation, and session termination.</li>
        </ul>
      </section>

      <section>
        <h2>What we&apos;re honest about</h2>
        <ul>
          <li>We don&apos;t promise &ldquo;uncensorable forever.&rdquo; That&apos;s not what this is.</li>
          <li>We don&apos;t promise zero server visibility in an absolute sense.</li>
          <li>We don&apos;t position EmberChamber as law-enforcement proof or anonymity guaranteed.</li>
        </ul>
      </section>

      <section>
        <h2>Keeping the platform healthy</h2>
        <p>
          Invite controls, rate limiting, and block rules protect the platform from spam, bot
          abuse, and coordinated attacks. These exist to keep the experience good for everyone
          with legitimate access — not to surveil private conversations.
        </p>
      </section>
    </PolicyPage>
  );
}
