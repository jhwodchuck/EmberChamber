import Image from "next/image";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-[var(--border)] px-6 py-4">
        <nav className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image
              src="/brand/emberchamber-mark.svg"
              alt="EmberChamber mark"
              width={36}
              height={36}
              priority
            />
            <Image
              src="/brand/emberchamber-wordmark.svg"
              alt="EmberChamber"
              width={240}
              height={47}
              className="h-auto w-[184px] sm:w-[220px]"
            />
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="btn-ghost">
              Request magic link
            </Link>
            <Link href="/register" className="btn-primary">
              Join beta
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="max-w-5xl mx-auto px-6 py-20 text-center">
          <Image
            src="/brand/emberchamber-lockup.svg"
            alt="EmberChamber lockup"
            width={720}
            height={216}
            priority
            className="mx-auto mb-10 h-auto w-full max-w-[620px]"
          />
          <div className="inline-flex items-center gap-2 rounded-full bg-brand-500/10 px-4 py-1.5 text-sm text-brand-500 mb-8">
            <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
            Closed beta for trusted circles
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold text-[var(--text-primary)] mb-6 leading-tight">
            Encrypted messaging with a{" "}
            <span className="text-brand-500">minimal relay</span>
          </h1>

          <p className="text-xl text-[var(--text-secondary)] mb-10 max-w-2xl mx-auto">
            EmberChamber is shifting from a centralized starter into an invite-only beta for
            Android, Windows, and Ubuntu. Accounts bootstrap with private email magic links,
            while message history stays on device and the relay stores ciphertext only.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register" className="btn-primary text-base px-6 py-3">
              Request beta access
            </Link>
            <Link
              href="/login"
              className="btn-ghost border border-[var(--border)] text-base px-6 py-3"
            >
              Sign in with email
            </Link>
          </div>
        </section>

        {/* Features */}
        <section className="max-w-5xl mx-auto px-6 py-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: "🔒",
                title: "True E2EE DMs",
                description:
                  "Per-device encrypted envelopes with local-first history and relay-assisted offline delivery.",
              },
              {
                icon: "👥",
                title: "Small Invite-Only Groups",
                description:
                  "Private groups capped for trusted circles, with membership epochs and QR or deep-link invites.",
              },
              {
                icon: "🛡️",
                title: "Private Bootstrap Identity",
                description:
                  "Email is used only for auth and recovery. No phone numbers, no Google auth, and no public discovery.",
              },
              {
                icon: "📡",
                title: "Minimal Relay Control Plane",
                description:
                  "Cloudflare Workers, Durable Objects, D1, and R2 handle signaling, mailbox sync, and encrypted attachments.",
              },
              {
                icon: "⚡",
                title: "Android-First Beta",
                description:
                  "The first shipping clients are Android plus Windows and Ubuntu desktop builds. iPhone and macOS wait.",
              },
              {
                icon: "🔍",
                title: "Local Search Only",
                description:
                  "Search runs on your device against decrypted local history. The relay does not index your messages.",
              },
            ].map((feature) => (
              <div key={feature.title} className="card">
                <div className="text-3xl mb-3">{feature.icon}</div>
                <h3 className="font-semibold text-[var(--text-primary)] mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-[var(--text-secondary)]">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Trust & Safety */}
        <section className="border-t border-[var(--border)]">
          <div className="max-w-5xl mx-auto px-6 py-12 text-center">
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">
              Private by design. Precise about tradeoffs.
            </h2>
            <p className="text-[var(--text-secondary)] max-w-2xl mx-auto">
              EmberChamber is not promising perfect anonymity or pure peer-to-peer delivery. The
              beta uses a small hosted relay for reliability on phones and desktops, while keeping
              encrypted content out of routine server visibility.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] px-6 py-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-[var(--text-secondary)]">
          <p>© {new Date().getFullYear()} EmberChamber. All rights reserved.</p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-[var(--text-primary)]">
              Privacy Policy
            </a>
            <a href="#" className="hover:text-[var(--text-primary)]">
              Beta Terms
            </a>
            <a href="#" className="hover:text-[var(--text-primary)]">
              Trust & Safety
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
