import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { computeIsAdmin } from "@/modules/auth/admin";

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
