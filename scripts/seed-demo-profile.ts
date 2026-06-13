// Demo seed — creates one fully-populated alumni so /profile/[username] can be viewed.
// Idempotent. Run: npx tsx scripts/seed-demo-profile.ts
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const school = await prisma.school.upsert({
    where: { slug: "ngp" },
    update: {},
    create: { name: "Jawahar Navodaya Vidyalaya, Navegaon Khairi, Nagpur", slug: "ngp" },
  });

  // House (no natural unique key → find-or-create)
  let house = await prisma.house.findFirst({ where: { schoolId: school.id, name: "Udaigiri" } });
  if (!house) {
    house = await prisma.house.create({
      data: { schoolId: school.id, name: "Udaigiri", colorName: "Yellow", colorHex: "#ffe135", slogan: "Rise like the sun" },
    });
  }

  const batch = await prisma.batch.upsert({
    where: { schoolId_startYear: { schoolId: school.id, startYear: 2006 } },
    update: {},
    create: { schoolId: school.id, startYear: 2006, endYear: 2013, label: "2006–2013" },
  });

  const user = await prisma.user.upsert({
    where: { username: "shubham-datarkar" },
    update: {
      membershipStatus: "premium",
      isVerified: true,
      verificationStatus: "approved",
      profileCompletion: 78,
    },
    create: {
      schoolId: school.id,
      email: "shubham.demo@nnawca.org",
      username: "shubham-datarkar",
      legalName: "Shubham Datarkar",
      displayName: "Shubham",
      memberType: "alumni",
      gender: "male",
      dateOfBirth: new Date("1995-06-03"),
      currentStatus: "alumni",
      status: "active",
      isVerified: true,
      verifiedAt: new Date("2023-08-07"),
      verificationStatus: "approved",
      membershipStatus: "premium",
      profileCompletion: 78,
      onboardingCompleted: true,
    },
  });

  const photoUrl = "https://i.pravatar.cc/320?img=68"
  const coverUrl = "https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=1400&q=70"

  await prisma.profile.upsert({
    where: { userId: user.id },
    update: { houseId: house.id, batchId: batch.id, photoUrl, coverUrl },
    create: {
      userId: user.id,
      houseId: house.id,
      batchId: batch.id,
      photoUrl,
      coverUrl,
      headline: "Writer · Web & SaaS Developer",
      bio: "Shubham N Datarkar, aka The Kalamwala — Writer, Web & SaaS Developer, Co-Founder of Grey Hawks Media. Blends storytelling with performance marketing; currently building the NNAWCA community.",
      city: "Nagpur",
      profession: "Web & SaaS Developer",
      company: "Grey Hawks Media",
      designation: "Co-Founder",
      higherEducation: "B.E. Computer Science",
      skills: ["Writing", "SaaS", "Performance Marketing"],
      linkedinUrl: "https://linkedin.com/in/shubham",
      socialLinks: { website: "https://greyhawksmedia.com", instagram: "https://instagram.com/thekalamwala" },
    },
  });

  console.log("Seeded demo alumni → /profile/shubham-datarkar");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
