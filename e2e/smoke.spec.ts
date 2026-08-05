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

for (const path of ["/about", "/wall-of-honour", "/committee", "/join"]) {
  test(`public marketing page renders: ${path}`, async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (e) => pageErrors.push(e.message));
    const res = await page.goto(path);
    expect(res?.status(), `status ${path}`).toBeLessThan(400);
    expect(pageErrors, `client errors on ${path}:\n${pageErrors.join("\n")}`).toHaveLength(0);
  });
}

// The auth gate must protect the whole app surface — a regression here would
// leak gated pages. Each should bounce a logged-out user to sign-in.
for (const path of ["/feed", "/community", "/events", "/messages", "/compose", "/membership", "/settings", "/profile/edit"]) {
  test(`gated route redirects logged-out user: ${path}`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveURL(/\/auth\/signin/);
  });
}
