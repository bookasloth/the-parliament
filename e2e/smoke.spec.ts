import { test, expect } from "@playwright/test";

// Public-surface smoke: pages that render logged-out (middleware PUBLIC_ROUTES).
// No writes — safe. Catches build/render regressions on the public entry points.

test("homepage renders", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

  const res = await page.goto("/");
  expect(res?.status()).toBeLessThan(400);
  await expect(page).toHaveTitle(/NNAWCA|JNV/i);
  // No uncaught page errors.
  const pageErrors: string[] = [];
  page.on("pageerror", (e) => pageErrors.push(e.message));
  await page.waitForLoadState("networkidle");
  expect(pageErrors, pageErrors.join("\n")).toHaveLength(0);
});

test("sign-in page shows the credential form", async ({ page }) => {
  await page.goto("/auth/signin");
  await expect(page.locator('input[type="email"], input[name="email"]').first()).toBeVisible();
  await expect(page.locator('input[type="password"]').first()).toBeVisible();
});

test("sign-up page renders", async ({ page }) => {
  const res = await page.goto("/auth/signup");
  expect(res?.status()).toBeLessThan(400);
  await expect(page.locator("form").first()).toBeVisible();
});

test("a public marketing page renders", async ({ page }) => {
  const res = await page.goto("/about");
  expect(res?.status()).toBeLessThan(400);
  await expect(page.locator("body")).toContainText(/NNAWCA|alumni|about/i);
});

test("gated route redirects logged-out user to sign-in", async ({ page }) => {
  await page.goto("/feed");
  await expect(page).toHaveURL(/\/auth\/signin/);
});
