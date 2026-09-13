import Image from "next/image";
import Link from "next/link";
import { ArrowRight, LockKeyhole, MonitorSmartphone, Users } from "lucide-react";
import { JsonLd } from "@/components/json-ld";
import { MarketingShell } from "@/components/marketing-shell";
import { createMetadata } from "@/lib/metadata";
import { betaScopeItems, faqItems, githubRepoUrl, siteUrl } from "@/lib/site";

export const metadata = createMetadata();

const principles = [
  { icon: Users, title: "A circle, not a public feed", body: "Invite-only access for direct conversations and small groups. No public people directory or phone-number discovery." },
  { icon: LockKeyhole, title: "History close to you", body: "Device-local message history and private-content search, with a hosted relay for delivery rather than a universal message archive." },
  { icon: MonitorSmartphone, title: "Native clients. Web companion.", body: "Android, Windows and Ubuntu clients for everyday use, with a browser companion for onboarding and messaging." },
];

const statusLabels = {
  live: "Available in beta",
  partial: "Partial support",
  implemented: "In source",
  planned: "Planned",
} as const;

export default function HomePage() {
  return (
    <MarketingShell>
      <JsonLd data={{ "@context": "https://schema.org", "@type": "SoftwareApplication", name: "EmberChamber", applicationCategory: "CommunicationApplication", operatingSystem: "Android, Windows, Ubuntu, Web", url: siteUrl, sameAs: githubRepoUrl, description: "Invite-only messaging with device-local history and a hosted delivery relay. Available as beta software with documented client and privacy limitations." }} />
      <JsonLd data={{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqItems.map((item) => ({ "@type": "Question", name: item.question, acceptedAnswer: { "@type": "Answer", text: item.answer } })) }} />
      <section className="px-6 pb-16 pt-14 sm:pb-20 sm:pt-20">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="section-kicker">Local-first messaging · Invite-only beta</p>
            <h1 className="mt-5 max-w-[14ch] text-balance font-display text-5xl font-semibold leading-[1.06] text-[#fff1e8] sm:text-6xl xl:text-7xl">Invite-only encrypted messaging for trusted circles.</h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-[#d6bfb4]">A private place for direct conversations and small groups. Explore the product, see how it is built, or join with an invitation.</p>
            <div className="mt-8 flex flex-wrap gap-3"><Link href="/tour" className="btn-primary">Explore the product <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" /></Link><Link href="/engineering" className="btn-ghost">Engineering &amp; source</Link></div>
            <p className="mt-4 text-sm leading-6 text-[#cbb0a3]">No account needed for the tour. <Link href="/start" className="font-medium text-[#ffb890] underline underline-offset-4">Already invited? Start here.</Link></p>
          </div>
          <figure className="min-w-0 overflow-hidden rounded-3xl border border-white/15 bg-[#130e0d] shadow-[0_24px_70px_rgba(0,0,0,0.3)]">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-5 py-4 text-sm"><span className="font-medium text-[#fff1e8]">Inside the web companion</span><span className="text-[#cbb0a3]">Captured beta interface</span></div>
            <Link href="/tour#messages" className="block" aria-label="Explore the messaging screen in the product tour"><Image src="/screenshots/home/04-first-message-sent.png" alt="EmberChamber beta web interface showing a conversation after a message has been sent" width={1280} height={1068} sizes="(min-width: 1024px) 640px, 100vw" priority className="h-auto w-full" /></Link>
            <figcaption className="border-t border-white/10 px-5 py-4 text-sm leading-6 text-[#cbb0a3]">A real product screen, not an interactive demo. Follow the <Link href="/tour" className="text-[#ffb890] underline underline-offset-4">invite-to-message walkthrough</Link>.</figcaption>
          </figure>
        </div>
      </section>
      <section aria-label="Product principles" className="px-6">
        <div className="mx-auto grid max-w-6xl gap-8 border-y border-white/10 py-10 md:grid-cols-3">{principles.map(({ icon: Icon, title, body }) => <article key={title}><Icon className="h-6 w-6 text-[#ffb890]" aria-hidden="true" /><h2 className="mt-4 text-xl font-semibold text-[#fff1e8]">{title}</h2><p className="mt-3 text-sm leading-7 text-[#d0b8ab]">{body}</p></article>)}</div>
      </section>
      <section className="px-6 py-16 sm:py-20">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_1.15fr] lg:items-center">
          <div><p className="section-kicker">Built in the open</p><h2 className="mt-4 text-balance font-display text-4xl font-semibold text-[#fff1e8] sm:text-5xl">Look beyond the interface.</h2><p className="mt-5 max-w-lg leading-8 text-[#d0b8ab]">Explore the delivery architecture, local-state decisions, shared protocols and release workflow. The engineering case study links directly to the code and documented tradeoffs.</p><div className="mt-6 flex flex-wrap gap-4"><Link href="/engineering" className="btn-primary">Read the engineering case study</Link><a href={githubRepoUrl} className="btn-ghost">View GitHub</a></div></div>
          <dl className="divide-y divide-white/10 rounded-3xl border border-white/10 bg-white/[0.025] px-6">{[["Clients", "Next.js · React Native / Expo · Tauri"], ["Delivery", "Cloudflare Workers · Durable Objects · WebSockets"], ["Storage", "Device-local state · D1 metadata · R2 attachments"], ["Contracts", "TypeScript and Rust protocol definitions"]].map(([label, detail]) => <div key={label} className="py-5"><dt className="text-sm font-medium text-[#ffb890]">{label}</dt><dd className="mt-2 leading-7 text-[#fff1e8]">{detail}</dd></div>)}</dl>
        </div>
      </section>
      <section id="beta-status" className="px-6 pb-16 sm:pb-20">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div className="max-w-2xl"><p className="section-kicker">Current scope</p><h2 className="mt-4 font-display text-4xl font-semibold text-[#fff1e8] sm:text-5xl">Know what the beta supports.</h2><p className="mt-4 leading-7 text-[#d0b8ab]">A feature in source is not the same as a verified production rollout. Client support, recovery and privacy boundaries matter.</p></div><Link href="/download" className="btn-ghost shrink-0">View available downloads</Link></div>
          <dl className="mt-8 divide-y divide-white/10 rounded-3xl border border-white/10 bg-white/[0.02] px-5 sm:px-7">{betaScopeItems.map((item) => <div key={item.feature} className="grid gap-3 py-5 sm:grid-cols-[13rem_1fr]"><dt className="font-medium text-[#fff1e8]">{item.feature}<span className="mt-2 block w-fit rounded-full border border-white/15 px-2.5 py-1 text-xs font-normal text-[#edc7af]">{statusLabels[item.status]}</span></dt><dd className="text-sm leading-7 text-[#d0b8ab]">{item.detail}</dd></div>)}</dl>
          <p className="mt-5 max-w-4xl text-sm leading-7 text-[#cbb0a3]">Direct messages and new encrypted groups are not the same as relay-hosted communities, rooms or legacy group history. Read the <Link href="/trust-and-safety" className="text-[#ffb890] underline underline-offset-4">privacy boundaries</Link> before choosing where to share sensitive information.</p>
        </div>
      </section>
      <section className="px-6 pb-8">
        <div className="mx-auto max-w-6xl border-t border-white/10 pt-12"><h2 className="font-display text-4xl font-semibold text-[#fff1e8]">A few useful answers.</h2><div className="mt-6 divide-y divide-white/10">{faqItems.map((item) => <details key={item.question} className="group py-5"><summary className="cursor-pointer text-lg font-medium text-[#fff1e8]">{item.question}</summary><p className="mt-4 max-w-3xl text-sm leading-7 text-[#d0b8ab]">{item.answer}</p></details>)}</div></div>
      </section>
    </MarketingShell>
  );
}
