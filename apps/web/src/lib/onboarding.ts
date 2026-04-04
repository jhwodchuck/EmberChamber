export const onboardingSteps = [
  {
    number: "01",
    title: "Confirm access",
    body: "Bring the private email and invite details that belong to this account.",
  },
  {
    number: "02",
    title: "Name the device",
    body: "Use a readable label so session review and later device linking stay clear.",
  },
  {
    number: "03",
    title: "Finish from the inbox",
    body: "Open the link on the device you want to use first so the first session lands cleanly.",
  },
] as const;

export const onboardingAssurances = [
  {
    title: "Invite-first, not feed-first",
    body: "New beta accounts need a trusted invite path. Returning users should only need their private email, 18+ affirmation, and current device name.",
  },
  {
    title: "Pseudonymous by default",
    body: "Email stays private. Display names and handles carry the social identity inside trusted circles.",
  },
  {
    title: "Local-first trust model",
    body: "The relay moves ciphertext and delivery metadata. Conversation history and local search should stay on device over time.",
  },
] as const;

export function suggestBrowserDeviceLabel() {
  if (typeof navigator === "undefined") {
    return "Browser companion";
  }

  const browserNavigator = navigator as Navigator & {
    userAgentData?: {
      platform?: string;
    };
  };

  const platformHint = [browserNavigator.userAgentData?.platform, navigator.platform, navigator.userAgent]
    .filter(Boolean)
    .join(" ");

  if (/android/i.test(platformHint)) {
    return "Android browser";
  }

  if (/iphone|ipad|ipod/i.test(platformHint)) {
    return "iPhone browser";
  }

  if (/win/i.test(platformHint)) {
    return "Windows browser";
  }

  if (/mac/i.test(platformHint)) {
    return "Mac browser";
  }

  if (/linux/i.test(platformHint)) {
    return "Linux browser";
  }

  return "Browser companion";
}
