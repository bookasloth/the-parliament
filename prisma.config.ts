import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // CLI (migrate/studio) uses the session-mode pooler; app runtime uses the
    // transaction-mode pooler via src/lib/prisma.ts (DATABASE_URL).
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL!,
  },
});
