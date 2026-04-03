import type { Metadata } from "next";
import { Ban, EyeOff, MessageSquareWarning, ShieldCheck, UserRoundCheck } from "lucide-react";
import { PolicyPage } from "@/components/policy-page";
import { trustFacts } from "@/lib/site";

export const metadata: Metadata = {
  title: "Trust & Safety",
  description:
    "How EmberChamber keeps your conversations private — and the platform healthy for everyone in it.",
};

const attentionCards = [
  {
    icon: MessageSquareWarning,
    title: "Reports are disclosure-based",
    body: "If something crosses the line, you choose the evidence you share. The system is not built around harvesting full private histories by default.",
  },
  {
    icon: UserRoundCheck,
    title: "Invite gating matters",
    body: "The product starts with deliberate circles, not open-network growth. That social boundary reduces a large class of abuse before it starts.",
  },
  {
    icon: Ban,
    title: "Serious abuse still has consequences",
    body: "Severe abuse can lead to session termination, invite revocation, and account bans. Private by design does not mean consequence-free.",
  },
];

const honestyCards = [
  "We do not promise “uncensorable forever.”",
  "We do not promise zero server visibility in an absolute sense.",
  "We do not position EmberChamber as law-enforcement proof or anonymity guaranteed.",
];

export default function TrustAndSafetyPage() {
  return (
    <PolicyPage
      eyebrow="Trust & safety"
      title="Designed to protect your conversations — and keep the platform healthy."
      intro="End-to-end encryption and invite-only access mean your conversations belong to you, not to us. That design still needs clear boundaries, real reporting paths, and honest language about what the platform is and is not."
    >
      <section>
        <div className="section-kicker">Private By Default</div>
        <h2 className="mt-3">Your conversations stay private.</h2>
        <p>
          EmberChamber is built around end-to-end encrypted DMs and small trusted groups. The relay
          routes messages; it does not inspect the content inside them.
        </p>
        <p>
          The product is also adults-only by design. Invite gating, self-attested 18+ onboarding,
          and organizer-controlled spaces mean the people in a circle chose each other deliberately.
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {trustFacts.map((fact) => (
            <div key={fact.title} className="rounded-[1.35rem] border border-white/8 bg-white/[0.04] p-4">
              <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-3 text-brand-400">
                <ShieldCheck aria-hidden="true" className="h-4 w-4" />
              </div>
              <h3 className="mt-4">{fact.title}</h3>
              <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">{fact.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="section-kicker">When Something Needs Attention</div>
        <h2 className="mt-3">Private spaces still need defensible response paths.</h2>
        <p>
          The safety model is built around narrow disclosure, deliberate access, and operator action
          only when something serious is surfaced.
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {attentionCards.map((card) => (
            <div key={card.title} className="rounded-[1.35rem] border border-white/8 bg-white/[0.04] p-4">
              <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-3 text-brand-400">
                <card.icon aria-hidden="true" className="h-4 w-4" />
              </div>
              <h3 className="mt-4">{card.title}</h3>
              <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">{card.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="section-kicker">What We Are Honest About</div>
        <h2 className="mt-3">Trust starts with accurate limits, not inflated claims.</h2>
        <p>
          The strongest privacy position on this site is honesty. If a boundary is still evolving,
          say that plainly instead of borrowing the language of systems with very different threat
          models.
        </p>

        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
          <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.04] p-5">
            <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-3 text-brand-400">
              <EyeOff aria-hidden="true" className="h-4 w-4" />
            </div>
            <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">
              Privacy by design does not mean pretending moderation, abuse handling, or platform
              policy disappear. It means keeping those powers narrow, documented, and tied to real
              problems instead of broad surveillance.
            </p>
          </div>

          <div className="grid gap-3">
            {honestyCards.map((item) => (
              <div key={item} className="rounded-[1.35rem] border border-white/8 bg-white/[0.04] px-4 py-4">
                <p className="text-sm leading-7 text-[var(--text-secondary)]">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="section-kicker">Keeping The Platform Healthy</div>
        <h2 className="mt-3">Healthy does not mean intrusive.</h2>
        <p>
          Invite controls, rate limiting, block rules, and operator response paths exist to keep the
          experience usable for legitimate participants. They are not there to turn private
          conversations into a monitoring product.
        </p>

        <div className="mt-5 rounded-[1.5rem] border border-white/8 bg-white/[0.04] p-5">
          <ul className="space-y-3">
            <li>Invite controls reduce spam and bot abuse before they enter the circle.</li>
            <li>Block rules and revocation paths keep participants in control when trust breaks.</li>
            <li>Operators act on surfaced abuse, not on blanket inspection of private conversations.</li>
          </ul>
        </div>
      </section>
    </PolicyPage>
  );
}
