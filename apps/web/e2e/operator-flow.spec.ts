import path from "node:path";
import { expect, test } from "@playwright/test";
import {
  bootstrapAccount,
  grantOperator,
  relayBaseUrl,
  saveCheckpoint,
  webBaseUrl,
} from "./helpers";

const screenshotDir =
  process.env.CI_OPERATOR_SCREENSHOT_DIR ??
  path.resolve(__dirname, "../artifacts/screenshots/operator-flow");

test.describe("Operator admin surface", () => {
  test("an operator reviews and actions a report", async ({
    page,
    request,
  }) => {
    const seed = Date.now();

    // Seed an operator account and elevate it via the break-glass endpoint.
    const operator = await bootstrapAccount(
      request,
      `ci-operator-${seed}@example.test`,
      `CI Operator ${seed}`,
    );
    await grantOperator(request, operator.accountId);

    // A normal account files a report against the operator's account.
    const reporter = await bootstrapAccount(
      request,
      `ci-reporter-${seed}@example.test`,
      `CI Reporter ${seed}`,
    );
    const reportResponse = await request.post(`${relayBaseUrl}/v1/reports`, {
      headers: { authorization: `Bearer ${reporter.accessToken}` },
      data: {
        targetAccountId: operator.accountId,
        reason: "harassment",
        disclosedPayload: { note: `e2e disclosure ${seed}` },
      },
    });
    expect(reportResponse.ok()).toBeTruthy();

    // Sign the browser into the operator account via the magic-link debug token.
    const startBody = await request
      .post(`${relayBaseUrl}/v1/auth/start`, {
        data: {
          email: `ci-operator-${seed}@example.test`,
          inviteToken: "dev-beta-invite",
          ageConfirmed18: true,
          deviceLabel: `CI Operator Browser ${seed}`,
        },
      })
      .then((response) => response.json());
    await page.goto(
      `${webBaseUrl}/auth/complete?token=${encodeURIComponent(startBody.debugCompletionToken ?? "")}&browser=1`,
    );
    await page.waitForURL(/\/app$/, { timeout: 20_000 });

    // The operator nav entry should be visible; open the admin surface.
    await page.goto(`${webBaseUrl}/app/admin`);
    await expect(
      page.getByRole("heading", { name: "Moderation & recovery" }),
    ).toBeVisible({ timeout: 20_000 });

    // The open report appears in the queue; open it and action it.
    await page.getByRole("button", { name: /harassment/i }).first().click();
    await expect(page.getByText(`e2e disclosure ${seed}`)).toBeVisible();
    await saveCheckpoint(page, screenshotDir, "01-report-detail");

    await page.getByLabel("Resolution note").fill("Handled via e2e test.");
    await page.getByRole("button", { name: "Mark actioned" }).click();
    await expect(page.getByText("Report marked actioned")).toBeVisible({
      timeout: 10_000,
    });
    await saveCheckpoint(page, screenshotDir, "02-report-actioned");
  });
});
