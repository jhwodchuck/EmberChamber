export const onboardingSteps = [
  {
    number: "01",
    title: "Add your private email",
    body: "Use a private email only for bootstrap and recovery. It is not meant to become a public handle or discovery path.",
  },
  {
    number: "02",
    title: "Name this device clearly",
    body: "Readable device names make session reviews, device revokes, and future recovery less painful.",
  },
  {
    number: "03",
    title: "Confirm from your inbox",
    body: "The first magic link establishes the session. Passkeys can layer on later when the beta flow is fully wired.",
  },
] as const;

export const onboardingAssurances = [
  {
    title: "Invite-first, not feed-first",
    body: "New beta accounts need an invite token. Returning users should only need their email and the current device name.",
  },
  {
    title: "Local-first trust model",
    body: "The relay moves ciphertext and delivery metadata. Conversation history and local search stay on device.",
  },
  {
    title: "Low-friction, not low-clarity",
    body: "The first beta keeps the path short: bootstrap, name the device, confirm the email, and move into trusted circles.",
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
