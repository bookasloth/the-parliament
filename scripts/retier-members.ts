import "dotenv/config";
import fs from "node:fs";
import { PrismaClient } from "../src/generated/prisma/client";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

// Re-tier the full member list: everyone -> Student, except two emails -> Premium.
// Life members are NEVER downgraded (kept as life). Deceased/test rows skipped.
//   npx tsx scripts/retier-members.ts <csv>            (dry run)
//   npx tsx scripts/retier-members.ts <csv> --commit
const CSV_PATH = process.argv[2];
const COMMIT = process.argv.includes("--commit");
if (!CSV_PATH) { console.error("Pass the CSV path as the first argument."); process.exit(1); }

const PREMIUM_EMAILS = new Set(["djlaxne@gmail.com", "sndatarkar@gmail.com"]);
const JUNK_DOMAINS = ["enhancedzoom.com", "fesgrid.com"];
const PREMIUM_PRICE_PAISE = 99900;

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let field = "", row: string[] = [], inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) { if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false; } else field += c; }
    else { if (c === '"') inQ = true; else if (c === ",") { row.push(field); field = ""; } else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; } else if (c === "\r") {} else field += c; }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}
const slug = (n: string) => n.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "member";
const clamp = (s: string | null, n: number) => (s == null ? s : s.length > n ? s.slice(0, n) : s);
function parseDate(raw: string): Date | null {
  const m = (raw || "").trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!m) return null;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return isNaN(d.getTime()) ? null : d;
}
function batchYears(label: string) {
  const m = (label || "").match(/Batch of\s*(\d{4})\s*-\s*(\d{4})/);
  return m ? { start: +m[1], end: +m[2] } : { start: null as number | null, end: null as number | null };
}

async function main() {
  const rows = parseCSV(fs.readFileSync(CSV_PATH, "utf8"));
  const header = rows[0].map((h) => h.trim());
  const c = (n: string) => header.indexOf(n);
  const idx = { name: c("Name"), gender: c("Gender"), dob: c("Date of Birth"), label: c("Label"), email: c("email_id"), registered: c("Registered"), registeredOn: c("Registered On"), approvedOn: c("Approved On") };

  const school = await prisma.school.findUnique({ where: { slug: "ngp" } });
  if (!school) throw new Error("School 'ngp' not seeded.");
  const nagpur = await prisma.division.findUnique({ where: { schoolId_name: { schoolId: school.id, name: "Nagpur" } } });

  function mapRow(r: string[]) {
    const email = (r[idx.email] || "").trim().toLowerCase();
    const name = (r[idx.name] || "").replace(/\s+/g, " ").trim();
    const g = (r[idx.gender] || "").trim().toUpperCase();
    const by = batchYears(r[idx.label] || "");
    return {
      email, name: clamp(name, 120)!, registered: (r[idx.registered] || "").trim(),
      gender: g === "M" ? "male" : g === "F" ? "female" : null,
      dateOfBirth: parseDate(r[idx.dob]), passOutYear: by.end, startYear: by.start,
      createdAt: parseDate(r[idx.registeredOn]), approvedAt: parseDate(r[idx.approvedOn]),
    };
  }

  const seen = new Map<string, ReturnType<typeof mapRow>>();
  const skipped: string[] = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.every((x) => !x.trim())) continue;
    const rec = mapRow(r);
    if (!rec.email || !rec.name || !rec.email.includes("@")) { skipped.push(`row ${i + 1}: bad email/name`); continue; }
    if (rec.registered.toLowerCase() === "deceased" || JUNK_DOMAINS.some((d) => rec.email.endsWith(d))) { skipped.push(`row ${i + 1}: deceased/test (${rec.email})`); continue; }
    if (seen.has(rec.email)) { skipped.push(`row ${i + 1}: duplicate ${rec.email}`); continue; }
    seen.set(rec.email, rec);
  }
  const recs = [...seen.values()];

  const existing = await prisma.user.findMany({ where: { email: { in: recs.map((r) => r.email) } }, select: { email: true, membershipStatus: true } });
  const statusByEmail = new Map(existing.map((u) => [u.email, u.membershipStatus]));

  // Decide target tier per person.
  let toPremium = 0, toStudent = 0, keepLife = 0, creates = 0;
  for (const rec of recs) {
    const cur = statusByEmail.get(rec.email);
    const isNew = cur === undefined;
    if (isNew) creates++;
    if (PREMIUM_EMAILS.has(rec.email)) toPremium++;
    else if (cur === "life") keepLife++;
    else toStudent++;
  }

  console.log(`\nParsed ${recs.length} members (${skipped.length} skipped: deceased/test/dupes).`);
  console.log(`Plan: ${toPremium} -> Premium, ${keepLife} life kept (not downgraded), ${toStudent} -> Student.`);
  console.log(`(${creates} are new accounts, ${recs.length - creates} already exist.)`);
  if (skipped.length) console.log("\nSkipped:\n  " + skipped.join("\n  "));

  if (!COMMIT) { console.log("\nDRY RUN — nothing written. Add --commit to apply.\n"); return; }

  const usernames = new Set((await prisma.user.findMany({ select: { username: true } })).map((u) => u.username).filter(Boolean) as string[]);
  const uniqueUsername = (base: string) => { let u = base, n = 2; while (usernames.has(u)) u = `${base}-${n++}`; usernames.add(u); return u; };

  let created = 0, updated = 0, premiumSet = 0, lifeKept = 0;
  for (const rec of recs) {
    const cur = statusByEmail.get(rec.email);
    const isPremium = PREMIUM_EMAILS.has(rec.email);
    const keepAsLife = cur === "life" && !isPremium;
    const targetStatus = isPremium ? "premium" : keepAsLife ? "life" : "student";
    const targetBenefit = targetStatus === "premium" || targetStatus === "life" ? "premium" : "base";
    const now = new Date();

    let batchId: string | null = null;
    if (rec.startYear && rec.passOutYear) {
      const b = await prisma.batch.upsert({ where: { schoolId_startYear: { schoolId: school.id, startYear: rec.startYear } }, update: {}, create: { schoolId: school.id, startYear: rec.startYear, endYear: rec.passOutYear, label: `${rec.startYear}-${rec.passOutYear}` } });
      batchId = b.id;
    }

    const identity = {
      schoolId: school.id, legalName: rec.name, displayName: rec.name, memberType: "alumni",
      gender: rec.gender ?? undefined, dateOfBirth: rec.dateOfBirth ?? undefined, passOutYear: rec.passOutYear ?? undefined,
      yearsStudied: rec.startYear && rec.passOutYear ? rec.passOutYear - rec.startYear : undefined,
    };

    let userId: string;
    const ex = await prisma.user.findUnique({ where: { email: rec.email }, select: { id: true } });
    if (ex) {
      updated++;
      userId = ex.id;
      await prisma.user.update({ where: { id: ex.id }, data: { ...identity, membershipStatus: targetStatus, benefitTier: targetBenefit } });
    } else {
      created++;
      const approved = !!rec.approvedAt;
      const u = await prisma.user.create({
        data: {
          email: rec.email, username: uniqueUsername(slug(rec.name)), createdAt: rec.createdAt ?? undefined, ...identity,
          status: "active", membershipStatus: targetStatus, benefitTier: targetBenefit,
          isVerified: approved, verificationStatus: approved ? "approved" : "pending", verifiedAt: rec.approvedAt ?? undefined,
          onboardingStep: "complete", onboardingCompleted: true, profileCompletion: 50,
        },
      });
      userId = u.id;
    }

    // Membership rows: leave life untouched; (re)build the active row for premium; clear stray rows for students.
    if (isPremium) {
      premiumSet++;
      await prisma.membership.updateMany({ where: { userId, status: "active" }, data: { status: "superseded" } });
      const endsAt = new Date(now); endsAt.setDate(endsAt.getDate() + 365);
      await prisma.membership.create({ data: { userId, planCode: "premium", benefitTier: "premium", status: "active", startedAt: now, endsAt, amountPaise: PREMIUM_PRICE_PAISE, source: "admin_grant" } });
    } else if (keepAsLife) {
      lifeKept++; // no row changes
    } else {
      await prisma.membership.updateMany({ where: { userId, status: "active" }, data: { status: "superseded" } });
    }

    await prisma.profile.upsert({ where: { userId }, update: {}, create: { userId } });
    if (batchId) await prisma.profile.update({ where: { userId }, data: { batchId } });
    if (nagpur) await prisma.userDivision.upsert({ where: { userId_divisionId: { userId, divisionId: nagpur.id } }, update: {}, create: { userId, divisionId: nagpur.id, isProtected: true } });
  }

  console.log(`\n✅ Done: ${created} created, ${updated} updated. Premium set: ${premiumSet}, life kept: ${lifeKept}.\n`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
