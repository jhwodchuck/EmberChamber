import Link from "next/link";

export default function AppHome() {
  return (
    <div className="flex-1 flex items-center justify-center bg-[var(--bg-primary)]">
      <div className="text-center max-w-lg px-6">
        <div className="w-16 h-16 rounded-2xl bg-brand-500/10 flex items-center justify-center mx-auto mb-4">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-brand-500">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
          Web is now the companion surface
        </h2>
        <p className="text-[var(--text-secondary)] text-sm max-w-md mx-auto">
          The real beta clients are Android plus Windows and Ubuntu desktop builds. Use this web
          surface for invite links, account recovery, and beta guidance while the local-first
          clients come online.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Link href="/register" className="card text-left hover:border-brand-500 transition-colors">
            <p className="text-sm font-semibold text-[var(--text-primary)]">Join Beta</p>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">Start invite-only onboarding.</p>
          </Link>
          <Link href="/login" className="card text-left hover:border-brand-500 transition-colors">
            <p className="text-sm font-semibold text-[var(--text-primary)]">Email Sign-In</p>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">Request a fresh magic link.</p>
          </Link>
          <Link href="/invite/example" className="card text-left hover:border-brand-500 transition-colors">
            <p className="text-sm font-semibold text-[var(--text-primary)]">Invite Landing</p>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">See how native invite handoff works.</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
