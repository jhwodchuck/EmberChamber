import { expect, test } from "@playwright/test";
import type { APIRequestContext, Page } from "@playwright/test";

type AuthStartResponse = {
  id: string;
  expiresAt: string;
  inviteRequired: boolean;
  debugCompletionToken?: string;
};

type AuthSession = {
  accessToken: string;
};

const webBaseUrl = process.env.CI_WEB_BASE_URL ?? "http://127.0.0.1:3000";
const relayBaseUrl = process.env.CI_RELAY_BASE_URL ?? "http://127.0.0.1:8787";
const inviteToken = process.env.CI_AUTH_INVITE_TOKEN ?? "dev-beta-invite";
const screenshotDir = process.env.CI_SCREENSHOT_DIR ?? "apps/web/artifacts/flow-screenshots";

async function saveCheckpoint(page: Page, name: string) {
  await page.screenshot({ path: `${screenshotDir}/${name}.png`, fullPage: true });
}

async function bootstrapAccount(
  request: APIRequestContext,
  email: string,
  deviceLabel: string,
): Promise<AuthSession> {
  const startResponse = await request.post(`${relayBaseUrl}/v1/auth/start`, {
    data: {
      email,
      inviteToken,
      ageConfirmed18: true,
      deviceLabel,
    },
  });

  expect(startResponse.ok()).toBeTruthy();
  const startBody = (await startResponse.json()) as AuthStartResponse;

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

test.describe("CI new-user bootstrap flow", () => {
  test("signs up, completes magic link, creates profile, and sends first DM", async ({ page, request }) => {
    const seed = Date.now();
    const primaryEmail = `ci-new-user-${seed}@example.test`;
    const primaryDisplayName = `CI New User ${seed}`;
    const peerEmail = `ci-peer-${seed}@example.test`;
    const peerDisplayName = `CI Peer ${seed}`;

    await page.goto(`${webBaseUrl}/register`);

    await page.getByLabel("Email").fill(primaryEmail);
    await page.getByLabel("Invite token").fill(inviteToken);
    await page.getByLabel("Device label").fill(`CI Browser ${seed}`);
    await page.getByLabel("I confirm I am at least 18 years old").check();

    const startResponsePromise = page.waitForResponse((response) =>
      response.url().includes("/v1/auth/start") && response.request().method() === "POST",
    );

    await page.getByRole("button", { name: "Start beta onboarding" }).click();

    const authStartResponse = await startResponsePromise;
    const authStartBody = (await authStartResponse.json()) as AuthStartResponse;
    if (!authStartBody.debugCompletionToken) {
      throw new Error("auth/start did not return debugCompletionToken. CI requires relay email provider=log.");
    }

    await expect(page.getByText("Inbox check required")).toBeVisible();
    await saveCheckpoint(page, "01-signup-requested");

    await page.goto(
      `${webBaseUrl}/auth/complete?token=${encodeURIComponent(authStartBody.debugCompletionToken)}&browser=1`,
    );

    await page.waitForURL(/\/app$/, { timeout: 20_000 });
    await expect(page.getByText("Web messaging stays available")).toBeVisible();
    await saveCheckpoint(page, "02-magic-link-completed");

    await page.goto(`${webBaseUrl}/app/settings`);
    await page.getByLabel("Display Name").fill(primaryDisplayName);
    await page.getByLabel("Private bio").fill("Created by the CI bootstrap flow test.");
    await page.getByRole("button", { name: "Save Profile" }).click();
    await expect(page.getByText("Profile updated")).toBeVisible();
    await saveCheckpoint(page, "03-profile-created");

    const peerSession = await bootstrapAccount(request, peerEmail, `CI Peer Device ${seed}`);

    const peerProfileResponse = await request.patch(`${relayBaseUrl}/v1/me`, {
      headers: {
        authorization: `Bearer ${peerSession.accessToken}`,
      },
      data: {
        displayName: peerDisplayName,
        bio: "CI seeded DM target",
      },
    });
    expect(peerProfileResponse.ok()).toBeTruthy();

    await page.goto(`${webBaseUrl}/app/new-dm`);
    const searchInput = page.getByPlaceholder("Search people by name or username…");
    await searchInput.fill(peerDisplayName);
    await expect(page.getByRole("button", { name: peerDisplayName })).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: peerDisplayName }).click();

    await page.waitForURL(/\/app\/chat\//, { timeout: 20_000 });
    const firstMessage = `Hello from CI bootstrap flow ${seed}`;
    await page.getByPlaceholder("Write a direct message for relay mailbox delivery…").fill(firstMessage);
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByText(firstMessage)).toBeVisible();
    await saveCheckpoint(page, "04-first-message-sent");
  });
});
