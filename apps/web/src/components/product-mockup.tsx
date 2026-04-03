import {
  BellRing,
  Download,
  History,
  LockKeyhole,
  MailCheck,
  Paperclip,
  Search,
  ShieldCheck,
  UserRoundPlus,
} from "lucide-react";

const conversations = [
  { name: "Mira", preview: "Market first, then the usual spot.", color: "bg-brand-500/30", active: true, unread: 2 },
  { name: "Circle planning", preview: "Invite window closes at 7pm.", color: "bg-amber-400/30", active: false, unread: 0 },
  { name: "Alex", preview: "No public trail here.", color: "bg-sky-400/25", active: false, unread: 0 },
  { name: "Sam", preview: "Attachment came through.", color: "bg-emerald-400/20", active: false, unread: 1 },
];

const messages = [
  { own: false, author: "Mira", text: "Saturday still on?" },
  { own: true, author: "You", text: "Yes. I can bring the tickets and keep the thread here." },
  { own: false, author: "Mira", text: "Perfect. Share the file when you have it." },
];

const vaultSignals = [
  {
    icon: Search,
    label: "Local Search",
    body: "Search index stays on this device.",
  },
  {
    icon: ShieldCheck,
    label: "Relay Boundary",
    body: "Hosted delivery, no message visibility.",
  },
  {
    icon: UserRoundPlus,
    label: "Quiet Entry",
    body: "Invite-only access, no public discovery.",
  },
];

const inviteChecklist = [
  "Invite token confirmed",
  "Adults-only beta",
  "Web first, native when ready",
];

const phoneMessages = [
  { own: false, text: "Attachment posted." },
  { own: true, text: "Got it. Saved locally." },
  { own: false, text: "See you at 7." },
];

export function ProductPreview() {
  return (
    <div aria-hidden="true" className="pointer-events-none relative mx-auto max-w-[44rem] select-none">
      <div className="ambient-orb left-[8%] top-4 h-44 w-44 motion-safe:animate-[drift-soft_9s_ease-in-out_infinite]" />
      <div className="ambient-orb right-[2%] top-16 h-52 w-52 motion-safe:animate-[drift-soft_11s_ease-in-out_infinite]" />

      <div className="cinema-panel relative overflow-hidden rounded-[2.6rem] p-4 sm:p-6">
        <div className="glow-grid pointer-events-none absolute inset-0 opacity-40" />
        <div className="pointer-events-none absolute inset-x-[18%] top-4 h-40 rounded-full bg-[radial-gradient(circle,rgba(255,163,104,0.22),transparent_62%)] blur-3xl" />

        <div className="relative">
          <div className="mb-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_13rem]">
            <div className="showcase-frame overflow-hidden rounded-[1.8rem]">
              <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3 text-[#c9aca0]">
                <div className="flex gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-white/15" />
                  <div className="h-2.5 w-2.5 rounded-full bg-white/15" />
                  <div className="h-2.5 w-2.5 rounded-full bg-white/15" />
                </div>
                <span className="text-[11px]">EmberChamber</span>
                <div className="ml-auto flex items-center gap-2">
                  <LockKeyhole className="h-3.5 w-3.5 text-brand-400" />
                  <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-[#f3cdb8]">
                    End-to-end encrypted
                  </span>
                </div>
              </div>

              <div className="grid min-h-[21rem] grid-cols-[9.2rem_1fr] lg:grid-cols-[9.2rem_1fr_12rem]">
                <div className="border-r border-white/10 bg-[rgba(255,255,255,0.025)] p-2.5">
                  <div className="rounded-[1.2rem] border border-white/8 bg-white/[0.04] px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-[#f4c8b2]">
                    Trusted circle
                  </div>
                  <div className="mt-2 space-y-2">
                    {conversations.map((conversation) => (
                      <div
                        key={conversation.name}
                        className={`rounded-[1rem] border px-2.5 py-2 ${
                          conversation.active
                            ? "border-brand-500/25 bg-brand-500/10"
                            : "border-white/8 bg-white/[0.03]"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`h-7 w-7 flex-shrink-0 rounded-full ${conversation.color}`} />
                          <div className="min-w-0 flex-1">
                            <p
                              className={`truncate text-[11px] font-semibold ${
                                conversation.active ? "text-[#fff1e8]" : "text-[#ead7cd]"
                              }`}
                            >
                              {conversation.name}
                            </p>
                            <p className="truncate text-[9px] text-[#a98982]">{conversation.preview}</p>
                          </div>
                          {conversation.unread ? (
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-500/20 text-[9px] font-semibold text-brand-200">
                              {conversation.unread}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col">
                  <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
                    <div className="h-8 w-8 rounded-full bg-brand-500/30" />
                    <div>
                      <p className="text-[11px] font-semibold text-[#fff1e8]">Mira</p>
                      <p className="text-[9px] uppercase tracking-[0.16em] text-green-300">
                        Invite-only circle
                      </p>
                    </div>
                    <div className="ml-auto metric-pill border-green-400/20 bg-green-400/10 text-green-200">
                      Active now
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col bg-[linear-gradient(180deg,rgba(255,255,255,0.02),transparent)] px-4 py-4">
                    <div className="space-y-3">
                      {messages.map((message, index) => (
                        <div key={`${message.author}-${index}`} className={`flex ${message.own ? "justify-end" : "justify-start"}`}>
                          <div className="max-w-[17rem]">
                            {!message.own ? (
                              <p className="mb-1 text-[9px] font-medium uppercase tracking-[0.16em] text-[#a98982]">
                                {message.author}
                              </p>
                            ) : null}
                            <span className={`message-bubble text-[11px] leading-5 ${message.own ? "own" : "other"}`}>
                              {message.text}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 rounded-[1.2rem] border border-white/10 bg-white/[0.03] p-3">
                      <div className="flex items-center gap-2">
                        <Paperclip className="h-3.5 w-3.5 text-brand-400" />
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#ffd0b6]">
                          Attachment
                        </p>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-3 rounded-[1rem] border border-white/8 bg-black/20 px-3 py-2">
                        <div>
                          <p className="text-[11px] font-medium text-[#f3dfd3]">tickets.pdf</p>
                          <p className="text-[9px] text-[#a98982]">Encrypted before upload</p>
                        </div>
                        <div className="rounded-full border border-white/10 bg-white/[0.05] p-2 text-brand-400">
                          <Download className="h-3.5 w-3.5" />
                        </div>
                      </div>
                    </div>

                    <div className="mt-auto rounded-[1.1rem] border border-white/10 bg-white/[0.03] px-3 py-2 text-[10px] text-[#b9968f]">
                      Search, history, and private keys remain local to this device.
                    </div>
                  </div>
                </div>

                <div className="hidden border-l border-white/10 bg-[rgba(255,255,255,0.02)] p-3 lg:flex lg:flex-col lg:gap-3">
                  {vaultSignals.map((item) => (
                    <div key={item.label} className="rounded-[1.15rem] border border-white/8 bg-white/[0.04] p-3">
                      <div className="flex items-center gap-2">
                        <item.icon className="h-3.5 w-3.5 text-brand-400" />
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#ffd0b6]">
                          {item.label}
                        </p>
                      </div>
                      <p className="mt-2 text-[10px] leading-5 text-[#b9968f]">{item.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-3">
              <div className="showcase-frame rounded-[1.7rem] p-4 motion-safe:animate-[float-soft_7s_ease-in-out_infinite]">
                <div className="flex items-center gap-2">
                  <MailCheck className="h-4 w-4 text-brand-400" />
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#ffd0b6]">
                    Quiet Entry
                  </p>
                </div>
                <div className="mt-3 space-y-2">
                  {inviteChecklist.map((item) => (
                    <div key={item} className="signal-line py-2.5 text-xs leading-5">
                      <span className="signal-dot mt-1.5" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="showcase-frame rounded-[1.7rem] p-4">
                <div className="flex items-center gap-2">
                  <BellRing className="h-4 w-4 text-brand-400" />
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#ffd0b6]">
                    Native Rhythm
                  </p>
                </div>
                <div className="mt-4 grid gap-2">
                  {["Push on Android", "Desktop for long sessions", "Browser for fast entry"].map((item) => (
                    <div
                      key={item}
                      className="rounded-full border border-white/8 bg-white/[0.04] px-3 py-2 text-[11px] text-[#d6b6a8]"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="relative mt-5 flex flex-col gap-4 md:min-h-[12rem] md:flex-row md:items-end">
            <div className="showcase-frame rounded-[1.55rem] p-4 md:w-60 md:motion-safe:animate-[float-soft_8s_ease-in-out_infinite]">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-brand-400" />
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#ffd0b6]">
                  Local Vault
                </p>
              </div>
              <p className="mt-3 text-sm leading-6 text-[#d6b6a8]">
                Delete the app and the archive goes with it. History is not sitting in a server
                warehouse waiting to be searched later.
              </p>
            </div>

            <div className="showcase-frame ml-auto w-full max-w-[13.5rem] rounded-[2rem] p-2 shadow-[0_24px_60px_rgba(0,0,0,0.38)] md:absolute md:-bottom-8 md:right-2 md:w-[13.5rem]">
              <div className="showcase-screen overflow-hidden rounded-[1.55rem]">
                <div className="flex justify-center px-4 pt-3">
                  <div className="h-1.5 w-12 rounded-full bg-white/10" />
                </div>
                <div className="px-4 pb-4 pt-3">
                  <div className="rounded-[1.1rem] border border-brand-500/18 bg-brand-500/10 px-3 py-2 text-center">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-200">
                      Android daily client
                    </p>
                  </div>
                  <div className="mt-4 space-y-2">
                    {phoneMessages.map((message, index) => (
                      <div key={`${message.text}-${index}`} className={`flex ${message.own ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[9rem] rounded-[1rem] px-3 py-2 text-[10px] leading-5 ${
                            message.own ? "bg-brand-500 text-white" : "bg-white/[0.06] text-[#ecd9ce]"
                          }`}
                        >
                          {message.text}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 rounded-[1rem] border border-white/8 bg-white/[0.04] px-3 py-2 text-[10px] text-[#b9968f]">
                    Local history and notifications stay with the client.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
