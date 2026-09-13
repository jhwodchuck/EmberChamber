export const siteUrl =
  process.env.NEXT_PUBLIC_WEB_URL?.replace(/\/$/, "") ??
  "https://emberchamber.com";

export const authBootstrapEnabled =
  process.env.NEXT_PUBLIC_EMBERCHAMBER_AUTH_BOOTSTRAP_ENABLED === "true";

export const publicSignInCta = authBootstrapEnabled
  ? { href: "/login", label: "Sign In" }
  : { href: "/login?method=device-link", label: "Use QR Sign-In" };

export const githubRepoUrl = "https://github.com/jhwodchuck/EmberChamber";
export const githubReleasesUrl = `${githubRepoUrl}/releases`;
export const githubSourceZipUrl = `${githubRepoUrl}/archive/refs/heads/main.zip`;
export const githubIssuesUrl = `${githubRepoUrl}/issues`;
export const supportEmail = "support@emberchamber.com";

// These labels describe scope, not an assertion that every implementation has
// been deployed and verified on every client or in every published installer.
export const betaScopeItems = [
  { feature: "E2EE direct messages", status: "live" as const, detail: "Encrypted mailbox delivery across the active beta clients, with device-local history." },
  { feature: "Small group messages", status: "live" as const, detail: "New groups use device-encrypted history. Legacy group history and relay-hosted communities and rooms have different boundaries." },
  { feature: "Attachment encryption", status: "partial" as const, detail: "Client support and protection are not yet uniform. Review the client-specific trust notes before sending files." },
  { feature: "Invite-only onboarding", status: "live" as const, detail: "Invitation-based access with email bootstrap and self-attested 18+ eligibility; no public registration." },
  { feature: "Device-local search", status: "live" as const, detail: "Private-message content is searched on the device, not indexed by the relay." },
  { feature: "Account recovery", status: "partial" as const, detail: "Restoring account access does not guarantee recovery of lost device-local keys or message history." },
  { feature: "Passkey sign-in", status: "implemented" as const, detail: "Present in web and relay source. Native-client UX and authenticator validation remain incomplete; source availability is not a production-rollout guarantee." },
  { feature: "iPhone client", status: "planned" as const, detail: "Planned after the initial native clients are stable; not listed as a released beta client." },
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
    staysLocal:
      "Private keys, DM history, and the private-content search index stay on the device.",
    relayRole:
      "The relay stores account and conversation metadata plus ciphertext mailbox envelopes until they are acknowledged.",
    currentNote:
      "The relay does not serve plaintext DM history back to the browser.",
  },
  {
    title: "Group history",
    staysLocal:
      "New groups are created with device-encrypted history and local client history.",
    relayRole:
      "The relay coordinates membership, epochs, and mailbox delivery for new groups while legacy compatibility history still exists for older group and room paths.",
    currentNote:
      "Legacy relay-hosted group and room history still exists in compatibility paths and older data.",
  },
  {
    title: "Browser attachments",
    staysLocal:
      "Browser encrypted-conversation flows can encrypt attachment bytes and keep file keys with the client before upload.",
    relayRole:
      "R2 stores attachment blobs and signed access metadata so downloads can be delivered to authorized members.",
    currentNote:
      "This browser DM path is ahead of the native attachment path today.",
  },
  {
    title: "Native attachments",
    staysLocal:
      "File selection, local cache, and local trust state remain with the client.",
    relayRole:
      "Current mobile and desktop flows can still upload raw bytes to R2 through signed upload and download tickets.",
    currentNote:
      "Native attachment encryption is still being rolled out and does not yet match browser DM attachment protection.",
  },
  {
    title: "Search",
    staysLocal:
      "Search over private message content stays local to the device.",
    relayRole:
      "The relay exposes joined-space metadata search, not server-side search over private message bodies.",
    currentNote: "Search is local-first today, not a server archive feature.",
  },
  {
    title: "Recovery",
    staysLocal:
      "Private keys, local history, and trusted-device state remain tied to the devices you control.",
    relayRole:
      "Email bootstrap plus device and session metadata let the hosted beta restore access to an existing account.",
    currentNote:
      "Total-device-loss recovery remains intentionally limited, and the fuller trusted-device recovery flow is not finished.",
  },
  {
    title: "Passkeys",
    staysLocal:
      "Passkey private keys stay on user devices or platform authenticators rather than on the relay.",
    relayRole:
      "The relay issues and verifies WebAuthn challenges, stores public credential material and counters, and creates a device-bound session after successful authentication.",
    currentNote:
      "Enrollment and sign-in are implemented in current web source; native-client UX and trusted-device recovery are not.",
  },
];

export const surfaceCapabilities = [
  {
    name: "Web",
    badge: "browser",
    recommended: "Companion — no install",
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
      "Direct and group messaging",
      "Local SQLite cache",
      "Native device integration",
      "Installable daily client",
    ],
    caveat:
      "Push delivery depends on the deployed relay configuration and client setup. Native features and attachment support do not yet have full web parity.",
  },
  {
    name: "Windows",
    badge: ".exe / .msi",
    recommended: "Desktop daily use",
    capabilities: [
      "Direct and group messaging",
      "Longer sessions",
      "Native desktop shell",
    ],
    caveat: "No desktop push channel yet; native feature parity remains in progress.",
  },
  {
    name: "Ubuntu",
    badge: ".deb / AppImage",
    recommended: "Linux / operators",
    capabilities: [
      "Direct and group messaging",
      "Longer sessions",
      ".deb and AppImage packaging",
    ],
    caveat: "No desktop push channel yet; native feature parity remains in progress.",
  },
];

export const primaryNav = [
  { href: "/tour", label: "Product Tour" },
  { href: "/engineering", label: "Engineering" },
  { href: "/download", label: "Download" },
  { href: "/trust-and-safety", label: "Trust & Safety" },
];

export const footerLinks = [
  { href: "/tour", label: "Product Tour" },
  { href: "/engineering", label: "Engineering" },
  { href: "/start", label: "Start Here" },
  { href: "/download", label: "Download" },
  { href: "/trust-and-safety", label: "Trust & Safety" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/beta-terms", label: "Beta Terms" },
  { href: "/support", label: "Support" },
  { href: "/security", label: "Security" },
  { href: "/changelog", label: "Changelog" },
];

export const docsNav = [
  {
    href: "/docs/no-phone-number-private-messaging",
    label: "No Phone Number Discovery",
  },
  { href: "/docs/local-first-messaging", label: "Local-First & Local Search" },
  { href: "/docs/relay-boundary", label: "Relay Privacy Boundary" },
  { href: "/docs/encrypted-group-chat", label: "Encrypted Group Chat" },
  {
    href: "/docs/android-private-messenger-beta",
    label: "Android Beta Client",
  },
  { href: "/docs/windows-encrypted-messenger", label: "Windows Client" },
  { href: "/docs/ubuntu-encrypted-messenger", label: "Ubuntu & Linux Client" },
];

export const launchPlatforms = [
  {
    id: "android",
    name: "Android",
    artifact: ".apk",
    status: "Primary beta client",
    detail:
      "The main way to use EmberChamber. Native client with local device storage and relay-assisted delivery.",
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
    body: "Private keys, DM history, local search index, and contact trust state stay on your device. Browser and native attachment protection differ today, and older group and room paths may still use relay-hosted compatibility history.",
  },
];

export const faqItems = [
  {
    question: "Is EmberChamber pure peer to peer?",
    summary: "No. It uses a narrow hosted relay for delivery and metadata.",
    answer:
      "No. Phones need reliable delivery when they are offline, so EmberChamber uses a hosted relay for metadata, delivery, and attachment storage. The privacy goal is to keep that role narrow, not to pretend the relay does nothing.",
  },
  {
    question: "Do I need a phone number or Google account?",
    summary: "No. Beta access uses invite-only email bootstrap.",
    answer:
      "No. The beta uses invite-only email bootstrap. Your email handles identity and session recovery — it doesn't link your account to Google, Apple, or a carrier.",
  },
  {
    question: "Will group chats be encrypted?",
    summary:
      "New groups use device-encrypted history; legacy paths are still called out.",
    answer:
      "New groups in the active beta runtime are created with device-encrypted history. Legacy relay-hosted group and room history still exists in compatibility paths, and attachment encryption is not yet uniform across every client.",
  },
  {
    question: "Who is this beta for?",
    summary: "People who want a private space for an invite-gated circle.",
    answer:
      "People who want a genuine private space for their trusted circle — and who are tired of messaging apps that treat conversation history as an asset.",
  },
];
