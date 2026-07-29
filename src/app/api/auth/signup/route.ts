import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { colorAvatar } from "@/lib/avatar";

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

// Profiles live at the root (/<username>), so a username must not shadow a route.
const RESERVED_USERNAMES = new Set([
  "feed", "directory", "connections", "business", "businesses", "events", "groups",
  "membership", "notifications", "settings", "compose", "messages", "network",
  "profile", "admin", "auth", "api", "onboarding", "companies",
]);

async function ensureUniqueUsername(base: string): Promise<string> {
  const existing = RESERVED_USERNAMES.has(base)
    ? true
    : await prisma.user.findUnique({ where: { username: base } });
  if (!existing) return base;
  for (let i = 2; i < 100; i++) {
    const candidate = `${base}-${i}`;
    const exists = await prisma.user.findUnique({ where: { username: candidate } });
    if (!exists) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required" },
        { status: 400 },
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 },
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const baseUsername = generateUsername(name);
    const username = await ensureUniqueUsername(baseUsername);

    const user = await prisma.user.create({
      data: {
        legalName: name,
        email,
        username,
        passwordHash: hashedPassword,
        emailVerifiedAt: new Date(),
        status: "active",
        onboardingStep: "profile",
      },
    });

    // Give new members a default colour avatar (shown until they upload a photo).
    await prisma.profile.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id, photoUrl: colorAvatar(user.id) },
    });

    // Auto-connect every new member to Shubham (the network anchor).
    const anchor = await prisma.user.findUnique({
      where: { email: "sndatarkar@gmail.com" },
      select: { id: true },
    });
    if (anchor && anchor.id !== user.id) {
      await prisma.connection.upsert({
        where: { requesterId_addresseeId: { requesterId: anchor.id, addresseeId: user.id } },
        update: {},
        create: {
          requesterId: anchor.id,
          addresseeId: user.id,
          status: "accepted",
          autoAccepted: true,
          respondedAt: new Date(),
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("signup error:", e);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 },
    );
  }
}
