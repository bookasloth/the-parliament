import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const TEST_DB =
  process.env.TEST_DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/the_parliament_test";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/integration/**/*.itest.ts"],
    env: { DATABASE_URL: TEST_DB },
    globalSetup: ["./tests/integration/global-setup.ts"],
    setupFiles: ["./tests/integration/guard.ts"],
    // DB writes: run files serially so shared tables don't race.
    fileParallelism: false,
    hookTimeout: 60_000,
  },
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
});
