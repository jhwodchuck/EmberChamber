import { mkdirSync } from "node:fs";
import { expect, type APIRequestContext, type Page } from "@playwright/test";

type AuthStartResponse = {
  id: string;
  expiresAt: string;
  inviteRequired: boolean;
  debugCompletionToken?: string;
};

type AuthSession = {
  accountId: string;
  accessToken: string;
};

type ConversationDescriptor = {
  id: string;
};

type ConversationInviteDescriptor = {
  inviteUrl: string;
};

export const webBaseUrl = process.env.CI_WEB_BASE_URL ?? "http://127.0.0.1:3000";
export const relayBaseUrl = process.env.CI_RELAY_BASE_URL ?? "http://127.0.0.1:8787";
export const inviteToken = process.env.CI_AUTH_INVITE_TOKEN ?? "dev-beta-invite";

export async function saveCheckpoint(page: Page, screenshotDir: string, name: string) {
  mkdirSync(screenshotDir, { recursive: true });
  await page.screenshot({ path: `${screenshotDir}/${name}.png`, fullPage: true });
}

export async function bootstrapAccount(
  request: APIRequestContext,
  email: string,
  deviceLabel: string,
): Promise<AuthSession> {
  const startBody = await requestMagicLinkChallenge(request, {
    email,
    inviteToken,
    deviceLabel,
  });

  if (!startBody.debugCompletionToken) {
    throw new Error("Expected debugCompletionToken for CI flow. Ensure relay email provider is set to log.");
  }

  const completeResponse = await request.post(`${relayBaseUrl}/v1/auth/complete`, {
    data: {
      completionToken: startBody.debugCompletionToken,
      deviceLabel,
    },
  });

  expect(completeResponse.ok()).toBeTruthy();
  return (await completeResponse.json()) as AuthSession;
}

export async function requestMagicLinkChallenge(
  request: APIRequestContext,
  input: {
    deviceLabel: string;
    email: string;
    inviteToken?: string;
  },
): Promise<AuthStartResponse> {
  const startResponse = await request.post(`${relayBaseUrl}/v1/auth/start`, {
    data: {
      email: input.email,
      inviteToken: input.inviteToken,
      ageConfirmed18: true,
      deviceLabel: input.deviceLabel,
    },
  });

  expect(startResponse.ok()).toBeTruthy();
  return (await startResponse.json()) as AuthStartResponse;
}

export async function requestMagicLinkFromUi(
  page: Page,
  input: {
    deviceLabel: string;
    email: string;
    inviteToken?: string;
    mode: "join" | "signin";
  },
): Promise<AuthStartResponse> {
  const authStartResponsePromise = page.waitForResponse(
    (response) => response.url().includes("/v1/auth/start") && response.request().method() === "POST",
  );

  await page.getByLabel("Private email").fill(input.email);
  if (input.inviteToken) {
    await page.getByLabel("Invite token").fill(input.inviteToken);
  }
  await page.getByLabel("I confirm I am at least 18 years old").check();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Device label").fill(input.deviceLabel);
  await page
    .getByRole("button", { name: input.mode === "join" ? "Start beta onboarding" : "Send email link" })
    .click();

  const authStartResponse = await authStartResponsePromise;
  const authStartBody = (await authStartResponse.json()) as AuthStartResponse;
  if (!authStartBody.debugCompletionToken) {
    throw new Error("auth/start did not return debugCompletionToken. CI requires relay email provider=log.");
  }

  await expect(page.getByText("Inbox check required")).toBeVisible();
  return authStartBody;
}

export async function createGroupInvite(
  request: APIRequestContext,
  session: AuthSession,
  title: string,
): Promise<ConversationInviteDescriptor> {
  const createGroupResponse = await request.post(`${relayBaseUrl}/v1/groups`, {
    headers: {
      authorization: `Bearer ${session.accessToken}`,
    },
    data: {
      title,
      memberCap: 12,
    },
  });
  expect(createGroupResponse.ok()).toBeTruthy();
  const conversation = (await createGroupResponse.json()) as ConversationDescriptor;

  const createInviteResponse = await request.post(`${relayBaseUrl}/v1/conversations/${conversation.id}/invites`, {
    headers: {
      authorization: `Bearer ${session.accessToken}`,
    },
    data: {},
  });
  expect(createInviteResponse.ok()).toBeTruthy();
  return (await createInviteResponse.json()) as ConversationInviteDescriptor;
}

export async function openDirectMessage(
  request: APIRequestContext,
  session: AuthSession,
  peerAccountId: string,
): Promise<ConversationDescriptor> {
  const response = await request.post(`${relayBaseUrl}/v1/dm/open`, {
    headers: {
      authorization: `Bearer ${session.accessToken}`,
    },
    data: {
      peerAccountId,
    },
  });

  expect(response.ok()).toBeTruthy();
  return (await response.json()) as ConversationDescriptor;
}
