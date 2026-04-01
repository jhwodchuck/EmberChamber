const relayUrl =
  process.env.NEXT_PUBLIC_RELAY_URL?.replace(/\/$/, "") ?? "http://127.0.0.1:8787";

export interface MagicLinkChallenge {
  id: string;
  expiresAt: string;
  inviteRequired: boolean;
  debugCompletionToken?: string;
}

export async function startMagicLink(input: {
  email: string;
  inviteToken?: string;
  deviceLabel: string;
}): Promise<MagicLinkChallenge> {
  const response = await fetch(`${relayUrl}/v1/auth/start`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(input),
  });

  const body = (await response.json()) as MagicLinkChallenge & { error?: string };
  if (!response.ok) {
    throw new Error(body.error ?? "Unable to start magic-link sign-in");
  }

  return body;
}
