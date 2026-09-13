import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MarketingShell } from "@/components/marketing-shell";
import { createMetadata } from "@/lib/metadata";
import { githubRepoUrl, githubReleasesUrl } from "@/lib/site";

export const metadata = createMetadata({ title: "Engineering Case Study", path: "/engineering", description: "An engineering walkthrough of Jason Harmon's EmberChamber project: cross-platform clients, a Cloudflare relay, device-local history, protocol contracts and delivery tradeoffs." });

const decisions = [
  { title: "Use a delivery relay, not a universal private-message archive", decision: "Per-device Durable Objects queue ciphertext envelopes, deliver them over WebSockets and remove them after acknowledgement or expiry.", tradeoff: "Offline delivery still requires infrastructure. Account, device, membership and routing metadata remain server-side; not every group or room path has the same storage boundary.", path: "apps/relay", label: "Relay implementation" },
  { title: "Keep private-content search close to the device", decision: "Private-message history and its search index stay with the client rather than becoming a server-side full-text archive.", tradeoff: "Local-first state makes device loss, key handling and recovery important product problems. Recovering an account is not equivalent to restoring all lost history.", path: "docs/architecture.md", label: "Storage and recovery architecture" },
  { title: "Make cross-client protocol changes explicit", decision: "Rust and TypeScript contract definitions describe sessions, device bundles, mailbox envelopes, groups and attachments across the active runtimes.", tradeoff: "Shared definitions help reviewers track changes, but they do not replace cross-client tests. The Rust core is still partial, not the primary engine for every client flow.", path: "packages/protocol", label: "TypeScript protocol package" },
  { title: "Treat source, deployment and installers as separate evidence", decision: "The repository includes CI workflows for builds, checks and screenshots, plus a release feed for downloadable native artifacts.", tradeoff: "An implemented feature is not automatically deployed or present in a published installer. Release identity and per-client support must be checked independently.", path: ".github/workflows", label: "Build and verification workflows" },
];

const evidence = [
  { title: "Architecture", description: "Runtime map, storage planes and known gaps.", href: `${githubRepoUrl}/blob/main/docs/architecture.md` },
  { title: "Protocol contracts", description: "Rust definitions alongside the TypeScript mirror.", href: `${githubRepoUrl}/tree/main/crates/relay-protocol` },
  { title: "Checks and screenshots", description: "Inspect workflow results and their artifacts.", href: `${githubRepoUrl}/actions` },
  { title: "Published releases", description: "Downloadable builds, release notes and artifact names.", href: githubReleasesUrl },
];

export default function EngineeringPage() {
  return (
    <MarketingShell>
      <section className="px-6 pb-12 pt-14 sm:pt-20">
        <div className="mx-auto max-w-6xl">
          <p className="section-kicker">Engineering case study · A project by Jason Harmon</p>
          <h1 className="mt-5 max-w-4xl text-balance font-display text-5xl font-semibold leading-[1.08] text-[#fff1e8] sm:text-6xl">Local-first messaging. Explicit engineering tradeoffs.</h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-[#d0b8ab]">EmberChamber brings native clients, a web companion and an edge-hosted delivery system together around invite-only conversations. This is a guided map of the implementation and its boundaries, not a claim that every client has feature parity.</p>
          <div className="mt-8 flex flex-wrap gap-3"><a href={githubRepoUrl} className="btn-primary">Inspect the repository</a><Link href="/tour" className="btn-ghost">Take the product tour</Link></div>
          <p className="mt-5 max-w-3xl text-sm leading-7 text-[#cbb0a3]">Development is AI-assisted. Use the links below to review architecture notes, source changes, repository guidance and automated workflow results.</p>
        </div>
      </section>
      <section className="px-6 py-10">
        <div className="mx-auto max-w-6xl">
          <p className="section-kicker">System overview</p><h2 className="mt-4 font-display text-4xl font-semibold text-[#fff1e8]">Three responsibilities, kept distinct.</h2>
          <ol className="mt-8 grid gap-5 lg:grid-cols-3">
            <li className="rounded-3xl border border-white/10 bg-white/[0.025] p-6"><p className="text-sm font-medium text-[#ffb890]">01 · Clients</p><h3 className="mt-4 text-xl font-semibold text-[#fff1e8]">Interface and local state</h3><p className="mt-3 text-sm leading-7 text-[#d0b8ab]">Next.js for the browser, React Native / Expo for mobile, and a Tauri desktop shell. Client-specific storage and key handling remain part of the security boundary.</p><p className="mt-4 break-words font-mono text-xs leading-6 text-[#cbb0a3]">apps/web · apps/mobile · apps/desktop</p></li>
            <li className="rounded-3xl border border-white/10 bg-white/[0.025] p-6"><p className="text-sm font-medium text-[#ffb890]">02 · Relay</p><h3 className="mt-4 text-xl font-semibold text-[#fff1e8]">Routing and coordination</h3><p className="mt-3 text-sm leading-7 text-[#d0b8ab]">Cloudflare Workers handle relay APIs. Durable Objects coordinate per-device mailboxes, groups and rate limits; queues support background work.</p><p className="mt-4 break-words font-mono text-xs leading-6 text-[#cbb0a3]">apps/relay · Workers · Durable Objects</p></li>
            <li className="rounded-3xl border border-white/10 bg-white/[0.025] p-6"><p className="text-sm font-medium text-[#ffb890]">03 · Persistence</p><h3 className="mt-4 text-xl font-semibold text-[#fff1e8]">Explicit storage boundaries</h3><p className="mt-3 text-sm leading-7 text-[#d0b8ab]">D1 stores account and routing metadata; R2 stores attachment objects. The documented distinction between encrypted conversations, hosted rooms and client-local history matters.</p><p className="mt-4 break-words font-mono text-xs leading-6 text-[#cbb0a3]">D1 · R2 · Device-local state</p></li>
          </ol>
        </div>
      </section>
      <section className="px-6 py-12">
        <div className="mx-auto max-w-6xl">
          <p className="section-kicker">Design decisions</p><h2 className="mt-4 font-display text-4xl font-semibold text-[#fff1e8]">The reasoning behind the implementation.</h2>
          <div className="mt-8 divide-y divide-white/10 border-y border-white/10">{decisions.map((item) => <article key={item.title} className="grid gap-5 py-8 lg:grid-cols-[0.75fr_1.25fr]"><h3 className="text-xl font-semibold leading-8 text-[#fff1e8]">{item.title}</h3><div><p className="leading-8 text-[#d0b8ab]">{item.decision}</p><p className="mt-3 text-sm leading-7 text-[#cbb0a3]"><strong className="font-medium text-[#edc7af]">Tradeoff: </strong>{item.tradeoff}</p><a href={`${githubRepoUrl}/${item.path.endsWith(".md") ? "blob" : "tree"}/main/${item.path}`} className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[#ffb890] underline underline-offset-4">{item.label}<ArrowRight className="h-4 w-4" aria-hidden="true" /></a></div></article>)}</div>
        </div>
      </section>
      <section className="px-6 py-10">
        <div className="mx-auto max-w-6xl"><h2 className="font-display text-4xl font-semibold text-[#fff1e8]">Inspect the evidence.</h2><div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{evidence.map((item) => <a key={item.title} href={item.href} className="rounded-2xl border border-white/10 bg-white/[0.025] p-5 transition-colors hover:border-[#ffb890]/40 hover:bg-white/[0.05]"><h3 className="font-semibold text-[#fff1e8]">{item.title}</h3><p className="mt-3 text-sm leading-7 text-[#d0b8ab]">{item.description}</p><span className="mt-4 inline-flex items-center gap-2 text-sm text-[#ffb890]">View on GitHub<ArrowRight className="h-4 w-4" aria-hidden="true" /></span></a>)}</div></div>
      </section>
      <section className="px-6 pb-10 pt-8">
        <div className="mx-auto max-w-6xl rounded-3xl border border-white/10 bg-white/[0.03] p-7 sm:p-10"><p className="section-kicker">Work still in progress</p><h2 className="mt-4 font-display text-4xl font-semibold text-[#fff1e8]">A beta with visible boundaries.</h2><p className="mt-5 max-w-3xl leading-8 text-[#d0b8ab]">Native attachment support, authenticator validation, recovery maturity and cross-client parity require continued verification. Communities and rooms have relay-hosted behavior that should not be confused with encrypted direct messages or new encrypted groups.</p><p className="mt-4 max-w-3xl text-sm leading-7 text-[#cbb0a3]">The README also documents historical release-version mismatches. Inspect the artifact and its notes rather than assuming a newer source commit means a newer installed client.</p><div className="mt-6 flex flex-wrap gap-3"><Link href="/trust-and-safety" className="btn-ghost">Read the privacy boundaries</Link><a href={`${githubRepoUrl}#current-release-identity`} className="btn-ghost">Check release identity</a><Link href="/tour" className="btn-primary">See the product</Link></div></div>
      </section>
    </MarketingShell>
  );
}
