import "dotenv/config";
import fs from "node:fs";
import { PrismaClient } from "../src/generated/prisma/client";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

// Import "Pending Members" as Student-tier (free default), verification pending.
//   npx tsx scripts/import-pending-students.ts <csv>            (dry run)
//   npx tsx scripts/import-pending-students.ts <csv> --commit
const CSV_PATH = process.argv[2];
const COMMIT = process.argv.includes("--commit");
if (!CSV_PATH) { console.error("Pass the CSV path as the first argument."); process.exit(1); }

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const PAID = new Set(["associate", "premium", "life", "committee"]); // never downgrade these

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let field = "", row: string[] = [], inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false; }
      else field += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
      else if (c === "\r") { /* skip */ }
      else field += c;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}
const slug = (n: string) => n.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "member";
const clamp = (s: string | null, n: number) => (s == null ? s : s.length > n ? s.slice(0, n) : s);
function cleanPhone(raw: string): string | null {
  if (!raw) return null;
  let s = raw.replace(/^#\s*/, "").replace(/[^\d+]/g, "");
  s = s.replace(/(?!^)\+/g, ""); // strip stray + not at start (e.g. +91-+91…)
  if (!s || !/\d/.test(s)) return null;
  if (s.startsWith("+")) return s.slice(0, 20);
  if (s.length === 10) return "+91" + s;
  return ("+" + s).slice(0, 20);
}
function parseYMD(raw: string): Date | null {
  const m = (raw || "").trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!m) return null;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return isNaN(d.getTime()) ? null : d;
}
function parseDMY(raw: string): Date | null {
  const m = (raw || "").trim().match(/^(\d{1,2})-(\d{1,2})-(\d{4})/);
  if (!m) return null;
  const d = new Date(Date.UTC(+m[3], +m[2] - 1, +m[1]));
  return isNaN(d.getTime()) ? null : d;
}
function batchYears(label: string) {
  const m = (label || "").match(/Batch of\s*(\d{4})\s*-\s*(\d{4})/);
  return m ? { start: +m[1], end: +m[2] } : { start: null as number | null, end: null as number | null };
}
const splitList = (raw: string) => (raw || "").split(/[,|]/).map((s) => s.trim()).filter(Boolean).slice(0, 20);
const firstLinkedIn = (raw: string) => { const s = (raw || "").trim(); return s.includes("linkedin.com") ? s.split(/\s+/).find((p) => p.includes("linkedin.com")) ?? null : null; };

async function main() {
  const rows = parseCSV(fs.readFileSync(CSV_PATH, "utf8"));
  const header = rows[0].map((h) => h.trim());
  const c = (n: string) => header.indexOf(n);
  const idx = {
    name: c("Name"), gender: c("Gender"), dob: c("Date of Birth"), label: c("Label"),
    email: c("Primary Email"), registered: c("Registered On"), endYear: c("Course End Year"),
    mobile: c("Mobile Phone No."), current: c("Current Location"), homeTown: c("Home Town"),
    address: c("Correspondence Address"), pincode: c("Correspondence Pincode"), company: c("Company"),
    position: c("Position"), linkedin: c("LinkedIn Link"), skills: c("Professional Skills"),
    industries: c("Industries Worked In"),
  };

  const school = await prisma.school.findUnique({ where: { slug: "ngp" } });
  if (!school) throw new Error("School 'ngp' not seeded.");
  const nagpur = await prisma.division.findUnique({ where: { schoolId_name: { schoolId: school.id, name: "Nagpur" } } });

  function mapRow(r: string[]) {
    const email = (r[idx.email] || "").trim().toLowerCase();
    const name = (r[idx.name] || "").replace(/\s+/g, " ").trim();
    const g = (r[idx.gender] || "").trim().toUpperCase();
    const by = batchYears(r[idx.label] || "");
    const company = (r[idx.company] || "").trim();
    const position = (r[idx.position] || "").trim();
    return {
      email, name: clamp(name, 120)!,
      gender: g === "M" ? "male" : g === "F" ? "female" : null,
      dateOfBirth: parseYMD(r[idx.dob]),
      passOutYear: by.end ?? (parseInt(r[idx.endYear]) || null), startYear: by.start,
      createdAt: parseDMY(r[idx.registered]),
      mobile: cleanPhone(r[idx.mobile]),
      city: clamp((r[idx.current] || "").trim() || null, 120),
      homeTown: clamp((r[idx.homeTown] || "").trim() || null, 160),
      correspondenceAddress: [(r[idx.address] || "").trim(), (r[idx.pincode] || "").trim()].filter(Boolean).join(", ") || null,
      company: clamp(company || null, 160), designation: clamp(position || null, 160),
      headline: clamp(position && company ? `${position} at ${company}` : position || company || null, 200),
      linkedinUrl: firstLinkedIn(r[idx.linkedin]),
      skills: splitList(r[idx.skills]), industry: clamp((r[idx.industries] || "").trim() || null, 120),
    };
  }

  const seen = new Map<string, ReturnType<typeof mapRow>>();
  const skipped: string[] = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.every((x) => !x.trim())) continue;
    const rec = mapRow(r);
    if (!rec.email || !rec.name || !rec.email.includes("@")) { skipped.push(`row ${i + 1}: bad email/name`); continue; }
    if (seen.has(rec.email)) { skipped.push(`row ${i + 1}: duplicate ${rec.email}`); continue; }
    seen.set(rec.email, rec);
  }
  const recs = [...seen.values()];

  const existing = await prisma.user.findMany({ where: { email: { in: recs.map((r) => r.email) } }, select: { email: true, membershipStatus: true } });
  const existingMap = new Map(existing.map((u) => [u.email, u.membershipStatus]));
  const wouldSkipDowngrade = existing.filter((u) => PAID.has(u.membershipStatus)).map((u) => u.email);

  console.log(`\nParsed ${recs.length} unique pending members (${skipped.length} skipped).`);
  if (skipped.length) console.log("Skipped:\n  " + skipped.join("\n  "));
  console.log("\nSample (first 3):");
  for (const s of recs.slice(0, 3)) console.log(`  ${s.name} <${s.email}> | batch ${s.startYear}-${s.passOutYear} | ${s.gender ?? "?"} | ${s.mobile ?? "no phone"} | ${s.city ?? "?"}`);
  console.log(`\n${existing.length} already exist (${wouldSkipDowngrade.length} are paid — tier preserved, not downgraded).`);

  if (!COMMIT) { console.log("\nDRY RUN — nothing written. Add --commit to import.\n"); return; }

  const usernames = new Set((await prisma.user.findMany({ select: { username: true } })).map((u) => u.username).filter(Boolean) as string[]);
  const uniqueUsername = (base: string) => { let u = base, n = 2; while (usernames.has(u)) u = `${base}-${n++}`; usernames.add(u); return u; };

  let created = 0, updated = 0;
  for (const rec of recs) {
    const ex = await prisma.user.findUnique({ where: { email: rec.email }, select: { id: true } });
    const now = new Date();

    let batchId: string | null = null;
    if (rec.startYear && rec.passOutYear) {
      const b = await prisma.batch.upsert({
        where: { schoolId_startYear: { schoolId: school.id, startYear: rec.startYear } },
        update: {}, create: { schoolId: school.id, startYear: rec.startYear, endYear: rec.passOutYear, label: `${rec.startYear}-${rec.passOutYear}` },
      });
      batchId = b.id;
    }

    // Fields safe to refresh on both create and update (no tier/verification here).
    const common = {
      schoolId: school.id, legalName: rec.name, displayName: rec.name, memberType: "alumni",
      gender: rec.gender ?? undefined, dateOfBirth: rec.dateOfBirth ?? undefined, passOutYear: rec.passOutYear ?? undefined,
      yearsStudied: rec.startYear && rec.passOutYear ? rec.passOutYear - rec.startYear : undefined,
      mobileE164: rec.mobile ?? undefined,
    };

    const user = ex
      ? (updated++, await prisma.user.update({ where: { id: ex.id }, data: common })) // preserve existing tier/verification
      : (created++, await prisma.user.create({
          data: {
            email: rec.email, username: uniqueUsername(slug(rec.name)), createdAt: rec.createdAt ?? undefined, ...common,
            status: "active", membershipStatus: "student", benefitTier: "base",
            isVerified: false, verificationStatus: "pending",
            onboardingStep: "complete", onboardingCompleted: true, profileCompletion: 60,
          },
        }));

    await prisma.profile.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id } });
    await prisma.profile.update({
      where: { userId: user.id },
      data: {
        batchId: batchId ?? undefined, city: rec.city, homeTown: rec.homeTown, correspondenceAddress: rec.correspondenceAddress,
        company: rec.company, designation: rec.designation, profession: rec.designation, headline: rec.headline,
        linkedinUrl: rec.linkedinUrl, skills: rec.skills, industry: rec.industry, visibility: "alumni",
      },
    });

    if (nagpur) {
      await prisma.userDivision.upsert({
        where: { userId_divisionId: { userId: user.id, divisionId: nagpur.id } },
        update: {}, create: { userId: user.id, divisionId: nagpur.id, isProtected: true },
      });
    }
  }

  console.log(`\n✅ Imported: ${created} created (Student, pending), ${updated} updated (tier preserved).\n`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
