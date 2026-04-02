export const onboardingSteps = [
  {
    number: "01",
    title: "Bring the invite and inbox",
    body: "Use a private email for bootstrap and recovery, then add the invite token or group link only when a new account needs it.",
  },
  {
    number: "02",
    title: "Confirm adults-only access",
    body: "EmberChamber is for adults 18 and over. The beta uses a clear self-attested gate instead of heavy identity verification.",
  },
  {
    number: "03",
    title: "Name the device and finish sign-in",
    body: "Readable device names make session reviews and recovery less painful. The first magic link establishes the session.",
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
