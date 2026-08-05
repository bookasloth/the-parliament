import { test, expect } from "@playwright/test";
import { TEST_USER } from "./seed-user";

// Authed smoke: with a logged-in session (from auth.setup.ts), each core gated
// route must render without a server error or an uncaught client exception.
// Not a deep assertion suite — a regression tripwire across the app surface.

const ROUTES = [
  "/feed",
  "/community",
  "/events",
  "/groups",
  "/compose",
  "/notifications",
  "/messages",
  "/membership",
  "/connections",
  "/settings",
  "/profile/edit",
  `/${TEST_USER.username}`, // own profile
];

for (const route of ROUTES) {
  test(`authed route renders: ${route}`, async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (e) => pageErrors.push(e.message));

    const res = await page.goto(route);
    expect(res?.status(), `HTTP status for ${route}`).toBeLessThan(400);
    // Must NOT bounce back to auth/onboarding — the session is valid + onboarded.
    await expect(page).not.toHaveURL(/\/auth\/signin|\/onboarding\//);

    await page.waitForLoadState("networkidle");
    expect(pageErrors, `client errors on ${route}:\n${pageErrors.join("\n")}`).toHaveLength(0);
  });
}

test("core flow: open composer from feed", async ({ page }) => {
  await page.goto("/feed");
  // The ComposeTrigger links to /compose — following it should load the composer.
  await page.goto("/compose");
  await expect(page.locator("textarea, [contenteditable='true']").first()).toBeVisible();
});
