/**
 * Public-page visual evidence and entry-path regressions.
 * CI runs this file with --update-snapshots and uploads screenshots for review;
 * generated images are evidence, not proof of a reviewed visual baseline.
 */
import { expect, test, type Page } from "@playwright/test";

const webBaseUrl = process.env.CI_WEB_BASE_URL ?? "http://127.0.0.1:3000";

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
  const response = await page.goto(`${webBaseUrl}${path}`);
  expect(response?.status()).toBe(200);
  await page.waitForLoadState("networkidle");
  await settleForFullPageScreenshot(page);
  await expect(page).toHaveScreenshot(snapshot, {
    fullPage: true,
    timeout: 30_000,
  });
}

test.describe("Public page visual baselines", () => {
  test.use({ colorScheme: "dark", reducedMotion: "reduce" });
  for (const [path, name] of [
    ["/", "landing"],
    ["/start", "start"],
    ["/register", "register"],
    ["/login", "login"],
    ["/download", "download"],
    ["/tour", "tour"],
    ["/engineering", "engineering"],
  ]) {
    test(`${name} page renders correctly`, async ({ page }) => {
      await captureFullPage(page, path, `${name}.png`);
    });
  }

  test("product and engineering tour require no account", async ({ page }) => {
    await page.goto(webBaseUrl);
    await page
      .getByRole("main")
      .getByRole("link", { name: "Explore the product", exact: true })
      .click();
    await expect(page).toHaveURL(/\/tour\/?$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "See how EmberChamber works.",
    );
    await expect(page.locator("main img")).toHaveCount(3);
    await expect(
      page.getByText(
        "Required onboarding happens between the first and second captures:",
      ),
    ).toBeVisible();
    await expect(
      page.getByText("A signed-out visitor is reviewing an invitation."),
    ).toBeVisible();
    await expect(
      page.getByText(
        "The account and device are set up, with privacy controls loaded.",
      ),
    ).toBeVisible();
    await page
      .getByRole("main")
      .getByRole("link", {
        name: "Read the engineering case study",
        exact: true,
      })
      .click();
    await expect(page).toHaveURL(/\/engineering\/?$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Explicit engineering tradeoffs",
    );
    await expect(
      page.getByRole("link", { name: "Inspect the repository", exact: true }),
    ).toHaveAttribute("href", "https://github.com/jhwodchuck/EmberChamber");
  });

  test("mobile menu contains focus, closes with Escape and restores focus", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(webBaseUrl);
    const trigger = page.getByRole("button", { name: "Open navigation menu" });
    await trigger.focus();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog", { name: "Site navigation" });
    await expect(dialog).toBeVisible();
    const closeButton = dialog.getByRole("button", {
      name: "Close navigation menu",
    });
    await expect(closeButton).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(dialog.locator('a[href="/start"]').last()).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(closeButton).toBeFocused();
    for (let index = 0; index < 12; index += 1) {
      await page.keyboard.press("Tab");
      expect(
        await dialog.evaluate((node) => node.contains(document.activeElement)),
      ).toBe(true);
    }
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(trigger).toBeFocused();
    await trigger.click();
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(dialog).not.toBeVisible();
    await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
  });

  for (const width of [320, 375, 768]) {
    test(`header fits at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(webBaseUrl);
      const logo = await page
        .getByRole("link", { name: "EmberChamber home", exact: true })
        .boundingBox();
      const trigger = await page
        .getByRole("button", { name: "Open navigation menu" })
        .boundingBox();
      expect(logo).not.toBeNull();
      expect(trigger).not.toBeNull();
      expect(logo!.x + logo!.width).toBeLessThanOrEqual(trigger!.x);
      expect(trigger!.x + trigger!.width).toBeLessThanOrEqual(width);
    });
  }

  test("mobile landing page renders correctly", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await captureFullPage(page, "/", "landing-mobile.png");
  });
  test("mobile product tour renders correctly", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await captureFullPage(page, "/tour", "tour-mobile.png");
  });
  test("mobile engineering case study renders without horizontal overflow", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await captureFullPage(page, "/engineering", "engineering-mobile.png");
    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
  });
});
