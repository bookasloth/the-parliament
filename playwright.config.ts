import { defineConfig, devices } from "@playwright/test";

// E2E runs the dev server against a LOCAL test DB — never prod. The webServer
// env pins DATABASE_URL to the throwaway *_test DB; @next/env won't override an
// already-set process.env var, so this wins over .env (production).
const TEST_DB =
  process.env.TEST_DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/the_parliament_test";
const PORT = 3100;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "line" : "list",
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [
    // Logs in once and saves the session for the authed project.
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    // Logged-out public smoke (no stored session).
    {
      name: "public",
      testMatch: /smoke\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    // Authed smoke — reuses the saved session, runs after setup.
    {
      name: "authed",
      testMatch: /authed\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], storageState: "e2e/.auth/user.json" },
      dependencies: ["setup"],
    },
  ],
  webServer: {
    command: `npm run dev -- --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { DATABASE_URL: TEST_DB, DIRECT_URL: TEST_DB },
  },
});
