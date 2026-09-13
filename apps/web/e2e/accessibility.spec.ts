/**
 * Accessibility checks for public EmberChamber web pages.
 * Uses @axe-core/playwright to run Deque axe-core analysis and fail
 * on critical/serious violations.
 */

import AxeBuilder from "@axe-core/playwright";
import type { Result } from "axe-core";
import { expect, test } from "@playwright/test";

const webBaseUrl = process.env.CI_WEB_BASE_URL ?? "http://127.0.0.1:3000";

function formatViolations(violations: Result[]) {
  return violations
    .filter((v) => v.impact === "critical" || v.impact === "serious")
    .map((v) => `  [${v.impact}] ${v.id}: ${v.description}`)
    .join("\n");
}

test.describe("Public page accessibility (axe-core)", () => {
  test.use({ colorScheme: "dark" });

  for (const [label, path] of [
    ["landing (/)", "/"],
    ["start (/start)", "/start"],
    ["register (/register)", "/register"],
    ["login (/login)", "/login"],
    ["download (/download)", "/download"],
    ["product tour (/tour)", "/tour"],
    ["engineering case study (/engineering)", "/engineering"],
  ] as const) {
    test(`${label} has no critical/serious axe violations`, async ({
      page,
    }) => {
      await page.goto(`${webBaseUrl}${path}`);
      await page.waitForLoadState("networkidle");

      const { violations } = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();

      const critical = violations.filter(
        (v) => v.impact === "critical" || v.impact === "serious",
      );
      expect(
        critical,
        `Critical/serious axe violations found:\n${formatViolations(violations)}`,
      ).toHaveLength(0);
    });
  }

  test("open mobile navigation has no critical/serious axe violations", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(webBaseUrl);
    await page.getByRole("button", { name: "Open navigation menu" }).click();

    const dialog = page.getByRole("dialog", { name: "Site navigation" });
    await expect(dialog).toBeVisible();

    const { violations } = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();

    const critical = violations.filter(
      (violation) =>
        violation.impact === "critical" || violation.impact === "serious",
    );
    expect(
      critical,
      `Critical/serious axe violations found:\n${formatViolations(violations)}`,
    ).toHaveLength(0);
  });
});
