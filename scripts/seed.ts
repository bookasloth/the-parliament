import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const school = await prisma.school.upsert({
    where: { slug: "ngp" },
    update: {},
    create: {
      name: "Jawahar Navodaya Vidyalaya, Navegaon Khairi, Nagpur",
      slug: "ngp",
    },
  });

  const interests = [
    { slug: "mentorship", name: "Mentorship" },
    { slug: "networking", name: "Networking" },
    { slug: "jobs", name: "Jobs" },
    { slug: "business", name: "Business" },
    { slug: "events", name: "Events" },
    { slug: "donations", name: "Donations" },
    { slug: "volunteering", name: "Volunteering" },
  ];

  for (const interest of interests) {
    await prisma.interest.upsert({
      where: { slug: interest.slug },
      update: {},
      create: interest,
    });
  }

  console.log("Seeded school and interests.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
