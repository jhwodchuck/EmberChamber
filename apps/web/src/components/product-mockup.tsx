const conversations = [
  { name: "Mira", preview: "Sounds good 👍", color: "bg-brand-500/30", active: true },
  { name: "Alex", preview: "Tonight works", color: "bg-amber-400/30", active: false },
  { name: "close friends", preview: "Jamie: 🔥", color: "bg-teal-400/30", active: false },
  { name: "Sam", preview: "Did you see—", color: "bg-purple-400/20", active: false },
];

const messages = [
  { own: false, text: "Plans for Saturday?" },
  { own: true, text: "Free after 3pm. Market first?" },
  { own: false, text: "Perfect. The usual spot?" },
  { own: true, text: "Sounds good 👍" },
];

export function ProductPreview() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none select-none overflow-hidden rounded-[1.8rem] border border-[var(--border)] bg-[var(--bg-secondary)] shadow-[0_24px_64px_rgba(32,19,18,0.14)] dark:shadow-[0_24px_64px_rgba(0,0,0,0.4)]"
    >
      {/* Window chrome */}
      <div className="flex items-center gap-3 border-b border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3">
        <div className="flex gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-[var(--border)]" />
          <div className="h-2.5 w-2.5 rounded-full bg-[var(--border)]" />
          <div className="h-2.5 w-2.5 rounded-full bg-[var(--border)]" />
        </div>
        <span className="text-[11px] text-[var(--text-secondary)]">EmberChamber</span>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
          <span className="text-[10px] font-medium text-[var(--text-secondary)]">end-to-end encrypted</span>
        </div>
      </div>

      {/* App body */}
      <div className="grid grid-cols-[8.5rem_1fr] divide-x divide-[var(--border)]">

        {/* Sidebar: conversation list */}
        <div className="flex flex-col gap-0.5 p-2">
          {conversations.map((c) => (
            <div
              key={c.name}
              className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${c.active ? "bg-brand-500/10" : ""}`}
            >
              <div className={`h-6 w-6 flex-shrink-0 rounded-full ${c.color}`} />
              <div className="min-w-0">
                <p
                  className={`truncate text-[11px] font-semibold ${
                    c.active ? "text-brand-600" : "text-[var(--text-primary)]"
                  }`}
                >
                  {c.name}
                </p>
                <p className="truncate text-[9px] text-[var(--text-secondary)]">{c.preview}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Main: chat view */}
        <div className="flex flex-col">
          {/* Chat header */}
          <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-2">
            <div className="h-6 w-6 flex-shrink-0 rounded-full bg-brand-500/30" />
            <div>
              <p className="text-[11px] font-semibold text-[var(--text-primary)]">Mira</p>
              <p className="text-[9px] text-green-500">online</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex flex-col gap-2.5 p-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.own ? "justify-end" : "justify-start"}`}>
                <span
                  className={`message-bubble text-[11px] ${m.own ? "own" : "other"}`}
                >
                  {m.text}
                </span>
              </div>
            ))}
          </div>

          {/* Compose */}
          <div className="mt-auto border-t border-[var(--border)] p-2">
            <div className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-1.5">
              <span className="flex-1 text-[10px] text-[var(--text-secondary)]">Message Mira…</span>
              <div className="h-4 w-4 rounded-full bg-brand-500/20" />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
