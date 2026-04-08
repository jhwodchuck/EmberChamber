import path from "node:path";
import { expect, test } from "@playwright/test";
import {
  bootstrapAccount,
  createGroupInvite,
  requestMagicLinkChallenge,
  saveCheckpoint,
  webBaseUrl,
} from "./helpers";

const screenshotDir =
  process.env.CI_INVITE_SCREENSHOT_DIR ?? path.resolve(__dirname, "../artifacts/screenshots/invite-continuation");

test.describe("Invite continuation", () => {
  test("returns signed-out users to the same invite preview after browser auth completes", async ({
    page,
    request,
  }) => {
    const seed = Date.now();
    const inviterSession = await bootstrapAccount(
      request,
      `ci-invite-owner-${seed}@example.test`,
      `CI Invite Owner ${seed}`,
    );
    const inviteeEmail = `ci-invitee-${seed}@example.test`;
    const inviteeDeviceLabel = `CI Invitee Browser ${seed}`;
    await bootstrapAccount(request, inviteeEmail, `CI Invitee Seed ${seed}`);

    const invite = await createGroupInvite(request, inviterSession, `CI Invite Group ${seed}`);
    const invitePath = new URL(invite.inviteUrl).pathname;

    await page.goto(`${webBaseUrl}${invitePath}`);
    await expect(page.getByRole("heading", { name: "Preview the private space before you trust the link." })).toBeVisible();
    await expect(page.getByRole("link", { name: "Request Sign-In Link" })).toBeVisible();
    await saveCheckpoint(page, screenshotDir, "01-public-invite-preview");

    await page.getByRole("link", { name: "Request Sign-In Link" }).click();
    await page.waitForURL(/\/login\?next=/, { timeout: 15_000 });
    await expect(page).toHaveURL(new RegExp(`/login\\?next=${encodeURIComponent(invitePath)}`));

    await saveCheckpoint(page, screenshotDir, "02-login-page");

    const authStartBody = await requestMagicLinkChallenge(request, {
      email: inviteeEmail,
      deviceLabel: inviteeDeviceLabel,
    });

    await page.goto(
      `${webBaseUrl}/auth/complete?token=${encodeURIComponent(authStartBody.debugCompletionToken ?? "")}&browser=1`,
    );

    await page.waitForURL(new RegExp(`${invitePath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`), {
      timeout: 20_000,
    });
    await expect(page.getByRole("button", { name: "Join with Invite" })).toBeVisible();
    await expect(page.getByText("Invite-only space")).toBeVisible();
    await saveCheckpoint(page, screenshotDir, "03-returned-to-invite");
  });
});
