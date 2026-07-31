import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { computeIsAdmin } from "@/modules/auth/admin";
import { enforceRateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";

// Precomputed once at module load. Compared against for unknown emails so an
// existing account and a nonexistent one take the same ~bcrypt time — closes
// the login-timing user-enumeration channel.
const DUMMY_HASH = bcrypt.hashSync("no-such-user-placeholder", 12);

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  // Required when running behind a reverse proxy / managed host (Railway, a VPS
  // with Caddy/Nginx, etc.) — Auth.js otherwise rejects the forwarded host.
  trustHost: true,
  session: { strategy: "jwt" },
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
    async jwt({ token }) {
      if (token.sub) {
        const user = await prisma.user.findUnique({
          where: { id: token.sub },
          select: {
            email: true,
            legalName: true,
            displayName: true,
            onboardingStep: true,
            onboardingCompleted: true,
            membershipStatus: true,
            username: true,
            isSuperAdmin: true,
            userRoles: { select: { role: true } },
          },
        });
        if (user) {
          token.name = user.displayName || user.legalName;
          token.onboardingStep = user.onboardingStep;
          token.onboardingCompleted = user.onboardingCompleted;
          token.membershipStatus = user.membershipStatus;
          token.username = user.username ?? undefined;
          token.roles = user.userRoles.map((r) => r.role);
          token.isAdmin = computeIsAdmin({
            email: user.email,
            isSuperAdmin: user.isSuperAdmin,
            roles: token.roles,
          });
        }
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
});
