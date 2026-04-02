import type { PrivacyDefaults } from "./types";

export const relayUrl =
  process.env.EXPO_PUBLIC_RELAY_URL?.replace(/\/$/, "") ??
  (__DEV__ ? "http://10.0.2.2:8787" : "https://relay.emberchamber.com");

export const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;

export const STORAGE_KEYS = {
  email: "emberchamber.auth.v1.email",
  inviteToken: "emberchamber.auth.v1.inviteToken",
  deviceLabel: "emberchamber.auth.v1.deviceLabel",
  session: "emberchamber.auth.v1.session",
  profileSetupComplete: "emberchamber.profile.v1.setupComplete",
  selfieUri: "emberchamber.profile.v1.selfieUri",
} as const;

export const defaultPrivacyDefaults: PrivacyDefaults = {
  notificationPreviewMode: "discreet",
  autoDownloadSensitiveMedia: false,
  allowSensitiveExport: false,
  secureAppSwitcher: true,
};

export const onboardingSteps = [
  { number: "01", title: "Bring the invite you got", body: "A trusted group invite can bootstrap the account and land you in the right circle." },
  { number: "02", title: "Confirm adults-only access", body: "EmberChamber beta access is limited to adults 18 and over with a clear self-attested gate." },
  { number: "03", title: "Use the inbox you control", body: "Email stays private and only handles sign-in plus recovery." },
] as const;

export const onboardingAssurances = [
  "Email is private and used only for bootstrap and recovery.",
  "Display names and handles carry the social identity. Email is never the public identity.",
  "The relay moves ciphertext, attachment blobs, and delivery metadata instead of indexing private chat history.",
] as const;
