export default function AppHome() {
  return (
    <div className="flex-1 flex items-center justify-center bg-[var(--bg-primary)]">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-brand-500/10 flex items-center justify-center mx-auto mb-4">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-brand-500">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
          Welcome to PrivateMesh
        </h2>
        <p className="text-[var(--text-secondary)] text-sm max-w-xs mx-auto">
          Select a conversation from the sidebar or start a new one.
        </p>
      </div>
    </div>
  );
}
