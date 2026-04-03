export const siteUrl =
  process.env.NEXT_PUBLIC_WEB_URL?.replace(/\/$/, "") ?? "https://emberchamber.com";

export const authBootstrapEnabled =
  process.env.NEXT_PUBLIC_EMBERCHAMBER_AUTH_BOOTSTRAP_ENABLED === "true";

export const githubRepoUrl = "https://github.com/jhwodchuck/EmberChamber";
export const githubReleasesUrl = `${githubRepoUrl}/releases`;
export const githubSourceZipUrl = `${githubRepoUrl}/archive/refs/heads/main.zip`;
export const githubIssuesUrl = `${githubRepoUrl}/issues`;
export const supportEmail = "support@emberchamber.com";

export const betaScopeItems = [
  { feature: "E2EE direct messages", status: "live" as const, detail: "Encrypted end-to-end on every surface" },
  { feature: "Small group messages", status: "live" as const, detail: "Invite-controlled, pairwise fan-out" },
  { feature: "Encrypted attachments", status: "live" as const, detail: "Files and media, E2EE in transit" },
  { feature: "Invite-only onboarding", status: "live" as const, detail: "Email magic-link, no public registration" },
  { feature: "Device-local search", status: "live" as const, detail: "Index never sent to relay" },
  { feature: "Account recovery", status: "live" as const, detail: "Private email only" },
  { feature: "Passkey sign-in", status: "planned" as const, detail: "After email bootstrap stabilises" },
  { feature: "iPhone client", status: "planned" as const, detail: "After first-wave targets are stable" },
];

export const surfaceCapabilities = [
  {
    name: "Web",
    badge: "browser",
    recommended: "Fastest start — no install",
    capabilities: [
      "Onboarding & registration",
      "Direct messages",
      "Group messages",
      "Invite review & management",
      "Device-local search",
      "Account recovery",
      "Settings",
    ],
    caveat: "No push notifications",
  },
  {
    name: "Android",
    badge: ".apk",
    recommended: "Primary daily use",
    capabilities: [
      "Everything in web",
      "Push notifications",
      "Native device integration",
      "Background sync",
    ],
    caveat: null,
  },
  {
    name: "Windows",
    badge: ".exe / .msi",
    recommended: "Desktop daily use",
    capabilities: [
      "Everything in web",
      "Push notifications",
      "Native desktop shell",
    ],
    caveat: null,
  },
  {
    name: "Ubuntu",
    badge: ".deb / AppImage",
    recommended: "Linux / operators",
    capabilities: [
      "Everything in web",
      "Push notifications",
      ".deb and AppImage packaging",
    ],
    caveat: null,
  },
];

export const primaryNav = [
  { href: "/start", label: "Start Here" },
  { href: "/download", label: "Download" },
  { href: "/trust-and-safety", label: "Trust & Safety" },
];

export const footerLinks = [
  { href: "/start", label: "Start Here" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/beta-terms", label: "Beta Terms" },
  { href: "/trust-and-safety", label: "Trust & Safety" },
  { href: "/support", label: "Support" },
  { href: "/download", label: "Launch Targets" },
];

export const launchPlatforms = [
  {
    id: "android",
    name: "Android",
    artifact: ".apk",
    status: "Primary beta client",
    detail: "The main way to use EmberChamber. Native client with local encrypted storage and relay-assisted delivery.",
  },
  {
    id: "windows",
    name: "Windows",
    artifact: ".exe / .msi",
    status: "First-wave desktop",
    detail:
      "Full desktop experience — auth, messaging, groups, invites, and settings in a native window built on the same secure Rust core.",
  },
  {
    id: "ubuntu",
    name: "Ubuntu",
    artifact: ".deb / AppImage",
    status: "First-wave desktop",
    detail:
      "Packaged as .deb and AppImage for Linux operators and desktop-heavy testers who want a native build with the same capabilities as Windows.",
  },
];

export const trustFacts = [
  {
    title: "What the relay can see",
    body: "Enough to route your messages: account IDs, device metadata, session tokens, and encrypted envelopes. It knows a message was sent, not what it said.",
  },
  {
    title: "What the relay cannot read",
    body: "Your message content, attachment contents, and private keys never leave your device in decrypted form. A compromised relay still cannot read your conversations.",
  },
  {
    title: "What stays on your device",
    body: "Your full conversation history, search index, private keys, and contact trust state. Delete the app and that history is gone — it's not sitting on a server.",
  },
];

export const faqItems = [
  {
    question: "Is EmberChamber pure peer to peer?",
    answer:
      "No — and we're upfront about it. Phones need reliable delivery when they're offline, so we use a minimal relay to handle that. The relay routes encrypted packets; it cannot read your messages.",
  },
  {
    question: "Do I need a phone number or Google account?",
    answer:
      "No. The beta uses invite-only email bootstrap. Your email handles identity and session recovery — it doesn't link your account to Google, Apple, or a carrier.",
  },
  {
    question: "Is EmberChamber adults-only?",
    answer:
      "Yes. Beta access is limited to adults 18 and over, with a self-attested age gate during onboarding. This is not a platform for minors.",
  },
  {
    question: "Will group chats be encrypted?",
    answer:
      "That's the target. The beta starts with E2EE direct messages, then moves to small invite-only groups using the same encryption model.",
  },
  {
    question: "Who is this beta for?",
    answer:
      "Adults who want a genuine private space for their trusted circle — people who are tired of messaging apps that treat their conversation history as an asset.",
  },
];
