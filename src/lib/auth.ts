import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
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
            onboardingStep: true,
            onboardingCompleted: true,
            membershipStatus: true,
            username: true,
          },
        });
        if (user) {
          token.onboardingStep = user.onboardingStep;
          token.onboardingCompleted = user.onboardingCompleted;
          token.membershipStatus = user.membershipStatus;
          token.username = user.username ?? undefined;
        }
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.onboardingStep = token.onboardingStep as string;
        session.user.onboardingCompleted = token.onboardingCompleted as boolean;
        session.user.membershipStatus = token.membershipStatus as string;
        session.user.username = token.username as string;
      }
      return session;
    },
  },
});
