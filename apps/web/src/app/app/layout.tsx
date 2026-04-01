import Image from "next/image";
import Link from "next/link";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <header className="border-b border-[var(--border)] px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Image
              src="/brand/emberchamber-mark.svg"
              alt="EmberChamber mark"
              width={40}
              height={40}
            />
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">EmberChamber</p>
              <p className="text-xs text-[var(--text-secondary)]">Web companion surface</p>
            </div>
          </div>

          <nav className="flex items-center gap-2">
            <Link href="/" className="btn-ghost">
              Home
            </Link>
            <Link href="/login" className="btn-ghost">
              Email Sign-In
            </Link>
            <Link href="/register" className="btn-primary">
              Join Beta
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-6 py-8 lg:grid-cols-[280px_1fr]">
        <aside className="card h-fit">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-500">
            Beta scope
          </p>
          <div className="mt-4 space-y-3 text-sm text-[var(--text-secondary)]">
            <p>Android is the primary client.</p>
            <p>Windows and Ubuntu desktop builds follow the same relay model.</p>
            <p>The browser is for invite landing, auth bootstrap, and support flows.</p>
          </div>
        </aside>

        <section className="card min-h-[420px]">{children}</section>
      </main>
    </div>
  );
}
