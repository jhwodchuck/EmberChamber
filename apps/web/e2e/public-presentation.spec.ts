import path from "node:path";
import { mkdirSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import {
  getDownloadAction,
  hasArtifactIdentityMismatch,
} from "../src/lib/releases";

const visualCheckDir = path.resolve(
  __dirname,
  "../artifacts/screenshots/public-presentation",
);
mkdirSync(visualCheckDir, { recursive: true });

function watchPageErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(message.text());
    }
  });
  return errors;
}

async function expectHealthyPage(page: Page, heading: string) {
  await expect(page.getByRole("heading", { name: heading })).toBeVisible();
  await expect(
    page.locator(
      '[data-nextjs-dialog], .vite-error-overlay, #webpack-dev-server-client-overlay',
    ),
  ).toHaveCount(0);
  await expect(page.locator("body")).not.toHaveText("");
}

async function expectLoadedImage(image: ReturnType<Page["locator"]>) {
  await expect(image).toHaveJSProperty("complete", true);
  await expect
    .poll(() => image.evaluate((node: HTMLImageElement) => node.naturalWidth))
    .toBeGreaterThan(0);
}

test.describe("public presentation", () => {
  test("renders the public homepage at desktop and phone widths", async ({
    page,
  }) => {
    const errors = watchPageErrors(page);
    await page.goto("/");
    await expectHealthyPage(
      page,
      "Invite-only encrypted messaging for trusted circles.",
    );

    const wordmark = page.locator('img[src*="emberchamber-wordmark.svg"]');
    await expect(wordmark).toBeVisible();
    await expectLoadedImage(wordmark);

    const desktopCapture = page.locator(
      'img[src*="03-conversation-focus.png"]',
    );
    await expect(desktopCapture).toBeVisible();
    await expectLoadedImage(desktopCapture);
    await page.screenshot({
      path: path.join(visualCheckDir, "homepage-desktop.png"),
      fullPage: true,
    });

    await page.setViewportSize({ width: 390, height: 844 });
    const mobileCapture = page.locator(
      'img[src*="04-conversation-mobile.png"]',
    );
    await expect(mobileCapture).toBeVisible();
    await expect(desktopCapture).toBeHidden();
    await expectLoadedImage(mobileCapture);
    await expect(page.locator('main a[href="/start"]')).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    ).toBeTruthy();
    await page.screenshot({
      path: path.join(visualCheckDir, "homepage-mobile.png"),
      fullPage: true,
    });
    expect(errors).toEqual([]);
  });

  test("renders the tour, engineering scope, and release disclosures", async ({
    page,
  }) => {
    const errors = watchPageErrors(page);

    await page.goto("/tour");
    await expectHealthyPage(page, "See how EmberChamber works.");
    await expectLoadedImage(page.locator('img[src*="01-invite-preview.png"]'));

    await page.goto("/engineering");
    await expectHealthyPage(
      page,
      "Local-first messaging. Explicit engineering tradeoffs.",
    );
    await expect(
      page.getByRole("heading", {
        name: "Creator, engineering owner, and release decision-maker.",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "Turning a release mismatch into an enforced contract.",
      }),
    ).toBeVisible();

    await page.goto("/download");
    await expectHealthyPage(
      page,
      "Download EmberChamber for Android, Windows, and Ubuntu",
    );
    await expect(
      page.getByRole("heading", {
        name: "Start with the surface that matches the moment, not the slogan.",
      }),
    ).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("prioritizes installers and detects artifact identity mismatches from fixtures", () => {
    expect(getDownloadAction("android", "ember-beta.30.apk")).toEqual({
      label: "Download Android APK",
      primary: true,
    });
    expect(getDownloadAction("android", "ember-beta.30.aab").primary).toBe(false);
    expect(getDownloadAction("ubuntu", "ember-beta.30.deb").primary).toBe(true);
    expect(getDownloadAction("ubuntu", "ember-beta.30.AppImage").primary).toBe(false);
    expect(getDownloadAction("windows", "ember-beta.30.exe").primary).toBe(true);
    expect(getDownloadAction("windows", "ember-beta.30.msi").primary).toBe(false);
    expect(
      hasArtifactIdentityMismatch("v0.1.0-beta.30", [
        { label: "ember_0.1.0-beta.25_amd64.deb" },
      ]),
    ).toBe(true);
    expect(
      hasArtifactIdentityMismatch("v0.1.0-beta.30", [
        { label: "ember_0.1.0-beta.30_amd64.deb" },
      ]),
    ).toBe(false);
  });
});
