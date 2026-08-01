import { PrismaClient } from "@/generated/prisma/client";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: pg.Pool | undefined;
};

// Cache the pool on globalThis too — otherwise dev HMR leaks a new pg.Pool on
// every reload while the PrismaClient below is correctly reused.
//
// Bounded per-instance pool: on Vercel every serverless instance opens its own
// pool, so an unbounded default (max 10) × many instances exhausts the DB's
// connections. `max: 5` caps each instance; the pgBouncer transaction pooler
// (DATABASE_URL, port 6543) multiplexes those onto far fewer server conns.
// connectionTimeout fails fast instead of hanging when the pool is saturated.
const pool =
  globalForPrisma.pool ??
  new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000,
  });

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ adapter: new PrismaPg(pool) });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.pool = pool;
}
