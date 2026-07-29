import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const EMAIL = "test-signup@nnawca-test.local";

async function main() {
  const user = await prisma.user.findUnique({ where: { email: EMAIL } });
  if (!user) throw new Error(`No user ${EMAIL} — sign up first.`);

  const school = await prisma.school.findUnique({ where: { slug: "ngp" } });
  if (!school) throw new Error("School 'ngp' not seeded.");

  const [house, batch, division, interests] = await Promise.all([
    prisma.house.findUnique({ where: { schoolId_name: { schoolId: school.id, name: "Nilgiri" } } }),
    prisma.batch.findUnique({ where: { schoolId_startYear: { schoolId: school.id, startYear: 2008 } } }),
    prisma.division.findUnique({ where: { schoolId_name: { schoolId: school.id, name: "Nagpur" } } }),
    prisma.interest.findMany({ where: { slug: { in: ["mentorship", "networking", "jobs"] } } }),
  ]);
  if (!house || !batch || !division) throw new Error("Missing seed rows (house/batch/division).");

  const now = new Date();
  const yearAhead = new Date(now); yearAhead.setFullYear(now.getFullYear() + 1);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      schoolId: school.id,
      legalName: "Aditya Kulkarni",
      displayName: "Aditya Kulkarni",
      memberType: "alumni",
      dateOfBirth: new Date("1997-03-14"),
      gender: "male",
      yearsStudied: 7,
      currentStatus: "working",
      mobileE164: "+919876543210",
      mobileVerifiedAt: now,
      emailVerifiedAt: now,
      isVerified: true,
      verifiedAt: now,
      verificationStatus: "approved",
      status: "active",
      passOutYear: 2015,
      membershipStatus: "premium",
      benefitTier: "premium",
      membershipCycleStart: now,
      membershipExpiresAt: yearAhead,
      onboardingStep: "complete",
      onboardingCompleted: true,
      profileCompletion: 100,
    },
  });

  await prisma.profile.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id },
  });
  await prisma.profile.update({
    where: { userId: user.id },
    data: {
      houseId: house.id,
      batchId: batch.id,
      photoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face",
      coverUrl: "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200&h=400&fit=crop",
      headline: "Senior Product Manager · Fintech · JNV Nagpur '15",
      bio: "Batch of 2015, Nilgiri house. Building payment products in Pune. Happy to mentor juniors breaking into product and tech. Ping me for referrals.",
      city: "Pune",
      profession: "Product Manager",
      company: "Razorpay",
      industry: "Technology · Fintech",
      designation: "Senior Product Manager",
      department: "Payments",
      higherEducation: "B.Tech, VNIT Nagpur · MBA, IIM Indore",
      skills: ["Product Strategy", "Fintech", "Roadmapping", "SQL", "User Research", "Go-to-Market"],
      linkedinUrl: "https://www.linkedin.com/in/aditya-kulkarni",
      socialLinks: { twitter: "https://twitter.com/aditya_k", website: "https://adityak.dev" },
      visibility: "alumni",
      whatsappOptIn: true,
      showOnMap: true,
      isComplete: true,
    },
  });

  await prisma.userDivision.upsert({
    where: { userId_divisionId: { userId: user.id, divisionId: division.id } },
    update: { isProtected: true },
    create: { userId: user.id, divisionId: division.id, isProtected: true },
  });

  if (interests.length) {
    await prisma.userInterest.createMany({
      data: interests.map((i) => ({ userId: user.id, interestId: i.id })),
      skipDuplicates: true,
    });
  }

  await prisma.userKarma.upsert({
    where: { userId: user.id },
    update: { karmaBalance: 320, earnedKarma30d: 45, lifetimeEarned: 512 },
    create: { userId: user.id, karmaBalance: 320, earnedKarma30d: 45, lifetimeEarned: 512 },
  });

  // Active membership ledger row so getCurrent()/resolveActivePlan sees premium,
  // not just the denormalized User.membershipStatus. Idempotent on re-run.
  const activePremium = await prisma.membership.findFirst({
    where: { userId: user.id, status: "active", planCode: "premium" },
  });
  if (!activePremium) {
    await prisma.membership.updateMany({
      where: { userId: user.id, status: "active" },
      data: { status: "superseded" },
    });
    const endsAt = new Date(now);
    endsAt.setDate(endsAt.getDate() + 365);
    await prisma.membership.create({
      data: {
        userId: user.id,
        planCode: "premium",
        benefitTier: "premium",
        status: "active",
        startedAt: now,
        endsAt,
        amountPaise: 99900, // PLANS.premium.pricePaise
        source: "admin_grant",
      },
    });
  }

  console.log("Test user filled as standard reference profile:");
  console.log(`  ${EMAIL} → Aditya Kulkarni`);
  console.log(`  House Nilgiri · Batch ${batch.label} · Division Nagpur`);
  console.log(`  Premium · verified · onboarding complete · karma 320`);
  console.log(`  Interests: ${interests.map((i) => i.slug).join(", ")}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
