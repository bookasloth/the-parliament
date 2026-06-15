import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { computeIsAdmin } from "@/modules/auth/admin";

function generateUsername(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return base || `user-${Date.now().toString(36)}`;
}

async function ensureUniqueUsername(base: string): Promise<string> {
  const existing = await prisma.user.findUnique({ where: { username: base } });
  if (!existing) return base;
  for (let i = 2; i < 100; i++) {
    const candidate = `${base}-${i}`;
    const exists = await prisma.user.findUnique({ where: { username: candidate } });
    if (!exists) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

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
    Google,
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string;
        const password = credentials?.password as string;
        if (!email || !password) return null;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null;
        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;
        return { id: user.id, email: user.email, name: user.legalName };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        const email = user.email;
        if (!email) return false;

        const existingUser = await prisma.user.findUnique({ where: { email } });

        if (existingUser) {
          const existingCredential = await prisma.userCredential.findFirst({
            where: { provider: "google", providerUid: account.providerAccountId },
          });

          if (!existingCredential) {
            await prisma.userCredential.create({
              data: {
                userId: existingUser.id,
                provider: "google",
                providerUid: account.providerAccountId,
                accessToken: account.access_token,
                refreshToken: account.refresh_token,
                expiresAt: account.expires_at ? new Date(account.expires_at * 1000) : null,
              },
            });
          }

          await prisma.user.update({
            where: { id: existingUser.id },
            data: {
              emailVerifiedAt: existingUser.emailVerifiedAt ?? new Date(),
              lastLoginAt: new Date(),
              status: "active",
            },
          });
        } else {
          const baseUsername = generateUsername(user.name || email.split("@")[0]);
          const username = await ensureUniqueUsername(baseUsername);

          const newUser = await prisma.user.create({
            data: {
              email,
              legalName: user.name || email.split("@")[0],
              displayName: user.name || "",
              username,
              emailVerifiedAt: new Date(),
              lastLoginAt: new Date(),
              status: "active",
              verificationStatus: "pending",
              onboardingStep: "profile",
              onboardingCompleted: false,
              profileCompletion: 0,
              membershipStatus: "free",
              memberType: "alumni",
            },
          });

          await prisma.userCredential.create({
            data: {
              userId: newUser.id,
              provider: "google",
              providerUid: account.providerAccountId,
              accessToken: account.access_token,
              refreshToken: account.refresh_token,
              expiresAt: account.expires_at ? new Date(account.expires_at * 1000) : null,
            },
          });
        }
      }
      return true;
    },
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
