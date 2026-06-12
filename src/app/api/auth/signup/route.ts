import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

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

    await prisma.user.create({
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

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 },
    );
  }
}
