import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const schools = await prisma.school.count();
  const games = await prisma.game.findMany({ where: { key: "alfazy" }, select: { id: true, schoolId: true } });
  const words = await prisma.alfazyWord.count({ where: { isActive: true } });
  const eligiblePlayers = await prisma.user.count({ where: { status: "active", profile: { isNot: null } } });
  console.log({ schools, alfazyGames: games.length, words, eligiblePlayers });
  console.log("game rows:", games);
}
main().then(() => prisma.$disconnect()).catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
