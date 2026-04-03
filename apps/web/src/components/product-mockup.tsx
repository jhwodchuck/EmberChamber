import { History, LockKeyhole, Search, UserRoundPlus } from "lucide-react";

const conversations = [
  { name: "Mira", preview: "Sounds good 👍", color: "bg-brand-500/30", active: true },
  { name: "Alex", preview: "Tonight works", color: "bg-amber-400/30", active: false },
  { name: "close friends", preview: "Jamie: spot is locked in", color: "bg-teal-400/30", active: false },
  { name: "Sam", preview: "No public profile here", color: "bg-purple-400/20", active: false },
];

const messages = [
  { own: false, text: "Plans for Saturday?" },
  { own: true, text: "Free after 3pm. Market first?" },
  { own: false, text: "Perfect. The usual spot?" },
  { own: true, text: "Sounds good 👍" },
];

export function ProductPreview() {
  return (
    <div aria-hidden="true" className="pointer-events-none relative mx-auto max-w-[40rem] select-none">
      <div className="absolute inset-x-[12%] top-6 h-44 rounded-full bg-[radial-gradient(circle,rgba(234,111,63,0.24),transparent_62%)] blur-3xl" />

      <div className="section-spotlight relative overflow-hidden rounded-[2.25rem] p-4 sm:p-5">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),transparent_26%)]" />

        <div className="relative rounded-[1.8rem] border border-white/10 bg-[rgba(12,8,9,0.72)] shadow-[0_24px_64px_rgba(0,0,0,0.34)]">
          <div className="flex items-center gap-3 border-b border-white/10 bg-[rgba(255,255,255,0.03)] px-4 py-3">
            <div className="flex gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full bg-white/15" />
              <div className="h-2.5 w-2.5 rounded-full bg-white/15" />
              <div className="h-2.5 w-2.5 rounded-full bg-white/15" />
            </div>
            <span className="text-[11px] text-[#b9968f]">EmberChamber</span>
            <div className="ml-auto flex items-center gap-1.5">
              <LockKeyhole aria-hidden="true" className="h-3.5 w-3.5 text-brand-400" />
              <span className="text-[10px] font-medium text-[#d8b7a7]">end-to-end encrypted</span>
            </div>
          </div>

          <div className="grid grid-cols-[8.7rem_1fr_10rem] divide-x divide-white/10">
            <div className="flex flex-col gap-1.5 p-2">
              {conversations.map((conversation) => (
                <div
                  key={conversation.name}
                  className={`flex items-center gap-2 rounded-xl px-2.5 py-2 ${
                    conversation.active ? "bg-brand-500/10 ring-1 ring-brand-500/20" : "bg-white/[0.03]"
                  }`}
                >
                  <div className={`h-7 w-7 flex-shrink-0 rounded-full ${conversation.color}`} />
                  <div className="min-w-0">
                    <p
                      className={`truncate text-[11px] font-semibold ${
                        conversation.active ? "text-[#fff0e6]" : "text-[#e6d2c6]"
                      }`}
                    >
                      {conversation.name}
                    </p>
                    <p className="truncate text-[9px] text-[#a98b83]">{conversation.preview}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex min-h-[18rem] flex-col">
              <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2.5">
                <div className="h-7 w-7 flex-shrink-0 rounded-full bg-brand-500/30" />
                <div>
                  <p className="text-[11px] font-semibold text-[#fff0e6]">Mira</p>
                  <p className="text-[9px] text-green-400">invite-only circle</p>
                </div>
              </div>

              <div className="flex flex-1 flex-col gap-2.5 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),transparent)] p-3">
                {messages.map((message, index) => (
                  <div key={index} className={`flex ${message.own ? "justify-end" : "justify-start"}`}>
                    <span className={`message-bubble text-[11px] ${message.own ? "own" : "other"}`}>
                      {message.text}
                    </span>
                  </div>
                ))}

                <div className="mt-auto rounded-[1.1rem] border border-white/10 bg-white/[0.03] px-3 py-2 text-[10px] text-[#b9968f]">
                  Search, history, and keys stay local to this device.
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 bg-[rgba(255,255,255,0.02)] p-3">
              {[
                {
                  icon: Search,
                  label: "Local Search",
                  body: "Index never leaves the device",
                },
                {
                  icon: LockKeyhole,
                  label: "Relay Boundary",
                  body: "Routes traffic, cannot read content",
                },
                {
                  icon: UserRoundPlus,
                  label: "Invite Gate",
                  body: "No public discovery surface",
                },
              ].map((item) => (
                <div key={item.label} className="rounded-[1.1rem] border border-white/8 bg-white/[0.04] p-3">
                  <div className="flex items-center gap-2">
                    <item.icon aria-hidden="true" className="h-3.5 w-3.5 text-brand-400" />
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

        <div className="mt-4 flex flex-col gap-4 sm:mt-0 sm:contents">
          <div className="sm:absolute sm:-left-6 sm:bottom-6 sm:w-56">
            <div className="rounded-[1.45rem] border border-white/10 bg-[rgba(16,10,11,0.92)] p-4 shadow-[0_20px_48px_rgba(0,0,0,0.28)] backdrop-blur-xl">
              <div className="flex items-center gap-2">
                <History aria-hidden="true" className="h-4 w-4 text-brand-400" />
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#ffd0b6]">
                  Local Vault
                </p>
              </div>
              <p className="mt-3 text-sm leading-6 text-[#d6b6a8]">
                Message history stays on this device instead of living in a searchable server archive.
              </p>
            </div>
          </div>

          <div className="sm:absolute sm:-right-6 sm:top-10 sm:w-60">
            <div className="rounded-[1.45rem] border border-white/10 bg-[rgba(16,10,11,0.92)] p-4 shadow-[0_20px_48px_rgba(0,0,0,0.28)] backdrop-blur-xl">
              <div className="flex items-center gap-2">
                <UserRoundPlus aria-hidden="true" className="h-4 w-4 text-brand-400" />
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#ffd0b6]">
                  Quiet Entry
                </p>
              </div>
              <div className="mt-3 space-y-2">
                {["Invite-only onboarding", "No public profile", "No cold messages from strangers"].map((item) => (
                  <div
                    key={item}
                    className="rounded-full border border-white/8 bg-white/[0.04] px-3 py-2 text-xs text-[#d6b6a8]"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
