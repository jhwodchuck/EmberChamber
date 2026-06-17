import { expect, test } from "@playwright/test";
import { requestMagicLinkChallenge, webBaseUrl } from "./helpers";

test.describe("Web network resilience", () => {
  test("surfaces a retryable error when the sessions endpoint fails", async ({
    page,
    request,
  }) => {
    const seed = Date.now();
    const email = `ci-resilience-${seed}@example.test`;

    // Bootstrap an account and complete the magic link in the browser.
    const startBody = await requestMagicLinkChallenge(request, {
      email,
      deviceLabel: `CI Resilience ${seed}`,
    });
    await page.goto(
      `${webBaseUrl}/auth/complete?token=${encodeURIComponent(startBody.debugCompletionToken ?? "")}&browser=1`,
    );
    await page.waitForURL(/\/app$/, { timeout: 20_000 });

    // Force the next sessions fetch to fail, then open the Sessions tab.
    await page.route("**/v1/sessions", (route) =>
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Injected failure", code: "INTERNAL_ERROR" }),
      }),
    );

    await page.goto(`${webBaseUrl}/app/settings`);
    await page.getByRole("tab", { name: "Sessions" }).click();

    // The UI should show the retryable error callout, not hang or crash.
    await expect(page.getByText("Sessions did not load")).toBeVisible({
      timeout: 15_000,
    });

    // Recover: stop injecting failures and retry. The list should load.
    await page.unroute("**/v1/sessions");
    await page.getByRole("button", { name: "Retry" }).click();
    await expect(page.getByText("Sessions did not load")).toBeHidden({
      timeout: 15_000,
    });
  });
});
