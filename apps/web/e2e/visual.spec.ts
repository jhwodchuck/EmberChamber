/**
 * Visual regression baselines for public EmberChamber web pages.
 *
 * First-run setup: generate baselines with
 *   npx playwright test e2e/visual.spec.ts --update-snapshots
 * then commit the generated __snapshots__ directory.
 *
 * CI regenerates snapshots with --update-snapshots and uploads them as
 * artifacts so reviewers can diff intentional changes before committing.
 */

import { expect, test } from "@playwright/test";

const webBaseUrl =
  process.env.CI_WEB_BASE_URL ?? "http://127.0.0.1:3000";

test.describe("Public page visual baselines", () => {
  test.use({ colorScheme: "dark" });

  test("landing page (/) renders correctly", async ({ page }) => {
    await page.goto(`${webBaseUrl}/`);
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("landing.png", { fullPage: true });
  });

  test("start page (/start) renders correctly", async ({ page }) => {
    await page.goto(`${webBaseUrl}/start`);
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("start.png", { fullPage: true });
  });

  test("register page (/register) renders correctly", async ({ page }) => {
    await page.goto(`${webBaseUrl}/register`);
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("register.png", { fullPage: true });
  });

  test("login page (/login) renders correctly", async ({ page }) => {
    await page.goto(`${webBaseUrl}/login`);
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("login.png", { fullPage: true });
  });

  test("download page (/download) renders correctly", async ({ page }) => {
    await page.goto(`${webBaseUrl}/download`);
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("download.png", { fullPage: true });
  });
});
