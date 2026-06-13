import "dotenv/config";
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

  console.log("Seed complete:");
  console.log(`  School: ${school.name}`);
  console.log(`  Houses: ${HOUSES.length}`);
  console.log(`  Divisions: Nagpur (default) + Jind`);
  console.log(`  Batches: ${currentYear - 1990 + 1} (1990-${currentYear + 7})`);
  console.log(`  Interests: ${INTERESTS.length}`);
  console.log(`  Post categories: ${POST_CATEGORIES.length}`);
  console.log(`  Karma thresholds: ${KARMA_THRESHOLDS.length}`);
  console.log(`  Business categories: ${BUSINESS_CATEGORIES.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
