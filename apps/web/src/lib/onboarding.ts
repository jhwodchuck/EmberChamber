export const onboardingSteps = [
  {
    number: "01",
    title: "Confirm access",
    body: "Bring the private email tied to this account. New beta accounts also need an invite token.",
  },
  {
    number: "02",
    title: "Name this browser",
    body: "Use a name you will recognize later in your device list.",
  },
  {
    number: "03",
    title: "Finish from the inbox",
    body: "Open the email link on the device you want to use first.",
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
    return "Web browser";
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

  return "Web browser";
}
