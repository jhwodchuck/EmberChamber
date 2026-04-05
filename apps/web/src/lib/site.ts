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
  { feature: "E2EE direct messages", status: "live" as const, detail: "Encrypted mailbox delivery across active beta surfaces" },
  {
    feature: "Small group messages",
    status: "live" as const,
    detail: "New groups are created as device-encrypted; legacy relay-hosted compatibility history still exists for older group and room flows",
  },
  {
    feature: "Encrypted attachments",
    status: "live" as const,
    detail: "Browser encrypted-conversation uploads use client-side ciphertext; native attachment rollout is still uneven",
  },
  { feature: "Invite-only onboarding", status: "live" as const, detail: "Email magic-link, no public registration" },
  { feature: "Device-local search", status: "live" as const, detail: "Index never sent to relay" },
  { feature: "Account recovery", status: "live" as const, detail: "Private email bootstrap with limited total-device-loss recovery" },
  { feature: "Passkey sign-in", status: "planned" as const, detail: "After email bootstrap stabilises" },
  { feature: "iPhone client", status: "planned" as const, detail: "After first-wave targets are stable" },
];

export type PrivacyBoundaryItem = {
  title: string;
  staysLocal: string;
  relayRole: string;
  currentNote: string;
};

export const privacyBoundaryItems: PrivacyBoundaryItem[] = [
  {
    title: "Direct messages",
    staysLocal: "Private keys, DM history, and the private-content search index stay on the device.",
    relayRole:
      "The relay stores account and conversation metadata plus ciphertext mailbox envelopes until they are acknowledged.",
    currentNote: "The relay does not serve plaintext DM history back to the browser.",
  },
  {
    title: "Group history",
    staysLocal: "New groups are created with device-encrypted history and local client history.",
    relayRole:
      "The relay coordinates membership, epochs, and mailbox delivery for new groups while legacy compatibility history still exists for older group and room paths.",
    currentNote: "Legacy relay-hosted group and room history still exists in compatibility paths and older data.",
  },
  {
    title: "Browser attachments",
    staysLocal: "Browser encrypted-conversation flows can encrypt attachment bytes and keep file keys with the client before upload.",
    relayRole:
      "R2 stores attachment blobs and signed access metadata so downloads can be delivered to authorized members.",
    currentNote: "This browser DM path is ahead of the native attachment path today.",
  },
  {
    title: "Native attachments",
    staysLocal: "File selection, local cache, and local trust state remain with the client.",
    relayRole:
      "Current mobile and desktop flows can still upload raw bytes to R2 through signed upload and download tickets.",
    currentNote: "Native attachment encryption is still being migrated and should not be flattened into the browser DM story.",
  },
  {
    title: "Search",
    staysLocal: "Search over private message content stays local to the device.",
    relayRole:
      "The relay exposes joined-space metadata search, not server-side search over private message bodies.",
    currentNote: "Search is local-first today, not a server archive feature.",
  },
  {
    title: "Recovery",
    staysLocal: "Private keys, local history, and trusted-device state remain tied to the devices you control.",
    relayRole:
      "Email bootstrap plus device and session metadata let the hosted beta restore access to an existing account.",
    currentNote: "Total-device-loss recovery remains intentionally limited, and the fuller trusted-device recovery flow is not finished.",
  },
  {
    title: "Passkeys",
    staysLocal: "When shipped, passkey private keys will live on user devices or platform authenticators rather than on the relay.",
    relayRole:
      "The relay schema and endpoints exist only as scaffolding today so the beta can add passkeys later without changing the product boundary.",
    currentNote: "Passkey sign-in is not live in the current beta.",
  },
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
      "Local SQLite cache",
      "Native device integration",
      "Installable daily client",
    ],
    caveat: "Push wiring is complete on mobile and relay. Production delivery requires EMBERCHAMBER_FCM_SERVICE_ACCOUNT_JSON and EMBERCHAMBER_PUSH_TOKEN_SECRET to be configured as relay secrets — see the operator playbook.",
  },
  {
    name: "Windows",
    badge: ".exe / .msi",
    recommended: "Desktop daily use",
    capabilities: [
      "Everything in web",
      "Longer sessions",
      "Native desktop shell",
    ],
    caveat: "No desktop push channel yet",
  },
  {
    name: "Ubuntu",
    badge: ".deb / AppImage",
    recommended: "Linux / operators",
    capabilities: [
      "Everything in web",
      "Longer sessions",
      ".deb and AppImage packaging",
    ],
    caveat: "No desktop push channel yet",
  },
];

export const primaryNav = [
  { href: "/start", label: "Start Here" },
  { href: "/download", label: "Download" },
  { href: "/trust-and-safety", label: "Trust & Safety" },
  { href: "/support", label: "Support" },
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
    detail: "The main way to use EmberChamber. Native client with local device storage and relay-assisted delivery.",
  },
  {
    id: "windows",
    name: "Windows",
    artifact: ".exe / .msi",
    status: "First-wave desktop",
    detail:
      "Full desktop experience in a native Tauri shell for auth, messaging, groups, invites, and settings.",
  },
  {
    id: "ubuntu",
    name: "Ubuntu",
    artifact: ".deb / AppImage",
    status: "First-wave desktop",
    detail:
      "Packaged as .deb and AppImage for Linux operators and desktop-heavy testers who want the same first-wave desktop scope as Windows.",
  },
];

export const trustFacts = [
  {
    title: "What the relay can see",
    body: "Account, device, session, invite, and membership metadata, plus ciphertext envelopes until ack and attachment blobs needed for delivery. The relay is narrow, but it is not empty.",
  },
  {
    title: "What the relay cannot read",
    body: "Direct-message content and new device-encrypted group history are not exposed through relay-hosted history endpoints. That does not make every legacy path or attachment flow equally mature yet.",
  },
  {
    title: "What stays on your device",
    body: "Private keys, DM history, local search index, and contact trust state. Attachment encryption and legacy relay-hosted compatibility paths still need to be described separately instead of flattened into one claim.",
  },
];

export const faqItems = [
  {
    question: "Is EmberChamber pure peer to peer?",
    answer:
      "No. Phones need reliable delivery when they are offline, so EmberChamber uses a hosted relay for metadata, delivery, and attachment storage. The privacy goal is to keep that role narrow, not to pretend the relay does nothing.",
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
      "New groups in the active beta runtime are created with device-encrypted history. Legacy relay-hosted group and room history still exists in compatibility paths, and attachment encryption is not yet uniform across every client.",
  },
  {
    question: "Who is this beta for?",
    answer:
      "Adults who want a genuine private space for their trusted circle — people who are tired of messaging apps that treat their conversation history as an asset.",
  },
];
