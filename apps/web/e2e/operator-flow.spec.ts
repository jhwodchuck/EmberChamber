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

    // Reuse the bootstrapped operator session in the browser. Other e2e flows
    // cover magic-link completion; this test stays focused on operator access
    // and avoids racing a second session against the account elevation.
    await page.goto(webBaseUrl);
    await page.evaluate((session) => {
      window.localStorage.setItem(
        "emberchamber.relay.session.v1",
        JSON.stringify(session),
      );
    }, operator);

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
