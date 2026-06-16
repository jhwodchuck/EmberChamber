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

import { expect, test, type Page } from "@playwright/test";

const webBaseUrl =
  process.env.CI_WEB_BASE_URL ?? "http://127.0.0.1:3000";

/**
 * Prepare a page for a deterministic `fullPage` screenshot.
 *
 * `next/image` lazy-loads below-the-fold images by default, and
 * `waitForLoadState("networkidle")` resolves before Playwright scrolls the
 * page to capture it. That lets lazy images stream in *during* the capture,
 * so two consecutive screenshots never match and `toHaveScreenshot` times out
 * waiting for a stable frame. Scrolling through the full height up front
 * triggers every lazy request, then we wait for all images to finish decoding
 * before returning to the top.
 */
async function settleForFullPageScreenshot(page: Page) {
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      let scrolled = 0;
      const step = window.innerHeight;
      const timer = setInterval(() => {
        window.scrollBy(0, step);
        scrolled += step;
        if (scrolled >= document.body.scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 50);
    });
  });

  await page.evaluate(async () => {
    await Promise.all(
      Array.from(document.images)
        .filter((img) => !img.complete)
        .map(
          (img) =>
            new Promise<void>((resolve) => {
              img.addEventListener("load", () => resolve(), { once: true });
              img.addEventListener("error", () => resolve(), { once: true });
            }),
        ),
    );
  });

  await page.evaluate(() => window.scrollTo(0, 0));
}

async function captureFullPage(page: Page, path: string, snapshot: string) {
  await page.goto(`${webBaseUrl}${path}`);
  await page.waitForLoadState("networkidle");
  await settleForFullPageScreenshot(page);
  // The default 5s `toHaveScreenshot` timeout is too tight for a cold,
  // image-heavy `fullPage` capture (the landing page in particular). CI always
  // renders cold, so give the stable-frame comparison room to settle.
  await expect(page).toHaveScreenshot(snapshot, {
    fullPage: true,
    timeout: 30_000,
  });
}

test.describe("Public page visual baselines", () => {
  test.use({ colorScheme: "dark" });

  test("landing page (/) renders correctly", async ({ page }) => {
    await captureFullPage(page, "/", "landing.png");
  });

  test("start page (/start) renders correctly", async ({ page }) => {
    await captureFullPage(page, "/start", "start.png");
  });

  test("register page (/register) renders correctly", async ({ page }) => {
    await captureFullPage(page, "/register", "register.png");
  });

  test("login page (/login) renders correctly", async ({ page }) => {
    await captureFullPage(page, "/login", "login.png");
  });

  test("download page (/download) renders correctly", async ({ page }) => {
    await captureFullPage(page, "/download", "download.png");
  });
});
