import { PrismaClient } from "../src/generated/prisma/client";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const school = await prisma.school.create({
    data: {
      name: "Jawahar Navodaya Vidyalaya, Navegaon Khairi, Nagpur",
      slug: "ngp",
    },
  });

  const division = await prisma.division.create({
    data: { name: "Nagpur", school: { connect: { id: school.id } } },
  });

  await prisma.karmaThreshold.createMany({
    data: [
      { level: 0, title: "Reader", minKarma: 0 },
      { level: 1, title: "Commenter", minKarma: 25 },
      { level: 2, title: "Poster", minKarma: 50 },
      { level: 3, title: "Poller", minKarma: 100 },
      { level: 4, title: "Group Leader", minKarma: 250 },
      { level: 5, title: "Mentor", minKarma: 500 },
    ],
  });

  console.log("Seeded school, division, and karma thresholds.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
