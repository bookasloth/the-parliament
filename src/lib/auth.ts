import { cache } from "react";
import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { cached, invalidate } from "@/lib/redis";
import { computeIsAdmin } from "@/modules/auth/admin";
import { enforceRateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";
import { shouldRefreshToken } from "@/lib/session-refresh";
import { resolveActivePlan, type MembershipRow } from "@/lib/membership-cycle";
import type { BenefitTier, PlanCode } from "@/config/membership";

// Precomputed once at module load. Compared against for unknown emails so an
// existing account and a nonexistent one take the same ~bcrypt time — closes
// the login-timing user-enumeration channel.
const DUMMY_HASH = bcrypt.hashSync("no-such-user-placeholder", 12);

export const { handlers, auth: baseAuth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  // Required when running behind a reverse proxy / managed host (Railway, a VPS
  // with Caddy/Nginx, etc.) — Auth.js otherwise rejects the forwarded host.
  trustHost: true,
  // Stay signed in for 30 days (absolute cap); the JWT is re-issued at most once
  // a day of activity (updateAge) so a long-idle token stops refreshing. A
  // shorter, separate admin-only idle timeout is future hardening.
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60, updateAge: 24 * 60 * 60 },
  pages: {
    signIn: "/auth/signin",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        const email = credentials?.email as string;
        const password = credentials?.password as string;
        if (!email || !password) return null;

        // Throttle online brute force / credential stuffing. The credentials
        // path had no limiter (signup/forgot did). DB-backed limiter is shared
        // across serverless instances. IP is the primary guard; the per-email
        // cap is kept high enough that a legit user's retries don't lock them
        // out (a low cap would let an attacker DoS a victim's account).
        const ip =
          request?.headers?.get("x-forwarded-for")?.split(",")[0]?.trim() ||
          "unknown";
        await enforceRateLimit({ bucket: "auth.login.ip", identifier: ip, limit: 20, windowSec: 900 });
        await enforceRateLimit({ bucket: "auth.login.email", identifier: email.toLowerCase(), limit: 8, windowSec: 900 });

        const user = await prisma.user.findUnique({ where: { email } });
        // Always run a compare (dummy hash when the user/hash is absent) so the
        // response time doesn't reveal whether the email is registered.
        const valid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
        if (!user?.passwordHash || !valid) {
          // Audit trail for failed logins (brute-force/credential-stuffing
          // forensics). Never log the password. IP goes in the JSON payload.
          await audit({ action: "auth.login.failed", payload: { email: email.toLowerCase(), ip } });
          return null;
        }
        // Block sign-in until the email is confirmed (self-signups start
        // unverified). Imported members verify via the reset flow.
        if (!user.emailVerifiedAt) {
          await audit({ actorId: user.id, action: "auth.login.unverified", payload: { ip } });
          return null;
        }
        await audit({ actorId: user.id, action: "auth.login.success", payload: { ip } });
        return { id: user.id, email: user.email, name: user.legalName };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, trigger }) {
      if (!token.sub) return token;
      // The JWT strategy is meant to be DB-free, but this callback used to run a
      // prisma.user.findUnique on EVERY request. Gate it: sign-in / explicit
      // session.update() always refresh; a fresh token missing its enriched
      // fields refreshes; otherwise reuse the token until it's older than the
      // TTL. Steady-state navigation now makes NO user query. Role/membership
      // changes propagate within REFRESH_TTL_SEC (60s) — the membership
      // activation flow doesn't call session.update(), so keep this short so a
      // paid upgrade shows in the navbar within a minute.
      const now = Math.floor(Date.now() / 1000);
      const mustRefresh = shouldRefreshToken({
        trigger,
        membershipStatus: token.membershipStatus,
        onboardingCompleted: token.onboardingCompleted,
        refreshedAt: token.refreshedAt,
        now,
      });
      if (!mustRefresh) return token;
      try {
        const user = await cached(
          `session:${token.sub}`,
          300, // 5 min
          () => prisma.user.findUnique({
            where: { id: token.sub },
            select: {
              email: true,
              legalName: true,
              displayName: true,
              onboardingStep: true,
              onboardingCompleted: true,
              username: true,
              isSuperAdmin: true,
              status: true,
              createdAt: true,
              isVerified: true,
              userRoles: { select: { role: true } },
              memberships: {
                where: { status: "active" },
                select: { planCode: true, benefitTier: true, startedAt: true, endsAt: true, status: true },
              },
            },
          }),
        );
        if (user) {
          token.name = user.displayName || user.legalName;
          token.onboardingStep = user.onboardingStep;
          token.onboardingCompleted = user.onboardingCompleted;
          // Membership on the session claim is the RESOLVED plan (row truth via
          // resolveActivePlan), never the raw membershipStatus column. This keeps
          // every string reader (feed, games archive, directory, navbar) in sync
          // with the real Membership rows: a suspended member resolves to
          // "inactive", an expired one to "student", and the legacy "free" column
          // value can never leak through.
          const resolved = resolveActivePlan(
            { status: user.status, createdAt: user.createdAt, isVerified: user.isVerified },
            user.memberships.map((m): MembershipRow => ({
              planCode: m.planCode as PlanCode,
              benefitTier: m.benefitTier as BenefitTier,
              startedAt: m.startedAt,
              endsAt: m.endsAt,
              status: m.status,
            })),
          );
          token.membershipStatus = resolved.planCode;
          token.username = user.username ?? undefined;
          token.roles = user.userRoles.map((r) => r.role);
          token.isAdmin = computeIsAdmin({
            email: user.email,
            isSuperAdmin: user.isSuperAdmin,
            roles: token.roles,
          });
          token.refreshedAt = now;
        }
      } catch (err) {
        // A transient DB blip must NOT drop the session — throwing here logs
        // the user out. Keep the existing token; it refreshes next request.
        console.error("jwt callback: user refresh failed, keeping token", err);
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.name = (token.name as string) ?? session.user.name;
        session.user.onboardingStep = token.onboardingStep as string;
        session.user.onboardingCompleted = token.onboardingCompleted as boolean;
        session.user.membershipStatus = token.membershipStatus as string;
        session.user.username = token.username as string;
        session.user.isAdmin = (token.isAdmin as boolean) ?? false;
        session.user.roles = (token.roles as string[]) ?? [];
      }
      return session;
    },
  },
  events: {
    // First-sign-in welcome for members who arrive already onboarded (imported/
    // migrated accounts that set a password via the reset flow and skip the
    // wizard). Dynamic import keeps the bot module (and its feed/messaging deps)
    // out of the auth bundle's load graph. Best-effort — the helper swallows its
    // own errors so a bot hiccup can never block a login.
    async signIn({ user }) {
      if (!user?.id) return;
      const { maybeWelcomeOnSignIn } = await import("@/modules/bot/service");
      await maybeWelcomeOnSignIn(user.id);
    },
  },
});

// Request-scoped dedupe. Auth.js v5 runs the jwt callback (a prisma.user
// .findUnique) on EVERY auth() call, and the layout+page+API each call it, so a
// single page render fired 3-5 identical user lookups. React cache() collapses
// repeat auth() calls within one request/render to one execution. Request-scoped
// — no cross-request leak, correctness unchanged. All call sites use bare auth().
export const auth = cache(baseAuth);
