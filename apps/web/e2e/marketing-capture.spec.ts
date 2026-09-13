import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  bootstrapAccount,
  createGroupInvite,
  openDirectMessage,
  registerDeviceBundle,
  relayBaseUrl,
  webBaseUrl,
} from "./helpers";

const screenshotDir =
  process.env.MARKETING_SCREENSHOT_DIR ??
  path.resolve(__dirname, "../artifacts/screenshots/marketing");

async function saveLocator(locator: Locator, name: string) {
  mkdirSync(screenshotDir, { recursive: true });
  const page = locator.page();
  await page.mouse.move(0, 0);
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );
  await locator.screenshot({ path: path.join(screenshotDir, `${name}.png`) });
}

async function disableCaptureMotion(page: Page) {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation: none !important;
        caret-color: transparent !important;
        transition: none !important;
      }
    `,
  });
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
}

async function expectWithinViewport(page: Page, locator: Locator) {
  const box = await locator.boundingBox();
  const viewport = page.viewportSize();
  if (!box || !viewport) {
    throw new Error("Cannot verify a hidden marketing-capture landmark.");
  }
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
}

async function normalizeRelayDates(page: Page) {
  await page.locator("body *").evaluateAll((nodes) => {
    const relayDate = /^(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC) \d{1,2}$/i;
    for (const node of nodes) {
      if (node.children.length === 0 && relayDate.test(node.textContent?.trim() ?? "")) {
        node.textContent = "Aug 23";
      }
    }
  });
}

async function updateProfile(
  request: Parameters<typeof bootstrapAccount>[0],
  accessToken: string,
  displayName: string,
  bio: string,
) {
  const response = await request.patch(`${relayBaseUrl}/v1/me`, {
    headers: { authorization: `Bearer ${accessToken}` },
    data: { displayName, bio },
  });
  expect(response.ok()).toBeTruthy();
}

test.describe("portfolio marketing captures", () => {
  test.setTimeout(90_000);

  test("captures a deliberate invite, settings view, and useful conversation", async ({
    page,
    request,
  }) => {
    const seed = Date.now();
    await page.addInitScript(`
      {
        const fixedNow = new Date("2026-08-23T14:15:00Z").valueOf();
        const OriginalDate = Date;
        class FixedDate extends OriginalDate {
          constructor(...args) {
            super(...(args.length ? args : [fixedNow]));
          }
          static now() {
            return fixedNow;
          }
        }
        globalThis.Date = FixedDate;
      }
    `);
    const owner = await bootstrapAccount(
      request,
      `marketing-owner-${seed}@example.test`,
      "Mara's laptop",
    );
    await updateProfile(
      request,
      owner.accessToken,
      "Mara Chen",
      "Weekend plans and close-friend check-ins.",
    );

    const invite = await createGroupInvite(
      request,
      owner,
      "Trail Weekend Planning",
    );
    await page.goto(`${webBaseUrl}${new URL(invite.inviteUrl).pathname}`);
    await disableCaptureMotion(page);
    const inviteSummary = page.getByTestId("invite-preview-summary");
    await expect(inviteSummary.getByText("Trail Weekend Planning")).toBeVisible();
    await expect(inviteSummary.getByText(/Issued by Mara Chen/)).toBeVisible();
    await saveLocator(inviteSummary, "01-invite-preview");

    const primaryEmail = `marketing-mara-${seed}@example.test`;
    const primarySession = await bootstrapAccount(
      request,
      primaryEmail,
      "Mara's browser",
    );
    await updateProfile(
      request,
      primarySession.accessToken,
      "Mara Chen",
      "Weekend plans and close-friend check-ins.",
    );
    await page.goto(webBaseUrl);
    await page.evaluate((session) => {
      window.localStorage.setItem(
        "emberchamber.relay.session.v1",
        JSON.stringify(session),
      );
    }, primarySession);
    await page.goto(`${webBaseUrl}/app/settings`);
    await disableCaptureMotion(page);
    await page.getByRole("tab", { name: "Privacy" }).click();
    await expect(page.getByRole("button", { name: "Save Privacy Settings" })).toBeEnabled();
    await page.locator("aside > :not(:first-child)").evaluateAll((nodes) => {
      for (const node of nodes) {
        (node as HTMLElement).style.display = "none";
      }
    });
    await saveLocator(page.locator(".workspace-ember > div").last(), "02-privacy-controls");

    const peerSession = await bootstrapAccount(
      request,
      `marketing-theo-${seed}@example.test`,
      "Theo's phone",
    );
    await updateProfile(
      request,
      peerSession.accessToken,
      "Theo Brooks",
      "Maps, logistics, and backup plans.",
    );
    await registerDeviceBundle(request, peerSession);

    const conversation = await openDirectMessage(
      request,
      primarySession,
      peerSession.accountId,
    );
    await page.goto(`${webBaseUrl}/app/chat/${conversation.id}`);
    await disableCaptureMotion(page);
    const composer = page.getByPlaceholder(
      "Write a direct message for relay mailbox delivery…",
    );
    const firstMessage = "North entrance at 9? I added the route and check-in plan.";
    await composer.fill(firstMessage);
    await page.getByRole("button", { name: "Send" }).click();
    await expect(composer).toHaveValue("", { timeout: 20_000 });
    await expect(page.locator("main").getByText(firstMessage, { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.locator("main").getByText(firstMessage, { exact: true })).toBeVisible();

    await page
      .locator("label", { hasText: "Attach" })
      .locator('input[type="file"]')
      .setInputFiles({
      name: "trail-weekend-plan.txt",
      mimeType: "text/plain",
      buffer: Buffer.from(
        "North entrance: 9:00 AM\nCheck-in: noon\nBackup route: Lakeside loop\n",
      ),
    });
    await expect(page.getByText("trail-weekend-plan.txt", { exact: true })).toBeVisible();
    const attachmentMessage = "Here is the offline-friendly plan for everyone.";
    await composer.fill(attachmentMessage);
    await page.getByRole("button", { name: "Send" }).click();
    await expect(composer).toHaveValue("", { timeout: 20_000 });
    await expect(page.locator("main").getByText(attachmentMessage, { exact: true })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText("trail-weekend-plan.txt", { exact: true })).toBeVisible();
    await normalizeRelayDates(page);
    await expect(page.getByText("Aug 23", { exact: true })).toBeVisible();
    await page.getByText(/Local session boundary/).locator("..").evaluate((node) => {
      (node as HTMLElement).style.display = "none";
    });
    await page.locator("aside > :first-child, aside > details").evaluateAll((nodes) => {
      for (const node of nodes) {
        (node as HTMLElement).style.display = "none";
      }
    });
    await page.locator("main > div").first().evaluate((node) => {
      (node as HTMLElement).style.boxShadow = "none";
    });
    await page.locator("main > div").first().screenshot();
    await saveLocator(page.locator("main > div").first(), "03-conversation-focus");
    await saveLocator(page.locator(".workspace-ember > div").last(), "03-conversation-desktop");

    await page.setViewportSize({ width: 390, height: 844 });
    await page.addStyleTag({
      content: `
        html, body { overflow-x: hidden !important; }
        .workspace-ember > header,
        .workspace-ember > div > aside { display: none !important; }
        .workspace-ember > div {
          display: block !important;
          max-width: 390px !important;
          padding: 0 !important;
        }
        #main-content { width: 390px !important; }
        #main-content > div {
          border-left: 0 !important;
          border-radius: 0 !important;
          border-right: 0 !important;
        }
        #main-content textarea {
          height: 72px !important;
          min-height: 72px !important;
        }
      `,
    });
    for (const name of [
      "People",
      "Media",
      "Bold",
      "Italic",
      "Strike",
      "Code",
      "Quote",
      "Spoiler",
      "Poll",
      "Checklist",
      "Location",
      "Camera",
    ]) {
      await page.getByRole("button", { name, exact: true }).evaluateAll((nodes) => {
        for (const node of nodes) {
          (node as HTMLElement).style.display = "none";
        }
      });
    }
    await page.getByText(attachmentMessage, { exact: true }).scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollTo(0, 0));
    const mobileFrame = page.locator("#main-content > div");
    await expectWithinViewport(page, mobileFrame);
    await expectWithinViewport(page, page.getByRole("heading", { name: "Theo Brooks" }));
    await expectWithinViewport(page, page.getByText(attachmentMessage, { exact: true }));
    await expectWithinViewport(page, page.getByText("trail-weekend-plan.txt", { exact: true }));
    await expectWithinViewport(page, page.getByRole("button", { name: "Send" }));
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    ).toBeTruthy();
    await saveLocator(mobileFrame, "04-conversation-mobile");
  });
});
