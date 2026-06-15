import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const HOUSES = [
  { name: "Aravali", colorName: "blue", colorHex: "#1e3a8a" },
  { name: "Nilgiri", colorName: "green", colorHex: "#15803d" },
  { name: "Shiwalik", colorName: "red", colorHex: "#b91c1c" },
  { name: "Udaigiri", colorName: "yellow", colorHex: "#ca8a04" },
  { name: "Indira", colorName: "orange", colorHex: "#ea580c" },
  { name: "Laxmi", colorName: "pink", colorHex: "#db2777", isGirlsOnly: true },
];

const POST_CATEGORIES = [
  { key: "career_update", label: "Career Update" },
  { key: "job_opening", label: "Job Opening" },
  { key: "achievement", label: "Achievement" },
  { key: "startup", label: "Startup" },
  { key: "seeking_help", label: "Seeking Help" },
  { key: "mentorship", label: "Mentorship" },
  { key: "school_memory", label: "School Memory" },
  { key: "event", label: "Event" },
];

const KARMA_THRESHOLDS = [
  { name: "reader", label: "Reader", minKarma: 0, sortOrder: 0, color: "#94a3b8" },
  { name: "commenter", label: "Commenter", minKarma: 25, sortOrder: 1, color: "#0ea5e9" },
  { name: "poster", label: "Poster", minKarma: 50, sortOrder: 2, color: "#22c55e" },
  { name: "poller", label: "Poller", minKarma: 100, sortOrder: 3, color: "#f59e0b" },
  { name: "group_leader", label: "Group Leader", minKarma: 250, sortOrder: 4, color: "#8b5cf6" },
  { name: "mentor", label: "Mentor", minKarma: 500, sortOrder: 5, color: "#ec4899" },
];

const INTERESTS = [
  { slug: "mentorship", name: "Mentorship" },
  { slug: "networking", name: "Networking" },
  { slug: "jobs", name: "Jobs" },
  { slug: "business", name: "Business" },
  { slug: "events", name: "Events" },
  { slug: "donations", name: "Donations" },
  { slug: "volunteering", name: "Volunteering" },
];

const BUSINESS_CATEGORIES = [
  { key: "consulting", label: "Consulting" },
  { key: "tech", label: "Tech & Software" },
  { key: "education", label: "Education" },
  { key: "healthcare", label: "Healthcare" },
  { key: "retail", label: "Retail & E-commerce" },
  { key: "food", label: "Food & Beverage" },
  { key: "finance", label: "Finance" },
  { key: "other", label: "Other" },
];

// Sample alumni so the directory / feed / admin aren't empty during the beta.
// These are real DB rows (idempotent upsert by email). Default password for all
// is "Password123!" so you can also log in as any of them while testing.
const SAMPLE_USERS = [
  { name: "Neha Gupta", username: "neha-gupta", email: "neha.gupta@example.com", house: "Udaigiri", startYear: 2001, passOutYear: 2008, membership: "life", verified: true, karma: 1240, city: "Lucknow, UP", profession: "IAS Officer", company: "Govt. of India", headline: "IAS Officer · Govt. of India", photoUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&h=200&fit=crop&crop=face" },
  { name: "Amit Verma", username: "amit-verma", email: "amit.verma@example.com", house: "Aravali", startYear: 1998, passOutYear: 2005, membership: "committee", verified: true, karma: 2890, city: "New Delhi", profession: "Cardiologist", company: "AIIMS Delhi", headline: "Cardiologist · AIIMS Delhi", photoUrl: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=200&h=200&fit=crop&crop=face" },
  { name: "Priya Sharma", username: "priya-sharma", email: "priya.sharma@example.com", house: "Nilgiri", startYear: 2003, passOutYear: 2010, membership: "premium", verified: true, karma: 876, city: "Bangalore, KA", profession: "Software Engineer", company: "Google", headline: "Software Engineer · Google", photoUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face" },
  { name: "Vikram Singh", username: "vikram-singh", email: "vikram.singh@example.com", house: "Shiwalik", startYear: 2000, passOutYear: 2007, membership: "premium", verified: true, karma: 1530, city: "Pune, MH", profession: "Founder", company: "EduStart", headline: "Founder · EduStart", photoUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face" },
  { name: "Rahul Mehta", username: "rahul-mehta", email: "rahul.mehta@example.com", house: "Udaigiri", startYear: 2005, passOutYear: 2012, membership: "student", verified: false, karma: 445, city: "Mumbai, MH", profession: "Product Designer", company: "Figma", headline: "Product Designer · Figma", photoUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=face" },
  { name: "Sunita Patel", username: "sunita-patel", email: "sunita.patel@example.com", house: "Nilgiri", startYear: 2002, passOutYear: 2009, membership: "associate", verified: true, karma: 990, city: "Bangalore, KA", profession: "Research Scientist", company: "IISc", headline: "Research Scientist · IISc", photoUrl: "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=200&h=200&fit=crop&crop=face" },
  { name: "Arjun Nair", username: "arjun-nair", email: "arjun.nair@example.com", house: "Aravali", startYear: 1999, passOutYear: 2006, membership: "associate", verified: false, karma: 198, city: "Chennai, TN", profession: "Chartered Accountant", company: "Deloitte India", headline: "CA · Deloitte India", photoUrl: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&h=200&fit=crop&crop=face" },
  { name: "Kavya Reddy", username: "kavya-reddy", email: "kavya.reddy@example.com", house: "Indira", startYear: 2004, passOutYear: 2011, membership: "premium", verified: true, karma: 312, city: "Hyderabad, TS", profession: "Architect", company: "Hafeez Contractor", headline: "Architect · Hafeez Contractor", photoUrl: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=200&h=200&fit=crop&crop=face" },
  { name: "Deepa Krishnan", username: "deepa-krishnan", email: "deepa.krishnan@example.com", house: "Laxmi", startYear: 2001, passOutYear: 2008, membership: "associate", verified: true, karma: 445, city: "Mumbai, MH", profession: "Journalist", company: "NDTV", headline: "Journalist · NDTV", photoUrl: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=200&h=200&fit=crop&crop=face" },
];

async function main() {
  const school = await prisma.school.upsert({
    where: { slug: "ngp" },
    update: {},
    create: {
      name: "Jawahar Navodaya Vidyalaya, Navegaon Khairi, Nagpur",
      slug: "ngp",
    },
  });

  for (const h of HOUSES) {
    await prisma.house.upsert({
      where: { schoolId_name: { schoolId: school.id, name: h.name } },
      update: { colorName: h.colorName, colorHex: h.colorHex },
      create: { schoolId: school.id, ...h },
    });
  }

  for (const name of ["Nagpur", "Jind"]) {
    await prisma.division.upsert({
      where: { schoolId_name: { schoolId: school.id, name } },
      update: {},
      create: { schoolId: school.id, name, isDefault: name === "Nagpur" },
    });
  }

  const currentYear = new Date().getFullYear();
  for (let startYear = 1990; startYear <= currentYear; startYear++) {
    const endYear = startYear + 7;
    await prisma.batch.upsert({
      where: { schoolId_startYear: { schoolId: school.id, startYear } },
      update: {},
      create: {
        schoolId: school.id,
        startYear,
        endYear,
        label: `${startYear}-${endYear}`,
      },
    });
  }

  for (const interest of INTERESTS) {
    await prisma.interest.upsert({
      where: { slug: interest.slug },
      update: {},
      create: interest,
    });
  }

  for (const c of POST_CATEGORIES) {
    await prisma.postCategory.upsert({
      where: { schoolId_key: { schoolId: school.id, key: c.key } },
      update: { label: c.label },
      create: { schoolId: school.id, ...c },
    });
  }

  for (const t of KARMA_THRESHOLDS) {
    await prisma.karmaThreshold.upsert({
      where: { schoolId_name: { schoolId: school.id, name: t.name } },
      update: { label: t.label, minKarma: t.minKarma, sortOrder: t.sortOrder, color: t.color },
      create: { schoolId: school.id, ...t },
    });
  }

  for (const c of BUSINESS_CATEGORIES) {
    await prisma.businessCategory.upsert({
      where: { schoolId_key: { schoolId: school.id, key: c.key } },
      update: { label: c.label },
      create: { schoolId: school.id, ...c },
    });
  }

  // Sample alumni (idempotent by email).
  const houseRows = await prisma.house.findMany({ where: { schoolId: school.id } });
  const houseByName = new Map(houseRows.map((h) => [h.name, h]));
  const samplePasswordHash = await bcrypt.hash("Password123!", 12);
  for (const s of SAMPLE_USERS) {
    const batch = await prisma.batch.findUnique({
      where: { schoolId_startYear: { schoolId: school.id, startYear: s.startYear } },
    });
    const house = houseByName.get(s.house);
    const sampleUser = await prisma.user.upsert({
      where: { email: s.email },
      update: {},
      create: {
        schoolId: school.id,
        email: s.email,
        username: s.username,
        legalName: s.name,
        displayName: s.name,
        passwordHash: samplePasswordHash,
        emailVerifiedAt: new Date(),
        status: "active",
        isVerified: s.verified,
        verifiedAt: s.verified ? new Date() : null,
        verificationStatus: s.verified ? "verified" : "pending",
        membershipStatus: s.membership,
        memberType: "alumni",
        passOutYear: s.passOutYear,
        onboardingStep: "complete",
        onboardingCompleted: true,
        profileCompletion: 80,
      },
    });
    await prisma.profile.upsert({
      where: { userId: sampleUser.id },
      update: {},
      create: {
        userId: sampleUser.id,
        houseId: house?.id ?? null,
        batchId: batch?.id ?? null,
        city: s.city,
        profession: s.profession,
        company: s.company,
        headline: s.headline,
        photoUrl: s.photoUrl,
        isComplete: true,
        visibility: "alumni",
      },
    });
    await prisma.userKarma.upsert({
      where: { userId: sampleUser.id },
      update: {},
      create: {
        userId: sampleUser.id,
        karmaBalance: s.karma,
        earnedKarma30d: s.karma,
        lifetimeEarned: s.karma,
      },
    });
  }

  // Bootstrap admin. Email comes from ADMIN_EMAIL (or the first ADMIN_EMAILS
  // entry); password from ADMIN_PASSWORD. The user is granted isSuperAdmin +
  // an "admin" role so they can sign in with credentials and reach /admin.
  const adminEmail =
    process.env.ADMIN_EMAIL ||
    (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim()).filter(Boolean)[0] ||
    "";
  let adminSeeded: string | null = null;
  if (adminEmail) {
    const adminPassword = process.env.ADMIN_PASSWORD || "ChangeMe123!";
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    const username = adminEmail.split("@")[0].replace(/[^a-z0-9]/gi, "-").toLowerCase();
    const admin = await prisma.user.upsert({
      where: { email: adminEmail },
      update: { isSuperAdmin: true, status: "active" },
      create: {
        schoolId: school.id,
        email: adminEmail,
        username,
        legalName: "Platform Admin",
        displayName: "Admin",
        passwordHash,
        emailVerifiedAt: new Date(),
        status: "active",
        isVerified: true,
        verificationStatus: "verified",
        isSuperAdmin: true,
        onboardingStep: "complete",
        onboardingCompleted: true,
        membershipStatus: "free",
        memberType: "alumni",
      },
    });
    await prisma.userRole.upsert({
      where: { userId_role: { userId: admin.id, role: "admin" } },
      update: {},
      create: { userId: admin.id, role: "admin" },
    });
    adminSeeded = adminEmail;
  }

  console.log("Seed complete:");
  console.log(`  School: ${school.name}`);
  console.log(`  Houses: ${HOUSES.length}`);
  console.log(`  Divisions: Nagpur (default) + Jind`);
  console.log(`  Batches: ${currentYear - 1990 + 1} (1990-${currentYear + 7})`);
  console.log(`  Interests: ${INTERESTS.length}`);
  console.log(`  Post categories: ${POST_CATEGORIES.length}`);
  console.log(`  Karma thresholds: ${KARMA_THRESHOLDS.length}`);
  console.log(`  Business categories: ${BUSINESS_CATEGORIES.length}`);
  console.log(`  Sample alumni: ${SAMPLE_USERS.length} (password: Password123!)`);
  console.log(`  Admin: ${adminSeeded ?? "(none — set ADMIN_EMAIL to seed one)"}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
