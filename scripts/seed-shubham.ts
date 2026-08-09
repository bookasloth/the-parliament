import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const EMAIL = "sndatarkar@gmail.com";
const PASSWORD = "Shubham@2026";
const USERNAME = "shubham-datarkar";

async function main() {
  const school = await prisma.school.findUnique({ where: { slug: "ngp" } });
  if (!school) throw new Error("School 'ngp' not seeded.");

  const [house, batch, division, interests] = await Promise.all([
    prisma.house.findUnique({ where: { schoolId_name: { schoolId: school.id, name: "Udaigiri" } } }),
    prisma.batch.findUnique({ where: { schoolId_startYear: { schoolId: school.id, startYear: 2006 } } }),
    prisma.division.findUnique({ where: { schoolId_name: { schoolId: school.id, name: "Nagpur" } } }),
    prisma.interest.findMany({ where: { slug: { in: ["networking", "jobs", "mentorship"] } } }),
  ]);
  if (!house || !batch || !division) throw new Error("Missing seed rows (Udaigiri/2006 batch/Nagpur).");

  const passwordHash = await bcrypt.hash(PASSWORD, 12);
  const verifiedOn = new Date("2023-08-02");

  const BIO = [
    "Shubham N Datarkar — aka The Kalamwala.",
    "Started with words, moved into marketing, now build products at the intersection of marketing, tech, and AI.",
    "Founder of The Bogus Company & Book A Sloth. I find friction and delete it.",
  ].join(" ");

  const user = await prisma.user.upsert({
    where: { email: EMAIL },
    update: {},
    create: { email: EMAIL, legalName: "Shubham N Datarkar", username: USERNAME },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: {
      schoolId: school.id,
      username: USERNAME,
      legalName: "Shubham N Datarkar",
      displayName: "Shubham N Datarkar",
      passwordHash,
      memberType: "alumni",
      dateOfBirth: new Date("1995-06-03"),
      gender: "male",
      yearsStudied: 7,
      currentStatus: "working",
      mobileE164: "+918637758344",
      mobileVerifiedAt: verifiedOn,
      emailVerifiedAt: verifiedOn,
      isVerified: true,
      verifiedAt: verifiedOn,
      verificationStatus: "approved",
      status: "active",
      passOutYear: 2013,
      // Must match the active life Membership row created below, else the
      // denormalized column drifts from the ledger (premium col vs life rows).
      membershipStatus: "life",
      benefitTier: "premium",
      membershipCycleStart: verifiedOn,
      onboardingStep: "complete",
      onboardingCompleted: true,
      profileCompletion: 91,
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
      headline: "Marketing Lead at Grey Hawks Media · Founder, The Bogus Company & Book A Sloth",
      bio: BIO,
      city: "Nagpur, Maharashtra, India",
      homeTown: "Nagpur, India",
      correspondenceAddress: "At. Nandori, Saoner, India, 441112",
      profession: "Marketing & Product",
      company: "Grey Hawks Media Pvt Ltd",
      designation: "Marketing Lead",
      industry: "Advertising & Software",
      department: "Marketing",
      higherEducation: "BCA, Nagpur University (2013–2016)",
      linkedinUrl: "https://www.linkedin.com/in/sndatarkar",
      socialLinks: {
        linkedin: "https://www.linkedin.com/in/sndatarkar",
        website: "https://thekalamwala.com",
        bookasloth: "https://bookasloth.in",
      },
      skills: [
        "Digital Marketing",
        "Marketing Strategy",
        "Social Media Marketing",
        "Copywriting",
        "SEO",
        "Content Marketing",
        "Performance Marketing",
        "Product Thinking",
        "Automation",
        "AI",
      ],
      visibility: "alumni",
      whatsappOptIn: true,
      showOnMap: true,
      isComplete: true,
    },
  });

  const EXPERIENCES = [
    { title: "Marketing Assistant", company: "Book A Sloth", employmentType: "part-time", startDate: "2026-02-01", endDate: null, location: "Nagpur, Maharashtra, India", locationType: "hybrid", description: "Marketing Operations, CRM.", skills: ["Marketing Operations", "CRM"] },
    { title: "Marketing Lead", company: "Grey Hawks Media Pvt Ltd", employmentType: "full-time", startDate: "2025-06-01", endDate: null, location: "Nagpur, Maharashtra, India", locationType: "remote", description: null, skills: [] },
    { title: "Marketing Strategist", company: "Grey Hawks Media Pvt Ltd", employmentType: "full-time", startDate: "2025-01-01", endDate: "2025-06-01", location: "Nagpur, Maharashtra, India", locationType: "remote", description: null, skills: [] },
    { title: "Wordpress Developer", company: "Grey Hawks Media Pvt Ltd", employmentType: "freelance", startDate: "2022-06-01", endDate: "2024-12-01", location: "Nagpur Rural, Maharashtra, India", locationType: "remote", description: null, skills: ["WordPress"] },
    { title: "Full-stack Developer", company: "The Bogus Company", employmentType: "freelance", startDate: "2022-06-01", endDate: null, location: "Remote", locationType: "remote", description: null, skills: [] },
    { title: "Blogger", company: "The Kalamwala", employmentType: "self-employed", startDate: "2020-03-01", endDate: "2025-06-01", location: "Nagpur, Maharashtra, India", locationType: "on-site", description: null, skills: ["Literary Writing", "Non-fiction Writing"] },
    { title: "Content Marketing Strategist", company: "ZestCreative", employmentType: "full-time", startDate: "2024-04-01", endDate: "2025-03-01", location: "Pune District, Maharashtra, India", locationType: "on-site", description: "Gave it a shot for a year against the odds. Not worth it.", skills: ["Search Engine Marketing (SEM)", "Content Marketing"] },
    { title: "Senior Copywriter", company: "The Fleek Media", employmentType: "full-time", startDate: "2024-01-01", endDate: "2024-04-01", location: "Ahmedabad, Gujarat, India", locationType: "remote", description: null, skills: ["Writing", "Written Communication"] },
    { title: "Creative Copywriter", company: "8Spades Advertising Pvt. Ltd.", employmentType: "full-time", startDate: "2021-06-01", endDate: "2024-01-01", location: "Chennai, Tamil Nadu, India", locationType: "on-site", description: "Stone & Acres: The Plot of Our Story. Newspaper ads, Animation TVC for Disney Hotstar (IPL 2021).", skills: ["Online Marketing", "Creative Briefs"] },
    { title: "SEO Intern", company: "The Bogus Company", employmentType: "internship", startDate: "2021-03-01", endDate: "2021-06-01", location: "Nagpur, Maharashtra, India", locationType: "hybrid", description: null, skills: ["On-Page SEO", "SEO Audits"] },
    { title: "Farmer", company: "Vandana Farms", employmentType: "self-employed", startDate: "2019-09-01", endDate: "2021-03-01", location: "Nagpur, Maharashtra, India", locationType: null, description: "Goat farm, vegetables, teak and sandalwood.", skills: [] },
    { title: "Content Marketer", company: "Nexon Mediatech Pvt. Ltd", employmentType: "full-time", startDate: "2018-05-01", endDate: "2019-10-01", location: "Nagpur, Maharashtra, India", locationType: null, description: "Content creation, SEO strategies, social media presence.", skills: ["Search Engine Marketing (SEM)", "Writing"] },
    { title: "Digital Marketing Specialist", company: "Digi Mark Technologies", employmentType: "full-time", startDate: "2017-03-01", endDate: "2018-03-01", location: "Nagpur, Maharashtra, India", locationType: null, description: "Ads, web copies, blogs, landing pages for clients.", skills: ["Organic Search", "Search Engine Marketing (SEM)"] },
    { title: "Website Designer", company: "Web Paper Studio", employmentType: "internship", startDate: "2016-09-01", endDate: "2017-02-01", location: "Nagpur, Maharashtra, India", locationType: null, description: null, skills: ["Web Design", "Web Development"] },
  ];
  await prisma.experience.deleteMany({ where: { userId: user.id } });
  await prisma.experience.createMany({
    data: EXPERIENCES.map((e, i) => ({
      userId: user.id,
      title: e.title,
      company: e.company,
      employmentType: e.employmentType,
      startDate: new Date(e.startDate),
      endDate: e.endDate ? new Date(e.endDate) : null,
      location: e.location,
      locationType: e.locationType,
      description: e.description,
      skills: e.skills,
      sortOrder: i,
    })),
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
    update: { karmaBalance: 480, earnedKarma30d: 60, lifetimeEarned: 730 },
    create: { userId: user.id, karmaBalance: 480, earnedKarma30d: 60, lifetimeEarned: 730 },
  });

  // Active membership ledger row so getCurrent()/resolveActivePlan sees life,
  // not just the denormalized User.membershipStatus. Idempotent — a real
  // payment may already have written this row, so skip if one exists.
  const activeLife = await prisma.membership.findFirst({
    where: { userId: user.id, status: "active", planCode: "life" },
  });
  if (!activeLife) {
    await prisma.membership.updateMany({
      where: { userId: user.id, status: "active" },
      data: { status: "superseded" },
    });
    await prisma.membership.create({
      data: {
        userId: user.id,
        planCode: "life",
        benefitTier: "premium",
        status: "active",
        startedAt: verifiedOn,
        endsAt: null,
        amountPaise: 999900, // PLANS.life.pricePaise
        source: "admin_grant",
      },
    });
  }

  console.log("Seeded real alumnus:");
  console.log(`  ${EMAIL} / ${PASSWORD}  → /profile/${USERNAME}`);
  console.log(`  Shubham N Datarkar · Udaigiri · Batch ${batch.label} · premium · verified 2023-08-02`);
  console.log(`  Interests: ${interests.map((i) => i.slug).join(", ")}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
