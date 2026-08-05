import { test as setup, expect } from "@playwright/test";
import { TEST_USER } from "./seed-user";

export const AUTH_FILE = "e2e/.auth/user.json";

// Logs the seeded smoke user in through the real credentials form and saves the
// session so the authed project can reuse it (no re-login per test).
setup("authenticate", async ({ page }) => {
  await page.goto("/auth/signin");
  await page.fill('input[name="email"]', TEST_USER.email);
  await page.fill('input[name="password"]', TEST_USER.password);
  await page.click('button[type="submit"]');

  // On success the form pushes to /feed; onboarding is complete so no bounce.
  await page.waitForURL(/\/feed/, { timeout: 15_000 });
  await expect(page).toHaveURL(/\/feed/);

  await page.context().storageState({ path: AUTH_FILE });
});
