import path from "node:path";
import { expect, test } from "@playwright/test";
import {
  bootstrapAccount,
  inviteToken,
  openDirectMessage,
  registerDeviceBundle,
  relayBaseUrl,
  requestMagicLinkFromUi,
  saveCheckpoint,
  webBaseUrl,
} from "./helpers";

const screenshotDir =
  process.env.CI_NEW_USER_SCREENSHOT_DIR ??
  path.resolve(__dirname, "../artifacts/screenshots/new-user-flow");

test.describe("CI new-user bootstrap flow", () => {
  test("signs up, completes magic link, creates profile, and sends first DM", async ({
    page,
    request,
  }) => {
    const seed = Date.now();
    const primaryEmail = `ci-new-user-${seed}@example.test`;
    const primaryDisplayName = `CI New User ${seed}`;
    const peerEmail = `ci-peer-${seed}@example.test`;
    const peerDisplayName = `CI Peer ${seed}`;
    const primaryDeviceLabel = `CI Browser ${seed}`;

    await page.goto(`${webBaseUrl}/register`);

    const authStartBody = await requestMagicLinkFromUi(page, {
      email: primaryEmail,
      inviteToken,
      deviceLabel: primaryDeviceLabel,
      mode: "join",
    });

    await saveCheckpoint(page, screenshotDir, "01-signup-requested");

    await page.goto(
      `${webBaseUrl}/auth/complete?token=${encodeURIComponent(authStartBody.debugCompletionToken ?? "")}&browser=1`,
    );

    await page.waitForURL(/\/app$/, { timeout: 20_000 });
    await expect(
      page.getByRole("heading", { name: "Continue the conversation." }),
    ).toBeVisible();
    await saveCheckpoint(page, screenshotDir, "02-magic-link-completed");

    await page.goto(`${webBaseUrl}/app/settings`);
    await page.getByLabel("Display Name").fill(primaryDisplayName);
    await page
      .getByLabel("Private bio")
      .fill("Created by the CI bootstrap flow test.");
    await page.getByRole("button", { name: "Save Profile" }).click();
    await expect(page.getByText("Profile updated")).toBeVisible();
    await saveCheckpoint(page, screenshotDir, "03-profile-created");

    const primarySession = await bootstrapAccount(
      request,
      primaryEmail,
      `CI Browser API ${seed}`,
    );
    const peerSession = await bootstrapAccount(
      request,
      peerEmail,
      `CI Peer Device ${seed}`,
    );
    await registerDeviceBundle(request, peerSession);

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

    const dmConversation = await openDirectMessage(
      request,
      primarySession,
      peerSession.accountId,
    );
    await page.goto(`${webBaseUrl}/app/chat/${dmConversation.id}`);
    const firstMessage = `Hello from CI bootstrap flow ${seed}`;
    const composer = page.getByPlaceholder(
      "Write a direct message for relay mailbox delivery…",
    );
    await composer.fill(firstMessage);
    await page.getByRole("button", { name: "Send" }).click();
    await expect(composer).toHaveValue("");
    const sentMessage = page.getByText(firstMessage, { exact: true });
    await expect(sentMessage).toBeVisible();
    await expect(
      page.getByText(/No recipient devices are registered/),
    ).not.toBeVisible();
    await sentMessage.evaluate((element) =>
      element.scrollIntoView({ block: "center" }),
    );
    await saveCheckpoint(page, screenshotDir, "04-first-message-sent");
  });
});
