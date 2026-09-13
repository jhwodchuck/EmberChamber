import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";
import { MarketingShell } from "@/components/marketing-shell";
import { createMetadata } from "@/lib/metadata";

export const metadata = createMetadata({
  title: "Product Tour",
  path: "/tour",
  description:
    "Explore selected EmberChamber beta screens without creating an account. See invite review, post-onboarding settings, and messaging, then inspect the engineering behind the product.",
});

const chapters = [
  {
    id: "invites",
    number: "01",
    title: "Review an invitation",
    description:
      "Joining begins with an invitation rather than a public people directory. The preview identifies the invited space, who issued the link, and the access rules before account setup.",
    state: "A signed-out visitor is reviewing an invitation.",
    action: "Choose whether to begin the protected join process.",
    next: "Accepting continues to eligibility confirmation, email bootstrap, and device setup.",
    image: "/screenshots/home/01-public-invite-preview.png",
    width: 1280,
    height: 1470,
    alt: "EmberChamber beta invitation preview before joining",
  },
  {
    id: "profile",
    number: "02",
    title: "Review profile and recovery settings",
    description:
      "After onboarding, the signed-in settings workspace keeps profile, privacy, session, and recovery controls together without creating a public identity page.",
    state: "The account and device are set up, and the profile has been saved.",
    action: "Review or update the private profile and account controls.",
    next: "Return to the workspace to start or continue a conversation.",
    image: "/screenshots/home/03-profile-created.png",
    width: 1280,
    height: 1042,
    alt: "EmberChamber beta settings screen after profile creation",
  },
  {
    id: "messages",
    number: "03",
    title: "Start a conversation",
    description:
      "The web companion provides a conversation workspace alongside the native clients. This capture shows the interface after a first message; it is not a live chat or a test of encryption.",
    state: "A signed-in member has opened a direct conversation.",
    action: "Write and send a message from the browser workspace.",
    next: "Conversation history and private-content search remain device-local.",
    image: "/screenshots/home/04-first-message-sent.png",
    width: 1280,
    height: 1068,
    alt: "EmberChamber beta messaging workspace after sending a first message",
  },
];

export default function ProductTourPage() {
  return (
    <MarketingShell>
      <section className="px-6 pb-12 pt-14 sm:pt-20">
        <div className="mx-auto max-w-6xl">
          <p className="section-kicker">Product tour · No sign-up required</p>
          <h1 className="mt-5 max-w-3xl text-balance font-display text-5xl font-semibold leading-[1.08] text-[#fff1e8] sm:text-6xl">
            See how EmberChamber works.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-[#d0b8ab]">
            Three selected screens show the beta web interface from invitation
            preview to the signed-in workspace. No account, installation, or
            invitation is needed to view them.
          </p>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[#cbb0a3]">
            Required onboarding happens between the first and second captures:
            invite acceptance, self-attested 18+ eligibility, email bootstrap,
            and device setup. These are product screenshots, not an interactive
            demo, and may differ from the latest build.
          </p>
          <nav aria-label="Tour chapters" className="mt-8 flex flex-wrap gap-3">
            {chapters.map((chapter) => (
              <a key={chapter.id} href={`#${chapter.id}`} className="btn-ghost">
                <span className="mr-2 text-[#ffb890]">{chapter.number}</span>
                {chapter.title}
              </a>
            ))}
          </nav>
        </div>
      </section>
      <div className="px-6">
        <div className="mx-auto max-w-6xl">
          {chapters.map((chapter, index) => (
            <section
              key={chapter.id}
              id={chapter.id}
              className="grid scroll-mt-28 gap-8 border-t border-white/10 py-12 lg:grid-cols-[0.7fr_1.3fr] lg:gap-12"
            >
              <div>
                <p className="section-kicker">Step {chapter.number}</p>
                <h2 className="mt-4 font-display text-4xl font-semibold text-[#fff1e8]">
                  {chapter.title}
                </h2>
                <p className="mt-5 leading-8 text-[#d0b8ab]">
                  {chapter.description}
                </p>
                <dl className="mt-6 space-y-4 border-l border-white/10 pl-5 text-sm leading-6">
                  <div>
                    <dt className="font-medium text-[#ffb890]">
                      Current state
                    </dt>
                    <dd className="mt-1 text-[#cbb0a3]">{chapter.state}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-[#ffb890]">
                      Primary action
                    </dt>
                    <dd className="mt-1 text-[#cbb0a3]">{chapter.action}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-[#ffb890]">What follows</dt>
                    <dd className="mt-1 text-[#cbb0a3]">{chapter.next}</dd>
                  </div>
                </dl>
                <a
                  href={chapter.image}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-[#ffb890] underline underline-offset-4"
                >
                  Open full-size {chapter.title.toLowerCase()} screen
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </div>
              <figure className="min-w-0 overflow-hidden rounded-3xl border border-white/15 bg-[#130e0d]">
                <Image
                  src={chapter.image}
                  alt={chapter.alt}
                  width={chapter.width}
                  height={chapter.height}
                  sizes="(min-width: 1024px) 720px, 100vw"
                  priority={index === 0}
                  className="h-auto w-full"
                />
                <figcaption className="border-t border-white/10 px-5 py-4 text-sm leading-6 text-[#cbb0a3]">
                  {chapter.title} · Captured beta web interface
                </figcaption>
              </figure>
            </section>
          ))}
        </div>
      </div>
      <section className="px-6 pb-10 pt-6">
        <div className="mx-auto max-w-6xl rounded-3xl border border-white/10 bg-white/[0.03] p-7 sm:p-10">
          <h2 className="font-display text-4xl font-semibold text-[#fff1e8]">
            Next, look under the hood.
          </h2>
          <p className="mt-4 max-w-2xl leading-8 text-[#d0b8ab]">
            See how device-local state, a delivery relay, and multiple clients
            fit together. The case study includes source links and the tradeoffs
            still being worked through.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/engineering" className="btn-primary">
              Read the engineering case study
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Link>
            <Link href="/download" className="btn-ghost">
              View native downloads
            </Link>
            <Link href="/start" className="btn-ghost">
              Join with an invitation
            </Link>
          </div>
          <p className="mt-5 text-sm leading-7 text-[#cbb0a3]">
            Before using the beta, review its{" "}
            <Link
              href="/trust-and-safety"
              className="text-[#ffb890] underline underline-offset-4"
            >
              privacy and recovery boundaries
            </Link>
            .
          </p>
        </div>
      </section>
    </MarketingShell>
  );
}
