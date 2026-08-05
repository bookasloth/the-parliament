import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { colorAvatar } from "@/lib/avatar";
import { checkRateLimit } from "@/lib/rate-limit";
import { createEmailCode } from "@/lib/email-code";
import { sendEmail } from "@/lib/email";
import { getDefaultSchoolId } from "@/lib/school";
import { parseBatchValue } from "@/lib/houses";
import { revalidateTag } from "next/cache";

export const signupSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
  // Optional JNV identity collected on the signup card.
  house: z.string().trim().max(40).optional(),
  batchValue: z.string().trim().regex(/^\d{4}-\d{4}$/, "Invalid batch").optional(),
});

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export function generateUsername(name: string): string {
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

export async function POST(req: NextRequest) {
  try {
    const ip = clientIp(req);
    const limit = await checkRateLimit({
      bucket: "auth.signup.ip",
      identifier: ip,
      limit: 5,
      windowSec: 3600,
    });
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Too many signup attempts. Try again later." },
        { status: 429 },
      );
    }

    const parsed = signupSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }
    const { name, email, password, house, batchValue } = parsed.data;

    const normalizedEmail = email;
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 },
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const baseUsername = generateUsername(name);
    const username = await ensureUniqueUsername(baseUsername);

    // Self-signup does NOT prove email ownership. Create the account with a null
    // emailVerifiedAt; the credentials login gate rejects it until the emailed
    // verification link is clicked (imported members verify via the reset flow).
    const user = await prisma.user.create({
      data: {
        legalName: name,
        email: normalizedEmail,
        username,
        passwordHash: hashedPassword,
        emailVerifiedAt: null,
        status: "active",
        onboardingStep: "profile",
      },
    });

    // Resolve the optional JNV house + batch picked on the signup card.
    // ponytail: no gender/era validation here — signup collects neither, so we
    // store the pick as-is; profile edit enforces era rules if it's changed.
    let houseId: string | null = null;
    let batchId: string | null = null;
    const schoolId = await getDefaultSchoolId();
    if (schoolId) {
      const years = batchValue ? parseBatchValue(batchValue) : null;
      if (years) {
        const b = await prisma.batch.upsert({
          where: { schoolId_startYear: { schoolId, startYear: years.startYear } },
          update: {},
          create: {
            schoolId,
            startYear: years.startYear,
            endYear: years.endYear,
            label: `${years.startYear}-${years.endYear}`,
          },
          select: { id: true },
        });
        batchId = b.id;
      }
      if (house) {
        const h = await prisma.house.findFirst({
          where: { schoolId, name: { equals: house, mode: "insensitive" } },
          select: { id: true },
        });
        houseId = h?.id ?? null;
      }
    }

    // Give new members a default colour avatar (shown until they upload a photo).
    await prisma.profile.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id, photoUrl: colorAvatar(user.id), houseId, batchId },
    });

    // New active member belongs in the community directory (cached under the
    // "directory" tag) — surface them now instead of waiting out the revalidate.
    revalidateTag("directory", "max");

    // Auto-follow every new member with Shubham (the network anchor), both ways.
    const anchor = await prisma.user.findUnique({
      where: { email: "sndatarkar@gmail.com" },
      select: { id: true },
    });
    if (anchor && anchor.id !== user.id) {
      await prisma.follow.createMany({
        data: [
          { followerId: anchor.id, followingId: user.id },
          { followerId: user.id, followingId: anchor.id },
        ],
        skipDuplicates: true,
      });
    }

    // Issue + email a 5-character verification code. A mail failure must not
    // fail signup (the account exists; the code can be resent), so best-effort.
    let devCode: string | undefined;
    try {
      const code = await createEmailCode(user.id);
      if (!process.env.SMTP_HOST) devCode = code; // dev: no SMTP → surface for testing
      await sendEmail("email_verification", user.email, {
        legalName: user.legalName,
        code,
      }, user.id);
    } catch (mailErr) {
      console.error("signup verification email failed:", mailErr);
    }

    return NextResponse.json({ ok: true, verifyEmailSent: true, devCode });
  } catch (e) {
    console.error("signup error:", e);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 },
    );
  }
}
