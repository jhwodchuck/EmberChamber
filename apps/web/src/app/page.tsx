import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-[var(--border)] px-6 py-4">
        <nav className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5">
                <path d="M12 2C6.48 2 2 6.48 2 12c0 5.52 4.48 10 10 10s10-4.48 10-10c0-5.52-4.48-10-10-10zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
              </svg>
            </div>
            <span className="font-bold text-lg text-[var(--text-primary)]">
              PrivateMesh
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="btn-ghost">
              Sign in
            </Link>
            <Link href="/register" className="btn-primary">
              Get started
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="max-w-5xl mx-auto px-6 py-20 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-brand-500/10 px-4 py-1.5 text-sm text-brand-500 mb-8">
            <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
            Privacy-first messaging
          </div>

          <h1 className="text-5xl sm:text-6xl font-bold text-[var(--text-primary)] mb-6 leading-tight">
            Your conversations,{" "}
            <span className="text-brand-500">your control</span>
          </h1>

          <p className="text-xl text-[var(--text-secondary)] mb-10 max-w-2xl mx-auto">
            PrivateMesh gives communities more control over their communications.
            Built for user-controlled, resilient messaging with minimal
            centralized visibility.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register" className="btn-primary text-base px-6 py-3">
              Create your account
            </Link>
            <Link
              href="/login"
              className="btn-ghost border border-[var(--border)] text-base px-6 py-3"
            >
              Sign in
            </Link>
          </div>
        </section>

        {/* Features */}
        <section className="max-w-5xl mx-auto px-6 py-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: "🔒",
                title: "Private Direct Messaging",
                description:
                  "Direct conversations with user-controlled privacy settings today, with secure DM protocol work staged separately.",
              },
              {
                icon: "👥",
                title: "Group Chat & Communities",
                description:
                  "Create groups and channels for your communities, with invite-first access and clear admin boundaries.",
              },
              {
                icon: "🛡️",
                title: "User-Controlled Privacy",
                description:
                  "Granular privacy settings. Control who can message you, see your activity, and find your profile.",
              },
              {
                icon: "📡",
                title: "Resilient Architecture",
                description:
                  "Built for reliability. Designed for self-hosting and future federation support.",
              },
              {
                icon: "⚡",
                title: "Real-Time Messaging",
                description:
                  "Instant message delivery via WebSocket. File sharing, voice notes, and reactions.",
              },
              {
                icon: "🔍",
                title: "Scoped Search",
                description:
                  "Search only the people and spaces you can already access instead of browsing a public network.",
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
              Privacy-first. Not lawlessness.
            </h2>
            <p className="text-[var(--text-secondary)] max-w-2xl mx-auto">
              PrivateMesh is built to reduce unnecessary centralized visibility
              while enforcing clear boundaries against illegal content, malware,
              extortion, CSAM, and platform abuse. Product language should stay
              precise about current trust boundaries rather than overclaiming.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] px-6 py-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-[var(--text-secondary)]">
          <p>© {new Date().getFullYear()} PrivateMesh. All rights reserved.</p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-[var(--text-primary)]">
              Privacy Policy
            </a>
            <a href="#" className="hover:text-[var(--text-primary)]">
              Terms of Service
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
