export const siteUrl =
  process.env.NEXT_PUBLIC_WEB_URL?.replace(/\/$/, "") ?? "https://emberchamber.com";

export const authBootstrapEnabled =
  process.env.NEXT_PUBLIC_EMBERCHAMBER_AUTH_BOOTSTRAP_ENABLED === "true";

export const githubRepoUrl = "https://github.com/jhwodchuck/EmberChamber";
export const githubReleasesUrl = `${githubRepoUrl}/releases`;
export const githubSourceZipUrl = `${githubRepoUrl}/archive/refs/heads/main.zip`;

export const primaryNav = [
  { href: "/download", label: "Download" },
  { href: "/trust-and-safety", label: "Trust & Safety" },
  { href: "/privacy", label: "Privacy" },
];

export const footerLinks = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/beta-terms", label: "Beta Terms" },
  { href: "/trust-and-safety", label: "Trust & Safety" },
  { href: "/download", label: "Launch Targets" },
];

export const launchPlatforms = [
  {
    id: "android",
    name: "Android",
    artifact: ".apk",
    status: "Primary beta client",
    detail: "Expo-based native client with local SQLite, SecureStore, and relay-assisted sync.",
  },
  {
    id: "windows",
    name: "Windows",
    artifact: ".exe / .msi",
    status: "Desktop beta shell",
    detail: "Tauri bundle that will consume the same secure Rust core and relay contracts.",
  },
  {
    id: "ubuntu",
    name: "Ubuntu",
    artifact: ".deb / AppImage",
    status: "Desktop beta shell",
    detail: "Tauri-based Linux packaging aimed at early operators and desktop-heavy testers.",
  },
];

export const trustFacts = [
  {
    title: "What the relay can see",
    body: "Account, device, session, invite, and ciphertext-delivery metadata needed to move messages.",
  },
  {
    title: "What the relay should not see",
    body: "Decrypted DM content, decrypted attachment contents, or a searchable index of private message history.",
  },
  {
    title: "What stays on-device",
    body: "Message history, local search indexes, private keys, retry state, and safety indicators for trusted contacts.",
  },
];

export const faqItems = [
  {
    question: "Is EmberChamber pure peer to peer?",
    answer:
      "No. The beta uses a minimal hosted relay because phones and desktop clients need reliable offline delivery and wake-up behavior.",
  },
  {
    question: "Does EmberChamber use phone numbers or Google accounts?",
    answer:
      "No. The beta direction is invite-only email bootstrap with optional passkeys later. Email is used for auth and recovery, not discovery.",
  },
  {
    question: "Will group chats be encrypted?",
    answer:
      "That is the target. The current beta architecture is designed for E2EE DMs first, then small invite-only groups with pairwise fan-out.",
  },
  {
    question: "Who is the first beta for?",
    answer:
      "Trusted circles that want private messaging on Android, Windows, and Ubuntu without pretending that a modern phone messenger can be fully serverless.",
  },
];
